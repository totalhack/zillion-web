import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, Response
from marshmallow.exceptions import ValidationError
import numpy as np
from tlbx import st, pp, get_string_format_args, json
from zillion.core import InvalidFieldException, ZillionException
from zillion.model import zillion_engine, ReportSpecs
from zillion.report import Report, ROLLUP_INDEX_DISPLAY_LABEL

from app import crud, models
from app.schemas.warehouse import *
from app.api import deps

router = APIRouter()


class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(JSONEncoder, self).default(obj)


def process_report_result(result, display_names=True):
    if display_names:
        df = result.df_display
    else:
        df = result.df

    if result.dimensions:
        df = df.reset_index()

    data = df.to_dict(orient="split")
    del data["index"]
    data["rollup_marker"] = ROLLUP_INDEX_DISPLAY_LABEL
    data["display_name_map"] = result.display_name_map
    data["query_summaries"] = [q.format() for q in result.query_summaries]
    data["duration"] = result.duration
    data["is_partial"] = result.is_partial
    data["unsupported_grain_metrics"] = result.unsupported_grain_metrics
    return data


# TODO move these utils


def replace_display_names(warehouse, formula, display_map=None):
    format_args = get_string_format_args(formula)
    if not display_map:
        # TODO: this isn't very efficient
        fields = warehouse.get_fields()
        display_map = {f.display_name: f.name for f in fields.values()}
    for arg in format_args:
        if arg in display_map:
            formula = formula.replace("{%s}" % arg, "{%s}" % display_map[arg])
    return formula


def replace_report_formula_display_names(warehouse, request):
    if not "metrics" in request:
        return request
    display_map = None
    for metric in request["metrics"] or []:
        if isinstance(metric, dict) and "formula" in metric:
            if not display_map:
                fields = warehouse.get_fields()
                display_map = {f.display_name: f.name for f in fields.values()}
            metric["formula"] = replace_display_names(
                warehouse, metric["formula"], display_map=display_map
            )


# NOTE: this needs to stay in sync with the UI criteria options


def get_today():
    return str(datetime.date.today())


def get_yesterday():
    return str(datetime.date.today() - datetime.timedelta(days=1))


def get_start_of_week():
    today = datetime.date.today()
    return str(today - datetime.timedelta(days=today.weekday()))


def get_start_of_month():
    return str(datetime.date.today().replace(day=1))


def get_start_of_last_month():
    som = datetime.date.today().replace(day=1)
    solm = (som - datetime.timedelta(days=1)).replace(day=1)
    return str(solm)


def get_end_of_last_month():
    som = datetime.date.today().replace(day=1)
    eolm = som - datetime.timedelta(days=1)
    return str(eolm)


def get_start_of_year():
    return str(datetime.date.today().replace(month=1, day=1))


def get_n_days_ago(n):
    return str(datetime.date.today() - datetime.timedelta(days=n))


NON_RANGE_DATE_SHORTCUTS = {
    "today": get_today(),
    "yesterday": get_yesterday(),
    "startofweek": get_start_of_week(),
    "startofmonth": get_start_of_month(),
    "startoflastmonth": get_start_of_last_month(),
    "startofyear": get_start_of_year(),
}

RANGE_DATE_SHORTCUTS = {
    "today": [get_today(), get_today()],
    "yesterday": [get_yesterday(), get_yesterday()],
    "last7days": [get_n_days_ago(7), get_n_days_ago(1)],
    "last30days": [get_n_days_ago(30), get_n_days_ago(1)],
    "thisweek": [get_start_of_week(), get_today()],
    "thismonth": [get_start_of_month(), get_today()],
    "lastmonth": [get_start_of_last_month(), get_end_of_last_month()],
    "thisyear": [get_start_of_year(), get_today()],
}

DATE_SHORTCUT_VALUES = {
    "=": NON_RANGE_DATE_SHORTCUTS,
    "!=": NON_RANGE_DATE_SHORTCUTS,
    ">": NON_RANGE_DATE_SHORTCUTS,
    "<": NON_RANGE_DATE_SHORTCUTS,
    ">=": NON_RANGE_DATE_SHORTCUTS,
    "<=": NON_RANGE_DATE_SHORTCUTS,
    "between": RANGE_DATE_SHORTCUTS,
    "not between": RANGE_DATE_SHORTCUTS,
}

SHORTCUT_VALUES = dict(date=DATE_SHORTCUT_VALUES, datetime=DATE_SHORTCUT_VALUES)


def clean_shortcut(val):
    return str(val).lower().replace(" ", "")


def handle_shortcut_criteria(warehouse, request):
    """HACK: perhaps this should be passed through and handled in Zillion"""
    if not request.get("criteria", None):
        return

    has_shortcuts = False
    fields = warehouse.get_fields()
    ui_criteria = []
    final_criteria = []
    for field_name, op, value in request["criteria"]:
        ui_criteria.append(
            [field_name, op, value.copy() if hasattr(value, "copy") else value]
        )
        field = fields[field_name]
        field_type = field.type.lower()
        if field_type not in SHORTCUT_VALUES:
            final_criteria.append([field_name, op, value])
            continue

        shortcut_val = clean_shortcut(value)
        if shortcut_val not in SHORTCUT_VALUES[field_type].get(op, {}):
            final_criteria.append([field_name, op, value])
            continue

        has_shortcuts = True
        value = SHORTCUT_VALUES[field_type][op][shortcut_val]
        final_criteria.append([field_name, op, value])

    if has_shortcuts and "meta" in request:
        # Denotes that we had special criteria for the UI. Saved on the report
        # so we can take appropriate action on load.
        request["meta"]["ui_criteria"] = ui_criteria
    request["criteria"] = final_criteria


@router.get("/", response_model=Dict[str, Any])
def warehouses(
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Dict[str, Any]:
    """Retrieve warehouses"""
    if crud.user.is_active(current_user):
        result = {}
        for wh_id, wh in whs.items():
            result[wh_id] = dict(id=wh_id, name=wh.name)
        return result
    return {}


@router.get("/{warehouse_id}/structure", response_model=Dict[str, Any])
def structure(
    warehouse_id: int,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve warehouse structure"""
    if not whs:
        raise Exception("No warehouses have been loaded")

    if crud.user.is_active(current_user):
        wh = whs[warehouse_id]

        wh_result = {
            "metrics": wh.get_direct_metric_configs(),
            "dimensions": wh.get_direct_dimension_configs(),
        }

        datasources = []
        for ds in wh.datasources:
            ds_json = {
                "name": ds.name,
                "metrics": ds.get_direct_metric_configs(),
                "dimensions": ds.get_direct_dimension_configs(),
            }
            datasources.append(ds_json)

        wh_result["datasources"] = datasources
        return dict(id=warehouse_id, warehouse=wh_result)
    return {}


@router.post("/{warehouse_id}/check_formula", response_model=Dict[str, Any])
def check_formula(
    warehouse_id: int,
    request: CheckFormulaRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Check an AdHocMetric formula"""
    if not whs:
        raise Exception("No warehouses have been loaded")
    if crud.user.is_active(current_user):
        request = dict(request)
        wh = whs[warehouse_id]
        request["formula"] = replace_display_names(wh, request["formula"])
        pp(request)

        if request.get("display_name", None):
            all_fields = wh.get_fields()
            for field in all_fields.values():
                if field.display_name == request["display_name"]:
                    return {
                        "success": False,
                        "reason": f"Display name '{request['display_name']}' is used by another field",
                    }

        try:
            wh.get_metric(request)
        except InvalidFieldException as e:
            return {"success": False, "reason": str(e)}
        except ValidationError as e:
            return {"success": False, "reason": str(e)}
        except ZillionException as e:
            return {"success": False, "reason": str(e)}
        return {"success": True, "reason": None}
    return {}


@router.post("/{warehouse_id}/execute")
def execute(
    warehouse_id: int,
    request: ReportRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Execute a report"""
    if not whs:
        raise Exception("No warehouses have been loaded")
    if crud.user.is_active(current_user):
        request = dict(request)
        pp(request)
        wh = whs[warehouse_id]
        replace_report_formula_display_names(wh, request)
        handle_shortcut_criteria(wh, request)
        display_names = request.get("display_names", False)
        del request["display_names"]
        result = wh.execute(allow_partial=True, **request)
        data = process_report_result(result, display_names=display_names)
        # Need to use a custom json response to handle numpy dtypes
        json_str = json.dumps(data, ignore_nan=True, cls=JSONEncoder)
        return Response(media_type="application/json", content=json_str)

    return {}


@router.post("/{warehouse_id}/execute_id")
def execute_id(
    warehouse_id: int,
    request: ReportIDRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Execute a report by ID"""
    if not whs:
        raise Exception("No warehouses have been loaded")
    if crud.user.is_active(current_user):
        wh = whs[warehouse_id]
        # HACK to handle saved shortcut criteria
        report = wh.load_report(request.spec_id)
        params = report.get_params()["kwargs"]
        params["meta"] = report.meta
        handle_shortcut_criteria(wh, params)
        if "meta" in params:
            # HACK
            del params["meta"]
        result = wh.execute(**params)

        data = process_report_result(result, display_names=request.display_names)
        # Need to use a custom json response to handle numpy dtypes
        json_str = json.dumps(data, ignore_nan=True, cls=JSONEncoder)
        return Response(media_type="application/json", content=json_str)

    return {}


def update_report(warehouse, report_id, meta=None, **kwargs):
    # Workaround until wh.update_report() is added
    report = Report(warehouse, **kwargs)
    conn = zillion_engine.connect()
    try:
        conn.execute(
            ReportSpecs.update().where(ReportSpecs.columns.id == report_id),
            warehouse_id=warehouse.id,
            params=report.get_json(),
            meta=json.dumps(meta),
        )
    finally:
        conn.close()
    report.spec_id = report_id
    report.meta = meta
    return report


@router.post("/{warehouse_id}/save", response_model=ReportSaveResponse)
def save(
    warehouse_id: int,
    request: ReportSaveRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Save a report"""
    if not whs:
        raise Exception("No warehouses have been loaded")
    if crud.user.is_active(current_user):
        wh = whs[warehouse_id]
        request = dict(request)
        replace_report_formula_display_names(wh, request)
        handle_shortcut_criteria(wh, request)
        pp(request)

        report_id = None
        if "report_id" in request:
            report_id = request["report_id"]
            del request["report_id"]

        if report_id:
            report = update_report(wh, report_id, **request)
        else:
            report = wh.save_report(**request)
        return {"spec_id": report.spec_id}
    return {}


@router.get("/{warehouse_id}/load", response_model=ReportSaveRequest)
def load(
    warehouse_id: int,
    spec_id: int,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Load a report"""
    if not whs:
        raise Exception("No warehouses have been loaded")
    if crud.user.is_active(current_user):
        wh = whs[warehouse_id]
        report = wh.load_report(spec_id)
        # TODO: this is a bit hacky
        params = report.get_params()["kwargs"]
        params["meta"] = report.meta
        if report.meta.get("ui_criteria", None):
            # Override the saved criteria with the specified UI criteria values
            params["criteria"] = report.meta["ui_criteria"]
        return params
    return {}
