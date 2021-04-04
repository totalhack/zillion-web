from pydantic import BaseModel
from tlbx import st, raiseifnot
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


class CheckFormulaRequest(BaseModel):
    name: str
    formula: str
    rounding: int = None
    technical: str = None


class ReportRequest(BaseModel):
    metrics: list = None
    dimensions: list = None
    criteria: list = None
    row_filters: list = None
    rollup: str = None
    order_by: list = None
    limit: int = None
    limit_first: bool = False


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


class ReportIDRequest(BaseModel):
    spec_id: int


class ReportResponse(BaseModel):
    columns: list
    data: list
    rollup_marker: str
    display_name_map: dict
    query_summaries: list
    duration: float


class ReportSaveResponse(BaseModel):
    spec_id: int
