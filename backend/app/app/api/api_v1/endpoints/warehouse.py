from typing import Any, Dict

from fastapi import APIRouter, Depends, Response
from marshmallow.exceptions import ValidationError
from tlbx import st, raiseifnot, pp, get_string_format_args, json
from zillion.core import InvalidFieldException

# TODO: perhaps should be config driven
from zillion.model import zillion_engine, ReportSpecs
from zillion.report import Report, ROLLUP_INDEX_DISPLAY_LABEL

from app import crud, models
from app.schemas.warehouse import *
from app.api import deps

router = APIRouter()


def process_report_result(result):
    df = result.df_display
    if result.dimensions:
        df = df.reset_index()

    data = df.to_dict(orient="split")
    del data["index"]
    data["rollup_marker"] = ROLLUP_INDEX_DISPLAY_LABEL
    data["display_name_map"] = result.display_name_map
    data["query_summaries"] = [q.format() for q in result.query_summaries]
    data["duration"] = result.duration
    return data


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
        try:
            result = wh.get_metric(request)
        except InvalidFieldException as e:
            return {"success": False, "reason": str(e)}
        except ValidationError as e:
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
        wh = whs[warehouse_id]
        replace_report_formula_display_names(wh, request)
        pp(request)
        result = wh.execute(**request)
        data = process_report_result(result)
        # Need to use a custom json response to handle numpy dtypes
        json_str = json.dumps(data, ignore_nan=True)
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
        result = wh.execute_id(request.spec_id)
        data = process_report_result(result)
        # Need to use a custom json response to handle numpy dtypes
        json_str = json.dumps(data, ignore_nan=True)
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
        return params
    return {}
