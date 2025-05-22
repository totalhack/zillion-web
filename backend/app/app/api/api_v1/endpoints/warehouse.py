from typing import Any, Dict

from fastapi import APIRouter, Depends, Response
from marshmallow.exceptions import ValidationError
from tlbx import st, pp, get_string_format_args, json
from zillion.core import InvalidFieldException, ZillionException
from zillion.model import zillion_engine, ReportSpecs
from zillion.report import Report, ROLLUP_INDEX_DISPLAY_LABEL
from zillion.warehouse import Warehouse

from app import crud, models
from app.schemas.warehouse import (
    CheckMetricFormulaRequest,
    CheckDimensionFormulaRequest,
    ReportRequest,
    ReportIDRequest,
    ReportTextRequest,
    ReportSaveRequest,
    ReportSaveResponse,
    ReportLoadResponse,
    ReportFromTextRequest,
)
from app.api import deps
from app.utils import JSONEncoder, handle_shortcut_criteria

router = APIRouter()


def success_response():
    return {"success": True, "reason": None}


def inactive_user_response():
    return {"success": False, "reason": "User is not active"}


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
    if "metrics" not in request:
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
    if not crud.user.is_active(current_user):
        return inactive_user_response()

    result = {}
    for wh_id, wh in whs.items():
        result[wh_id] = dict(id=wh_id, name=wh.name)
    return result


@router.get("/{warehouse_id}/reinit", response_model=Dict[str, Any])
def reinit(
    warehouse_id: int,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve all warehouse fields"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")
    if warehouse_id not in whs:
        raise Exception("Warehouse %s not found" % warehouse_id)
    print("Re-initializing warehouse %s" % warehouse_id)
    whs[warehouse_id] = Warehouse.load(warehouse_id)
    return success_response()


@router.get("/{warehouse_id}/structure", response_model=Dict[str, Any])
def structure(
    warehouse_id: int,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve warehouse structure"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

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


@router.get("/{warehouse_id}/get_fields", response_model=Dict[str, Any])
def get_fields(
    warehouse_id: int,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve all warehouse fields"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

    wh = whs[warehouse_id]
    return dict(
        id=warehouse_id,
        dimensions=wh.get_dimension_configs(),
        metrics=wh.get_metric_configs(),
    )


@router.post("/{warehouse_id}/check_metric_formula", response_model=Dict[str, Any])
def check_metric_formula(
    warehouse_id: int,
    request: CheckMetricFormulaRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Check an AdHocMetric formula"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

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


@router.post("/{warehouse_id}/check_dimension_formula", response_model=Dict[str, Any])
def check_dimension_formula(
    warehouse_id: int,
    request: CheckDimensionFormulaRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Check an AdHocDimension formula"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

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
        wh.get_dimension(request)
    except InvalidFieldException as e:
        return {"success": False, "reason": str(e)}
    except ValidationError as e:
        return {"success": False, "reason": str(e)}
    except ZillionException as e:
        return {"success": False, "reason": str(e)}
    return {"success": True, "reason": None}


@router.post("/{warehouse_id}/execute")
def execute(
    warehouse_id: int,
    request: ReportRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Execute a report"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

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


@router.post("/{warehouse_id}/execute_id")
def execute_id(
    warehouse_id: int,
    request: ReportIDRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Execute a report by ID"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

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


@router.post("/{warehouse_id}/execute_text")
def execute_text(
    warehouse_id: int,
    request: ReportTextRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Execute a report based on natural language text"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

    pp(request)
    wh = whs[warehouse_id]
    result = wh.execute_text(request.text, allow_partial=False)
    data = process_report_result(result, display_names=request.display_names)
    # Need to use a custom json response to handle numpy dtypes
    json_str = json.dumps(data, ignore_nan=True, cls=JSONEncoder)
    return Response(media_type="application/json", content=json_str)


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
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

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


@router.get("/{warehouse_id}/load", response_model=ReportLoadResponse)
def load(
    warehouse_id: int,
    spec_id: int,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Load a report given a warehouse ID and spec ID"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

    wh = whs[warehouse_id]
    report = wh.load_report(spec_id)
    params = report.get_params()["kwargs"]
    params["meta"] = report.meta
    if report.meta.get("ui_criteria", None):
        # Override the saved criteria with the specified UI criteria values
        params["criteria"] = report.meta["ui_criteria"]
    return params


@router.post("/{warehouse_id}/load_from_text", response_model=ReportLoadResponse)
def load_from_text(
    warehouse_id: int,
    request: ReportFromTextRequest,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Get a report based on natural language text"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

    pp(request)
    wh = whs[warehouse_id]

    if not wh._get_embeddings_collection_name():
        print(f"Initializing Warehouse embeddings")
        wh.init_embeddings()

    report = Report.from_text(wh, request.text, allow_partial=False)
    params = report.get_params()["kwargs"]
    params["meta"] = {}
    return params


@router.get("/{warehouse_id}/init_embeddings", response_model=Dict[str, Any])
def init_embeddings(
    warehouse_id: int,
    force_recreate: bool = False,
    whs: Dict[str, Any] = Depends(deps.get_warehouses),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Initialize embeddings for a Warehouse"""
    if not crud.user.is_active(current_user):
        return inactive_user_response()
    if not whs:
        raise Exception("No warehouses have been loaded")

    wh = whs[warehouse_id]
    wh.init_embeddings(force_recreate=force_recreate)
    return success_response()
