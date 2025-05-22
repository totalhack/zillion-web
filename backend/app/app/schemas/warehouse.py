from pydantic import BaseModel
from tlbx import st
from zillion.configs import (
    DataSourceConfigSchema,
    DimensionConfigSchema,
    MetricConfigSchema,
    FormulaMetricConfigSchema,
)

from app.utils import pydantic_from_marshmallow


DataSource = pydantic_from_marshmallow(DataSourceConfigSchema)
Dimension = pydantic_from_marshmallow(DimensionConfigSchema)
Metric = pydantic_from_marshmallow(MetricConfigSchema)
FormulaMetric = pydantic_from_marshmallow(FormulaMetricConfigSchema)


class CheckMetricFormulaRequest(BaseModel):
    name: str
    formula: str
    aggregation: str = None
    rounding: int = None
    technical: str = None
    display_name: str = None


class CheckDimensionFormulaRequest(BaseModel):
    name: str
    formula: str
    display_name: str = None


class ReportRequest(BaseModel):
    metrics: list = None
    dimensions: list = None
    criteria: list = None
    row_filters: list = None
    rollup: str = None
    order_by: list = None
    limit: int = None
    limit_first: bool = False
    display_names: bool = True
    disabled_tables: list = None


class ReportSaveRequest(BaseModel):
    metrics: list = None
    dimensions: list = None
    criteria: list = None
    row_filters: list = None
    rollup: str = None
    order_by: list = None
    limit: int = None
    limit_first: bool = False
    meta: dict = None
    report_id: int = None


class ReportIDRequest(BaseModel):
    spec_id: int
    display_names: bool = True


class ReportFromTextRequest(BaseModel):
    text: str


class ReportTextRequest(ReportFromTextRequest):
    display_names: bool = True


class ReportResponse(BaseModel):
    columns: list
    data: list
    rollup_marker: str
    display_name_map: dict
    query_summaries: list
    duration: float


class ReportSaveResponse(BaseModel):
    spec_id: int


class ReportLoadResponse(ReportSaveRequest):
    pass
