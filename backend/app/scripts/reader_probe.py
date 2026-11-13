#!/usr/bin/env python
"""Probe a reader from an existing backend container without saving changes."""

import argparse
from collections import Counter
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from copy import deepcopy
from datetime import date, timedelta
import json
import logging
import os
import re
import sys
import threading
import time


class ProbeError(Exception):
    pass


def reader_hostname(value):
    hostname = value.rstrip(".").lower()
    if (
        len(hostname) > 253
        or not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", hostname)
        or any(not label or len(label) > 63 for label in hostname.split("."))
        or ".cluster-" in hostname
        or ".proxy-" in hostname
    ):
        raise argparse.ArgumentTypeError(
            "Use a specific reader instance hostname, not a URL or cluster endpoint"
        )
    return hostname


def positive_int(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("Must be positive")
    return number


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--warehouse-id", required=True, type=positive_int)
    parser.add_argument("--reader-host", required=True, type=reader_hostname)
    parser.add_argument("--report-id", required=True, nargs="+", type=positive_int)
    parser.add_argument("--date", required=True, type=date.fromisoformat)
    parser.add_argument("--date-field", default="date")
    parser.add_argument(
        "--timeout",
        type=positive_int,
        default=15,
        help="Per-query timeout in seconds (maximum 120)",
    )
    parser.add_argument(
        "--compare-writer",
        action="store_true",
        help="Also execute each report on the current datasource and compare results",
    )
    parser.add_argument(
        "--test-cancel",
        action="store_true",
        help="Cancel only a probe-owned reader SELECT SLEEP query",
    )
    args = parser.parse_args(argv)
    if args.timeout > 120:
        parser.error("--timeout must be at most 120 seconds")
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", args.date_field):
        parser.error("--date-field must be a dimension name")
    if args.date == date.max:
        parser.error("--date must allow calculation of the following day")
    return args


def connection_url(connect, datasource_name, populate_url_context, make_url):
    if isinstance(connect, dict):
        if connect.get("func") != "zillion.datasource.url_connect":
            raise ProbeError(
                "Custom datasource connectors are not supported by this probe"
            )
        params = connect.get("params", {})
        if set(params) != {"connect_url"}:
            raise ProbeError("Only direct database URL connectors are supported")
        connect = params["connect_url"]
    if not isinstance(connect, str):
        raise ProbeError("Every datasource must have a direct MySQL connection URL")
    url = make_url(populate_url_context(connect, datasource_name))
    if url.drivername != "mysql+pymysql" or not url.host:
        raise ProbeError("This probe supports only MySQL datasources using PyMySQL")
    return url


def reader_config(config, reader_host, populate_url_context, make_url):
    config = deepcopy(config)
    config.pop("includes", None)
    datasources = config.get("datasources", {})
    if len(datasources) != 1:
        raise ProbeError(
            "This probe requires exactly one datasource to avoid leaving queries on the writer"
        )
    for datasource_name, datasource in datasources.items():
        if not isinstance(datasource, dict):
            raise ProbeError("Datasource references must be resolved before probing")
        for table in datasource.get("tables", {}).values():
            if not isinstance(table, dict) or table.get("data_url"):
                raise ProbeError("Datasource table imports are not allowed")
        url = connection_url(
            datasource.get("connect"), datasource_name, populate_url_context, make_url
        )
        if url.host.lower() == reader_host:
            raise ProbeError(
                "Reader hostname is already the configured datasource hostname"
            )
        datasource["connect"] = url.set(host=reader_host).render_as_string(
            hide_password=False
        )
    return config


def bounded_report(params, probe_date, date_field):
    if isinstance(params, dict) and "kwargs" in params:
        params = params["kwargs"]
    if not isinstance(params, dict) or params.get("adhoc_datasources"):
        raise ProbeError("Saved reports with ad hoc datasources are not supported")
    allowed = {
        "metrics",
        "dimensions",
        "criteria",
        "row_filters",
        "rollup",
        "pivot",
        "order_by",
        "disabled_tables",
        "limit",
        "limit_first",
        "allow_partial",
    }
    if set(params) - allowed:
        raise ProbeError("Saved report contains unsupported parameters")
    result = deepcopy(params)
    criteria = []
    for criterion in result.get("criteria") or []:
        if (
            not isinstance(criterion, (list, tuple))
            or len(criterion) != 3
            or not isinstance(criterion[0], str)
            or not isinstance(criterion[1], str)
            or criterion[1].lower() in ("in report", "not in report")
        ):
            raise ProbeError(
                "Only explicit field/operator/value report criteria are supported"
            )
        if criterion[0] != date_field:
            criteria.append(criterion)
    criteria.extend(
        [
            [date_field, ">=", probe_date.isoformat()],
            [date_field, "<", (probe_date + timedelta(days=1)).isoformat()],
        ]
    )
    result["criteria"] = criteria
    result["allow_partial"] = False
    result["limit"] = None
    result["limit_first"] = False
    return result


@contextmanager
def quiet_dependencies():
    with open(os.devnull, "w") as sink, redirect_stdout(sink), redirect_stderr(sink):
        yield


def install_mysql_guards(sa, allowed_hosts, timeout, engines):
    @sa.event.listens_for(sa.engine.Engine, "do_connect")
    def bound_connection(
        dialect, connection_record, connection_args, connection_params
    ):
        if dialect.name == "sqlite":
            if connection_args != [":memory:"]:
                raise ProbeError("Only in-memory SQLite metadata is allowed")
            return
        if (
            dialect.name != "mysql"
            or dialect.driver != "pymysql"
            or connection_params.get("host", "").lower() not in allowed_hosts
            or connection_params.get("init_command")
        ):
            raise ProbeError("An unexpected database connection was blocked")
        connection_params.update(
            connect_timeout=min(timeout, 10),
            read_timeout=timeout + 5,
            write_timeout=timeout + 5,
        )

    @sa.event.listens_for(sa.engine.Engine, "engine_connect")
    def configure_session(connection, branch):
        engines.add(connection.engine)
        if branch or connection.dialect.name != "mysql":
            return
        cursor = connection.connection.cursor()
        try:
            cursor.execute("SET SESSION TRANSACTION READ ONLY")
            cursor.execute("SET SESSION MAX_EXECUTION_TIME = %s" % (timeout * 1000))
        finally:
            cursor.close()

    @sa.event.listens_for(sa.engine.Engine, "before_cursor_execute")
    def block_writes(connection, cursor, statement, parameters, context, executemany):
        if connection.dialect.name != "mysql":
            return
        statement = re.sub(
            r"\A(?:\s|/\*.*?\*/|--[ \t][^\r\n]*)*",
            "",
            statement,
            flags=re.DOTALL,
        )
        if not re.match(
            r"(?:SELECT|SHOW|DESCRIBE|EXPLAIN|KILL)\b", statement, re.IGNORECASE
        ):
            raise ProbeError("A non-read query was blocked")


def read_metadata(sa, engine, args):
    with engine.connect() as connection:
        warehouse = (
            connection.execute(
                sa.text("SELECT params, meta FROM warehouses WHERE id = :warehouse_id"),
                {"warehouse_id": args.warehouse_id},
            )
            .mappings()
            .first()
        )
        if not warehouse:
            raise ProbeError("Warehouse ID was not found")
        meta = json.loads(warehouse["meta"]) if warehouse["meta"] else None
        if meta and meta.get("disabled") is True:
            raise ProbeError("Warehouse is disabled")
        params = json.loads(warehouse["params"])
        if (
            not isinstance(params, dict)
            or "config" not in params
            or set(params) - {"config", "ds_priority", "nlp"}
        ):
            raise ProbeError("Unsupported saved warehouse parameters")
        reports = []
        for report_id in dict.fromkeys(args.report_id):
            report = (
                connection.execute(
                    sa.text(
                        "SELECT params FROM report_specs WHERE id = :report_id AND warehouse_id = :warehouse_id"
                    ),
                    {"report_id": report_id, "warehouse_id": args.warehouse_id},
                )
                .mappings()
                .first()
            )
            if not report:
                raise ProbeError("A report ID was not found in the selected warehouse")
            reports.append(
                (
                    report_id,
                    bounded_report(
                        json.loads(report["params"]), args.date, args.date_field
                    ),
                )
            )
    return params, reports


def identity(connection, sa):
    return (
        connection.execute(
            sa.text(
                "SELECT @@hostname AS server_hostname, @@global.innodb_read_only AS read_only, CONNECTION_ID() AS connection_id"
            )
        )
        .mappings()
        .one()
    )


def check_reader(engine, sa, expected_hostname=None):
    with engine.connect() as connection:
        info = identity(connection, sa)
    if int(info["read_only"]) != 1:
        raise ProbeError("Target instance is not read-only; refusing to run reports")
    if expected_hostname and info["server_hostname"] != expected_hostname:
        raise ProbeError("Target instance identity changed during the probe")
    return info["server_hostname"]


def cancel_probe_query(engine, sa, timeout):
    ready = threading.Event()
    finished = threading.Event()
    release = threading.Event()
    state = {}

    def run_query():
        try:
            with engine.connect() as connection:
                state["identity"] = identity(connection, sa)
                ready.set()
                try:
                    connection.exec_driver_sql(
                        "SELECT SLEEP(%s)" % (timeout + 5)
                    ).fetchall()
                except Exception as error:
                    error_args = getattr(getattr(error, "orig", None), "args", ())
                    state["error_code"] = error_args[0] if error_args else None
                finally:
                    finished.set()
                    release.wait()
                    connection.invalidate()
        finally:
            ready.set()

    worker = threading.Thread(target=run_query, daemon=True)
    worker.start()
    try:
        if not ready.wait(timeout + 10) or "identity" not in state:
            raise ProbeError("Could not open the probe-owned cancellation connection")
        with engine.connect() as control:
            victim = state["identity"]
            controller = identity(control, sa)
            if (
                victim["server_hostname"] != controller["server_hostname"]
                or int(victim["read_only"]) != 1
                or int(controller["read_only"]) != 1
            ):
                raise ProbeError(
                    "Cancellation connections did not reach the same reader"
                )
            deadline = time.monotonic() + min(timeout, 5)
            while not finished.is_set() and time.monotonic() < deadline:
                command = control.execute(
                    sa.text(
                        "SELECT COMMAND FROM information_schema.PROCESSLIST WHERE ID = :connection_id"
                    ),
                    {"connection_id": victim["connection_id"]},
                ).scalar()
                if command == "Query":
                    control.exec_driver_sql("KILL %d" % int(victim["connection_id"]))
                    break
                finished.wait(0.05)
            else:
                raise ProbeError(
                    "Did not observe the probe-owned cancellation query running"
                )
        if not finished.wait(timeout + 10) or state.get("error_code") not in {
            1317,
            2006,
            2013,
        }:
            raise ProbeError(
                "Probe-owned query did not report an expected interruption"
            )
    finally:
        release.set()
        worker.join(timeout + 10)
    if worker.is_alive():
        raise ProbeError("Cancellation worker did not finish")


def comparable_result(result):
    frame = result.df.reset_index(drop=not bool(result.dimensions))
    frame = frame.reindex(sorted(frame.columns, key=str), axis=1)
    data = json.loads(
        frame.to_json(orient="split", date_format="iso", double_precision=15)
    )
    return data["columns"], Counter(
        json.dumps(row, sort_keys=True) for row in data["data"]
    )


def run_probe(args, engines):
    print("CHECK metadata (SELECT only)", flush=True)
    with quiet_dependencies():
        import sqlalchemy as sa
        from sqlalchemy.engine import make_url

        if "zillion" in sys.modules:
            raise ProbeError("Run this script in a fresh Python process")
        metadata_uri = os.environ.get("SQLALCHEMY_DATABASE_URI")
        if not metadata_uri:
            raise ProbeError("The container must provide SQLALCHEMY_DATABASE_URI")
        metadata_url = make_url(metadata_uri)
        if metadata_url.drivername != "mysql+pymysql" or not metadata_url.host:
            raise ProbeError("This probe requires MySQL/PyMySQL application metadata")
        allowed_hosts = {metadata_url.host.lower(), args.reader_host}
        install_mysql_guards(sa, allowed_hosts, args.timeout, engines)
        metadata_engine = sa.create_engine(
            metadata_url, poolclass=sa.pool.NullPool, hide_parameters=True
        )
        engines.add(metadata_engine)
        warehouse_params, reports = read_metadata(sa, metadata_engine, args)
    print(
        "PASS metadata: %d report specification(s) read; no saved changes"
        % len(reports),
        flush=True,
    )

    print("CHECK isolated Zillion configuration and reader identity", flush=True)
    with quiet_dependencies():
        os.environ["ZILLION_DB_URL"] = "sqlite:///:memory:"
        os.environ["ZILLION_DEBUG"] = "false"
        os.environ["ZILLION_LOG_LEVEL"] = "CRITICAL"
        from zillion import Warehouse
        from zillion.configs import load_warehouse_config
        from zillion.core import DataSourceQueryModes, zillion_config
        from zillion.datasource import populate_url_context

        if zillion_config["DB_URL"] != "sqlite:///:memory:":
            raise ProbeError("Zillion metadata isolation failed")
        zillion_config.update(
            DEBUG=False,
            LOG_LEVEL="CRITICAL",
            DATASOURCE_QUERY_MODE=DataSourceQueryModes.SEQUENTIAL,
            DATASOURCE_QUERY_TIMEOUT=None,
        )
        original = load_warehouse_config(warehouse_params["config"])
        modified = reader_config(
            original, args.reader_host, populate_url_context, make_url
        )
        datasource_name = next(iter(modified["datasources"]))
        target_url = modified["datasources"][datasource_name]["connect"]
        reader_engine = sa.create_engine(
            target_url, poolclass=sa.pool.NullPool, hide_parameters=True
        )
        engines.add(reader_engine)
        reader_server_hostname = check_reader(reader_engine, sa)
    print(
        "PASS reader: server_hostname=%s read_only=1" % reader_server_hostname,
        flush=True,
    )

    print("CHECK reader warehouse initialization", flush=True)
    with quiet_dependencies():
        reader = Warehouse(
            config=modified, ds_priority=warehouse_params.get("ds_priority")
        )
        actual_engine = reader.get_datasource(datasource_name).metadata.bind
        check_reader(actual_engine, sa, reader_server_hostname)
        if actual_engine.url.host.lower() != args.reader_host:
            raise ProbeError("Warehouse did not retain the reader hostname override")
    print("PASS warehouse initialized; datasource reads target the reader", flush=True)

    writer = None
    if args.compare_writer:
        print("CHECK writer warehouse initialization", flush=True)
        with quiet_dependencies():
            original.pop("includes", None)
            source = original["datasources"][datasource_name]
            source_url = connection_url(
                source.get("connect"), datasource_name, populate_url_context, make_url
            )
            allowed_hosts.add(source_url.host.lower())
            source["connect"] = source_url.render_as_string(hide_password=False)
            writer = Warehouse(
                config=original, ds_priority=warehouse_params.get("ds_priority")
            )
            writer_engine = writer.get_datasource(datasource_name).metadata.bind
            with writer_engine.connect() as connection:
                writer_info = identity(connection, sa)
                if (
                    int(writer_info["read_only"]) != 0
                    or writer_info["server_hostname"] == reader_server_hostname
                ):
                    raise ProbeError(
                        "Comparison source is not a distinct writer "
                        "(configured_host=%s, actual_host=%s, "
                        "innodb_read_only=%s, same_reader_instance=%s)"
                        % (
                            source_url.host,
                            writer_engine.url.host,
                            writer_info["read_only"],
                            writer_info["server_hostname"] == reader_server_hostname,
                        )
                    )
        print(
            "PASS writer: server_hostname=%s read_only=0"
            % writer_info["server_hostname"],
            flush=True,
        )

    for report_id, params in reports:
        print(
            "CHECK report %d (%s; per-SELECT timeout %ds)"
            % (report_id, args.date.isoformat(), args.timeout),
            flush=True,
        )
        started = time.monotonic()
        with quiet_dependencies():
            check_reader(actual_engine, sa, reader_server_hostname)
            result = reader.execute(**deepcopy(params))
            if result.is_partial or not result.query_summaries or result.rowcount == 0:
                raise ProbeError(
                    "Report was partial, empty, or ran no datasource queries; choose another report/date"
                )
        print(
            "PASS reader report %d: rows=%d queries=%d seconds=%.3f"
            % (
                report_id,
                result.rowcount,
                len(result.query_summaries),
                time.monotonic() - started,
            ),
            flush=True,
        )
        if writer is not None:
            print("CHECK writer comparison for report %d" % report_id, flush=True)
            started = time.monotonic()
            with quiet_dependencies():
                baseline = writer.execute(**deepcopy(params))
                if baseline.is_partial or comparable_result(
                    baseline
                ) != comparable_result(result):
                    raise ProbeError(
                        "Writer/reader results differ; check replication lag or live data changes"
                    )
            print(
                "PASS comparison: matching rows, ignoring row order; writer seconds=%.3f"
                % (time.monotonic() - started),
                flush=True,
            )

    if args.test_cancel:
        print(
            "CHECK cancellation (only a probe-owned SELECT SLEEP connection)",
            flush=True,
        )
        with quiet_dependencies():
            cancel_probe_query(reader_engine, sa, args.timeout)
        print(
            "PASS probe-owned query interrupted using a second connection to the same reader",
            flush=True,
        )


def main(argv=None):
    args = parse_args(argv)
    logging.disable(logging.CRITICAL)
    engines = set()
    try:
        run_probe(args, engines)
    except ProbeError as error:
        print("FAIL: %s" % error, flush=True)
        return 1
    except Exception as error:
        code = getattr(getattr(error, "orig", None), "args", ())
        suffix = (
            " (database code %s)" % code[0] if code and isinstance(code[0], int) else ""
        )
        sqlalchemy = sys.modules.get("sqlalchemy")
        if sqlalchemy is not None and isinstance(
            error, sqlalchemy.exc.NoSuchTableError
        ):
            table_name = error.args[0] if error.args else None
            if isinstance(table_name, str) and re.fullmatch(
                r"[A-Za-z_][A-Za-z0-9_$.]{0,255}", table_name
            ):
                suffix = " (table %s)" % table_name
        print(
            "FAIL: %s%s; details suppressed to avoid exposing credentials or report data"
            % (type(error).__name__, suffix),
            flush=True,
        )
        return 1
    finally:
        with quiet_dependencies():
            for engine in engines:
                engine.dispose()
    print("PASS probe complete; production configuration unchanged", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
