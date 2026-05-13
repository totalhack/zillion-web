from typing import Optional, Union

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
    aggregation: Optional[str] = None
    rounding: Optional[int] = None
    technical: Optional[str] = None
    display_name: Optional[str] = None
    weighting_metric: Optional[str] = None


class CheckDimensionFormulaRequest(BaseModel):
    name: str
    formula: str
    display_name: Optional[str] = None


class ReportRequest(BaseModel):
    metrics: Optional[list] = None
    dimensions: Optional[list] = None
    criteria: Optional[list] = None
    row_filters: Optional[list] = None
    rollup: Optional[Union[str, int]] = None
    order_by: Optional[list] = None
    limit: Optional[int] = None
    limit_first: bool = False
    display_names: bool = True
    disabled_tables: Optional[list] = None


class ReportSaveRequest(BaseModel):
    metrics: Optional[list] = None
    dimensions: Optional[list] = None
    criteria: Optional[list] = None
    row_filters: Optional[list] = None
    rollup: Optional[Union[str, int]] = None
    order_by: Optional[list] = None
    limit: Optional[int] = None
    limit_first: bool = False
    meta: Optional[dict] = None
    report_id: Optional[int] = None


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
