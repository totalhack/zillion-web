import moment from "moment";
import { IReportRequest, IReportResult } from "./interfaces";
import {
  getDateEndOf,
  getLastMonthEnd,
  getLastMonthStart,
  getNDaysAgo,
  getNDaysAgoEnd,
  getNHoursAgo,
  getNMinutesAgo,
  getThisHour,
  getToday,
  getTomorrow,
} from "./utils";

type WarehouseFieldMap = Record<string, any>;
type RequestField = string | Record<string, any>;
type MetricRequest = string | Record<string, any>;
type ExecutableReportRequest = IReportRequest & { meta?: Record<string, any> };
type RowObject = Record<string, any>;

const DATE_FORMAT = "YYYY-MM-DD";
const DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
const CHUNKING_CRITERIA_ERROR = "Chunk window size requires exactly one active date or datetime range criteria.";
const CHUNKING_DATE_UPPER_BOUND_ERROR =
  "Chunk window size does not support date < or <= criteria. Please use a specific between date range.";

interface IChunkCriterionCandidate {
  index: number;
  name: string;
  fieldType: "date" | "datetime";
  operation: string;
  value: any;
}

interface IMetricInfo {
  name: string;
  displayName: string;
  aggregation: string;
  rounding: number | null;
  weightingMetricName: string | null;
  weightingMetricDisplayName: string | null;
  includeInOutput: boolean;
}

interface IMetricAccumulator {
  sum: number;
  min: number | null;
  max: number | null;
  averageTotal: number;
  averageCount: number;
  weightedTotal: number;
  weightTotal: number;
  sawNumeric: boolean;
  sawSimpleAverage: boolean;
  rawValue: any;
}

interface IRowAccumulator {
  dimensionValues: RowObject;
  metricAccumulators: Record<string, IMetricAccumulator>;
}

export interface IChunkExecutionPlan {
  criterionIndex: number;
  fieldName: string;
  fieldType: "date" | "datetime";
  unit: "day" | "minute";
  unitLabel: "day" | "minute";
  windowSize: number;
  rangeStart: string;
  rangeEnd: string;
  windows: Array<[string, string]>;
}

export interface IMergedChunkedReport {
  effectiveRequest: IReportRequest;
  reportResult: IReportResult;
  simpleAverageMetricDisplayNames: string[];
}

function getFieldType(field: any) {
  if (!field?.type) {
    if (field?.formula) {
      return "float";
    }
    return "string";
  }
  return String(field.type).split("(")[0].toLowerCase();
}

function getDateFormat(fieldType: "date" | "datetime") {
  return fieldType === "date" ? DATE_FORMAT : DATETIME_FORMAT;
}

function cloneRequestList(values?: any[]) {
  return Array.isArray(values)
    ? values.map((value) => {
        if (Array.isArray(value)) {
          return [...value];
        }
        if (value && typeof value === "object") {
          return Object.assign({}, value);
        }
        return value;
      })
    : undefined;
}

function parsePositiveInteger(value: any) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseMomentBoundary(value: string, fieldType: "date" | "datetime") {
  const parsed = moment(value, getDateFormat(fieldType), true);
  if (!parsed.isValid()) {
    throw new Error(`Invalid ${fieldType} boundary: ${value}`);
  }
  return parsed;
}

function resolveRangeShortcut(value: string, fieldType: "date" | "datetime"): [string, string] | null {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case "today":
      return [getToday(fieldType), getDateEndOf("day", fieldType)];
    case "yesterday":
      return [getNDaysAgo(1, fieldType), getNDaysAgoEnd(1, fieldType)];
    case "last 7 days":
      return [getNDaysAgo(7, fieldType), getNDaysAgoEnd(1, fieldType)];
    case "last 30 days":
      return [getNDaysAgo(30, fieldType), getNDaysAgoEnd(1, fieldType)];
    case "this week":
      return [moment().startOf("isoWeek").format(getDateFormat(fieldType)), getDateEndOf("day", fieldType)];
    case "this month":
      return [moment().startOf("month").format(getDateFormat(fieldType)), getDateEndOf("day", fieldType)];
    case "last month":
      return [getLastMonthStart(fieldType), getLastMonthEnd(fieldType)];
    case "this year":
      return [moment().startOf("year").format(getDateFormat(fieldType)), getDateEndOf("day", fieldType)];
    case "last 10 minutes":
      if (fieldType === "datetime") {
        return [getNMinutesAgo(10, fieldType), getNMinutesAgo(0, fieldType)];
      }
      return null;
    case "this hour":
      if (fieldType === "datetime") {
        return [getThisHour(fieldType), getNMinutesAgo(0, fieldType)];
      }
      return null;
    case "last hour":
      if (fieldType === "datetime") {
        return [getNHoursAgo(1, fieldType), getThisHour(fieldType)];
      }
      return null;
    default:
      return null;
  }
}

function resolveCriterionRange(candidate: IChunkCriterionCandidate) {
  if (candidate.operation === ">" || candidate.operation === ">=") {
    if (candidate.fieldType !== "date") {
      throw new Error(
        `Chunk window size requires the selected ${candidate.fieldType} criteria to use a concrete range or supported range shortcut.`
      );
    }

    const start = parseMomentBoundary(String(candidate.value), candidate.fieldType);
    if (candidate.operation === ">") {
      start.add(1, "day").startOf("day");
    } else {
      start.startOf("day");
    }

    const impliedExclusiveEnd = parseMomentBoundary(getTomorrow(candidate.fieldType), candidate.fieldType);
    const inclusiveEnd = impliedExclusiveEnd.clone().subtract(1, "day").startOf("day");
    return [
      start.format(getDateFormat(candidate.fieldType)),
      inclusiveEnd.format(getDateFormat(candidate.fieldType)),
    ] as [string, string];
  }

  if (candidate.fieldType === "date" && (candidate.operation === "<" || candidate.operation === "<=")) {
    throw new Error(CHUNKING_DATE_UPPER_BOUND_ERROR);
  }

  if (Array.isArray(candidate.value) && candidate.value.length === 2) {
    return [String(candidate.value[0]), String(candidate.value[1])] as [string, string];
  }

  if (typeof candidate.value === "string") {
    const shortcutRange = resolveRangeShortcut(candidate.value, candidate.fieldType);
    if (shortcutRange) {
      return shortcutRange;
    }
  }

  throw new Error(
    `Chunk window size requires the selected ${candidate.fieldType} criteria to use a concrete range or supported range shortcut.`
  );
}

function createChunkWindows(
  start: moment.Moment,
  end: moment.Moment,
  fieldType: "date" | "datetime",
  windowSize: number
) {
  const windows: Array<[string, string]> = [];
  const format = getDateFormat(fieldType);
  const stepUnit = fieldType === "date" ? "day" : "minute";
  const finalEnd = end.clone();

  let cursor = start.clone();
  while (cursor.isSameOrBefore(finalEnd)) {
    let windowEnd = cursor.clone().add(windowSize - 1, stepUnit as moment.unitOfTime.DurationConstructor);
    if (fieldType === "date") {
      windowEnd = windowEnd.startOf("day");
    } else {
      windowEnd = windowEnd.endOf("minute");
    }

    if (windowEnd.isAfter(finalEnd)) {
      windowEnd = finalEnd.clone();
    }

    windows.push([cursor.format(format), windowEnd.format(format)]);
    cursor = fieldType === "date" ? windowEnd.clone().add(1, "day") : windowEnd.clone().add(1, "second");
  }

  return windows;
}

function getMetricName(metric: MetricRequest) {
  if (typeof metric === "string") {
    return metric;
  }
  return typeof metric?.name === "string" ? metric.name : null;
}

function getRequestFieldName(field: RequestField) {
  if (typeof field === "string") {
    return field;
  }
  return typeof field?.name === "string" ? field.name : null;
}

function resolveRequestFieldDisplayName(
  field: RequestField,
  displayNameMap: Record<string, any>,
  fieldsByName: WarehouseFieldMap
) {
  const fieldName = getRequestFieldName(field);
  if (!fieldName) {
    return typeof field === "string" ? field : field?.display_name || String(field);
  }

  if (displayNameMap[fieldName]) {
    return displayNameMap[fieldName];
  }

  if (typeof field !== "string" && typeof field.display_name === "string") {
    return field.display_name;
  }

  return fieldsByName[fieldName]?.display_name || fieldName;
}

function getMetricAggregation(metric: MetricRequest, metricsByName: WarehouseFieldMap) {
  if (typeof metric !== "string" && typeof metric?.aggregation === "string") {
    return metric.aggregation.toLowerCase();
  }

  const metricName = getMetricName(metric);
  const metricDef = metricName ? metricsByName[metricName] : null;
  if (typeof metricDef?.aggregation === "string") {
    return metricDef.aggregation.toLowerCase();
  }

  return "sum";
}

function getMetricWeightingMetric(metric: MetricRequest, metricsByName: WarehouseFieldMap) {
  if (typeof metric !== "string" && typeof metric?.weighting_metric === "string") {
    return metric.weighting_metric;
  }

  const metricName = getMetricName(metric);
  const metricDef = metricName ? metricsByName[metricName] : null;
  if (typeof metricDef?.weighting_metric === "string") {
    return metricDef.weighting_metric;
  }

  return null;
}

function getMetricRounding(metric: MetricRequest, metricsByName: WarehouseFieldMap) {
  if (typeof metric !== "string" && Number.isInteger(metric?.rounding)) {
    return metric.rounding;
  }

  const metricName = getMetricName(metric);
  const metricDef = metricName ? metricsByName[metricName] : null;
  if (Number.isInteger(metricDef?.rounding)) {
    return metricDef.rounding;
  }

  return null;
}

function resolveFieldDisplayName(
  name: string,
  displayNameMap: Record<string, any>,
  fieldsByName: WarehouseFieldMap,
  metric?: any
) {
  return displayNameMap[name] || metric?.display_name || fieldsByName[name]?.display_name || name;
}

function toNumeric(value: any) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createMetricAccumulator(): IMetricAccumulator {
  return {
    sum: 0,
    min: null,
    max: null,
    averageTotal: 0,
    averageCount: 0,
    weightedTotal: 0,
    weightTotal: 0,
    sawNumeric: false,
    sawSimpleAverage: false,
    rawValue: null,
  };
}

function readChunkWindowSize(request: ExecutableReportRequest) {
  return parsePositiveInteger(request?.meta?.windowing?.size);
}

function buildEffectiveChunkedRequest(request: ExecutableReportRequest) {
  const effectiveRequest: any = stripExecutionRequestMeta(request);
  if (effectiveRequest.rollup !== "totals") {
    delete effectiveRequest.rollup;
  }
  return effectiveRequest as IReportRequest;
}

function createMetricInfos(
  request: IReportRequest,
  metricsByName: WarehouseFieldMap,
  displayNameMap: Record<string, any>,
  hiddenWeightMetricNames: string[]
) {
  const selectedMetrics = Array.isArray(request.metrics) ? request.metrics : [];
  const selectedMetricNames = new Set(
    selectedMetrics.map((metric) => getMetricName(metric)).filter(Boolean) as string[]
  );
  const metrics: MetricRequest[] = [...selectedMetrics];

  for (const hiddenMetricName of hiddenWeightMetricNames) {
    if (!selectedMetricNames.has(hiddenMetricName)) {
      metrics.push(hiddenMetricName);
    }
  }

  return metrics
    .map((metric) => {
      const name = getMetricName(metric);
      if (!name) {
        return null;
      }

      const weightingMetricName = getMetricWeightingMetric(metric, metricsByName);
      return {
        name,
        displayName: resolveFieldDisplayName(name, displayNameMap, metricsByName, metric),
        aggregation: getMetricAggregation(metric, metricsByName),
        rounding: getMetricRounding(metric, metricsByName),
        weightingMetricName,
        weightingMetricDisplayName: weightingMetricName
          ? resolveFieldDisplayName(weightingMetricName, displayNameMap, metricsByName)
          : null,
        includeInOutput: !hiddenWeightMetricNames.includes(name),
      } as IMetricInfo;
    })
    .filter((metric): metric is IMetricInfo => metric !== null);
}

function accumulateMetricFromArrayRow(
  accumulator: IMetricAccumulator,
  metricInfo: IMetricInfo,
  row: any[],
  columnIndexByName: Map<string, number>
) {
  const valueIndex = columnIndexByName.get(metricInfo.displayName);
  if (valueIndex === undefined) {
    return;
  }

  const rawValue = row[valueIndex];
  if (rawValue !== null && rawValue !== undefined && accumulator.rawValue === null) {
    accumulator.rawValue = rawValue;
  }

  const numericValue = toNumeric(rawValue);
  if (numericValue === null) {
    return;
  }

  accumulator.sawNumeric = true;

  if (metricInfo.aggregation === "mean") {
    accumulator.averageTotal += numericValue;
    accumulator.averageCount += 1;

    const weightIndex = metricInfo.weightingMetricDisplayName
      ? columnIndexByName.get(metricInfo.weightingMetricDisplayName)
      : undefined;
    const weightValue = weightIndex !== undefined ? toNumeric(row[weightIndex]) : null;
    if (weightValue === null) {
      accumulator.sawSimpleAverage = true;
      return;
    }

    accumulator.weightedTotal += numericValue * weightValue;
    accumulator.weightTotal += weightValue;
    return;
  }

  if (metricInfo.aggregation === "min") {
    accumulator.min = accumulator.min === null ? numericValue : Math.min(accumulator.min, numericValue);
    return;
  }

  if (metricInfo.aggregation === "max") {
    accumulator.max = accumulator.max === null ? numericValue : Math.max(accumulator.max, numericValue);
    return;
  }

  accumulator.sum += numericValue;
}

function accumulateMetricFromObjectRow(accumulator: IMetricAccumulator, metricInfo: IMetricInfo, row: RowObject) {
  const rawValue = row[metricInfo.displayName];
  if (rawValue !== null && rawValue !== undefined && accumulator.rawValue === null) {
    accumulator.rawValue = rawValue;
  }

  const numericValue = toNumeric(rawValue);
  if (numericValue === null) {
    return;
  }

  accumulator.sawNumeric = true;

  if (metricInfo.aggregation === "mean") {
    accumulator.averageTotal += numericValue;
    accumulator.averageCount += 1;

    const weightValue = metricInfo.weightingMetricDisplayName
      ? toNumeric(row[metricInfo.weightingMetricDisplayName])
      : null;
    if (weightValue === null) {
      accumulator.sawSimpleAverage = true;
      return;
    }

    accumulator.weightedTotal += numericValue * weightValue;
    accumulator.weightTotal += weightValue;
    return;
  }

  if (metricInfo.aggregation === "min") {
    accumulator.min = accumulator.min === null ? numericValue : Math.min(accumulator.min, numericValue);
    return;
  }

  if (metricInfo.aggregation === "max") {
    accumulator.max = accumulator.max === null ? numericValue : Math.max(accumulator.max, numericValue);
    return;
  }

  accumulator.sum += numericValue;
}

function finalizeMetricValue(accumulator: IMetricAccumulator, metricInfo: IMetricInfo) {
  if (metricInfo.aggregation === "mean") {
    if (accumulator.weightTotal > 0) {
      return accumulator.weightedTotal / accumulator.weightTotal;
    }
    if (accumulator.averageCount > 0) {
      return accumulator.averageTotal / accumulator.averageCount;
    }
    return accumulator.rawValue;
  }

  if (metricInfo.aggregation === "min") {
    return accumulator.min;
  }

  if (metricInfo.aggregation === "max") {
    return accumulator.max;
  }

  if (accumulator.sawNumeric) {
    return accumulator.sum;
  }

  return accumulator.rawValue;
}

function roundNumericValue(value: number, rounding: number | null) {
  if (rounding === null || !Number.isFinite(value)) {
    return value;
  }

  if (rounding === 0) {
    return Math.round(value);
  }

  if (rounding > 0) {
    const factor = 10 ** rounding;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  const factor = 10 ** Math.abs(rounding);
  return Math.round(value / factor) * factor;
}

function applyMetricRoundingToRow(row: RowObject, metricInfos: IMetricInfo[]) {
  const roundedRow = Object.assign({}, row);

  for (const metricInfo of metricInfos) {
    const numericValue = toNumeric(roundedRow[metricInfo.displayName]);
    if (numericValue === null) {
      continue;
    }

    roundedRow[metricInfo.displayName] = roundNumericValue(numericValue, metricInfo.rounding);
  }

  return roundedRow;
}

function compareValues(left: any, right: any, fieldType: string) {
  if (left === right) {
    return 0;
  }
  if (left === null || left === undefined || left === "") {
    return 1;
  }
  if (right === null || right === undefined || right === "") {
    return -1;
  }

  if (["integer", "smallinteger", "biginteger", "float", "numeric"].includes(fieldType)) {
    const leftNumber = toNumeric(left);
    const rightNumber = toNumeric(right);
    if (leftNumber === null && rightNumber === null) {
      return 0;
    }
    if (leftNumber === null) {
      return 1;
    }
    if (rightNumber === null) {
      return -1;
    }
    return leftNumber === rightNumber ? 0 : leftNumber > rightNumber ? 1 : -1;
  }

  const leftValue = String(left);
  const rightValue = String(right);
  return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
}

function matchesFilterOperation(left: any, operation: string, right: any, fieldType: string) {
  const comparison = compareValues(left, right, fieldType);

  switch (operation) {
    case "=":
      return comparison === 0;
    case "!=":
      return comparison !== 0;
    case ">":
      return comparison > 0;
    case ">=":
      return comparison >= 0;
    case "<":
      return comparison < 0;
    case "<=":
      return comparison <= 0;
    default:
      return true;
  }
}

function applyRowFilters(
  rows: RowObject[],
  request: IReportRequest,
  displayNameMap: Record<string, any>,
  metricsByName: WarehouseFieldMap,
  dimensionsByName: WarehouseFieldMap
) {
  const rowFilters = Array.isArray(request.row_filters) ? request.row_filters : [];
  if (!rowFilters.length) {
    return rows;
  }

  return rows.filter((row) => {
    return rowFilters.every((rowFilter) => {
      const fieldName = rowFilter?.[0];
      const operation = rowFilter?.[1];
      const value = rowFilter?.[2];
      const displayName = displayNameMap[fieldName] || metricsByName[fieldName]?.display_name || fieldName;
      const field = metricsByName[fieldName] || dimensionsByName[fieldName];
      return matchesFilterOperation(row[displayName], operation, value, getFieldType(field));
    });
  });
}

function applyOrderBy(
  rows: RowObject[],
  request: IReportRequest,
  displayNameMap: Record<string, any>,
  metricsByName: WarehouseFieldMap,
  dimensionsByName: WarehouseFieldMap
) {
  const orderBy = Array.isArray(request.order_by) ? request.order_by : [];
  if (!orderBy.length) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const orderByItem of orderBy) {
      const fieldName = orderByItem?.[0];
      const direction = orderByItem?.[1] === "desc" ? -1 : 1;
      const displayName =
        displayNameMap[fieldName] ||
        metricsByName[fieldName]?.display_name ||
        dimensionsByName[fieldName]?.display_name ||
        fieldName;
      const field = metricsByName[fieldName] || dimensionsByName[fieldName];
      const comparison = compareValues(left[displayName], right[displayName], getFieldType(field));
      if (comparison !== 0) {
        return comparison * direction;
      }
    }
    return 0;
  });
}

function applyLimit(rows: RowObject[], request: IReportRequest) {
  const limit = parsePositiveInteger(request.limit);
  if (!limit) {
    return rows;
  }
  return rows.slice(0, limit);
}

function buildTotalsRollupRow(
  rows: RowObject[],
  dimensionDisplayColumns: string[],
  metricInfos: IMetricInfo[],
  rollupMarker: string
) {
  if (!rows.length || !dimensionDisplayColumns.length) {
    return null;
  }

  const totalsRow: RowObject = {};
  for (const dimensionColumn of dimensionDisplayColumns) {
    totalsRow[dimensionColumn] = rollupMarker;
  }

  const simpleAverageColumns = new Set<string>();
  for (const metricInfo of metricInfos) {
    const accumulator = createMetricAccumulator();
    for (const row of rows) {
      accumulateMetricFromObjectRow(accumulator, metricInfo, row);
    }
    if (accumulator.sawSimpleAverage && metricInfo.aggregation === "mean") {
      simpleAverageColumns.add(metricInfo.displayName);
    }
    totalsRow[metricInfo.displayName] = finalizeMetricValue(accumulator, metricInfo);
  }

  return totalsRow;
}

export function stripExecutionRequestMeta(request: ExecutableReportRequest) {
  const nextRequest: any = {
    metrics: cloneRequestList(request.metrics),
    dimensions: cloneRequestList(request.dimensions),
    criteria: cloneRequestList(request.criteria),
    row_filters: cloneRequestList(request.row_filters),
    order_by: cloneRequestList(request.order_by),
  };

  if (request.rollup !== undefined) {
    nextRequest.rollup = request.rollup;
  }
  if (request.limit !== undefined) {
    nextRequest.limit = request.limit;
  }
  if (request.limit_first !== undefined) {
    nextRequest.limit_first = request.limit_first;
  }

  return nextRequest as IReportRequest;
}

export function buildChunkExecutionPlan(request: ExecutableReportRequest, dimensionsByName: WarehouseFieldMap) {
  const windowSize = readChunkWindowSize(request);
  if (windowSize === null) {
    return null;
  }

  const criteria = Array.isArray(request.criteria) ? request.criteria : [];
  const candidates = criteria
    .map((criterion, index) => {
      const fieldName = criterion?.[0];
      const operation = criterion?.[1];
      const value = criterion?.[2];
      const field = dimensionsByName[fieldName];
      const currentFieldType = getFieldType(field);

      if ((currentFieldType !== "date" && currentFieldType !== "datetime") || typeof fieldName !== "string") {
        return null;
      }

      return {
        index,
        name: fieldName,
        fieldType: currentFieldType,
        operation,
        value,
      } as IChunkCriterionCandidate;
    })
    .filter((candidate): candidate is IChunkCriterionCandidate => candidate !== null);

  const rejectedUpperBoundCandidate = candidates.find(
    (candidate) => candidate.fieldType === "date" && (candidate.operation === "<" || candidate.operation === "<=")
  );
  if (rejectedUpperBoundCandidate) {
    throw new Error(CHUNKING_DATE_UPPER_BOUND_ERROR);
  }

  const supportedCandidates = candidates.filter((candidate) => {
    if (candidate.operation === "between") {
      return true;
    }

    return candidate.fieldType === "date" && (candidate.operation === ">" || candidate.operation === ">=");
  });

  if (candidates.length !== 1 || supportedCandidates.length !== 1) {
    if (candidates.length === 1) {
      throw new Error(
        `Chunk window size requires the selected ${candidates[0].fieldType} criteria to use a concrete range or supported range shortcut.`
      );
    }
    throw new Error(CHUNKING_CRITERIA_ERROR);
  }

  const candidate = supportedCandidates[0];
  const [rangeStart, rangeEnd] = resolveCriterionRange(candidate);
  const start = parseMomentBoundary(rangeStart, candidate.fieldType);
  const end = parseMomentBoundary(rangeEnd, candidate.fieldType);

  if (end.isBefore(start)) {
    throw new Error(`Chunk window size requires the selected ${candidate.fieldType} range to start before it ends.`);
  }

  const windows = createChunkWindows(start, end, candidate.fieldType, windowSize);
  if (!windows.length) {
    throw new Error(`No report windows were generated for ${candidate.name}.`);
  }

  return {
    criterionIndex: candidate.index,
    fieldName: candidate.name,
    fieldType: candidate.fieldType,
    unit: candidate.fieldType === "date" ? "day" : "minute",
    unitLabel: candidate.fieldType === "date" ? "day" : "minute",
    windowSize,
    rangeStart: start.format(getDateFormat(candidate.fieldType)),
    rangeEnd: end.format(getDateFormat(candidate.fieldType)),
    windows,
  } as IChunkExecutionPlan;
}

export function buildChunkExecutionWarnings(request: IReportRequest) {
  const warnings: string[] = [];

  if (request.limit_first) {
    warnings.push(
      "Chunked execution ignores Limit First and applies row filters, ordering, and row limits after combining windows."
    );
  }

  if (request.rollup && request.rollup !== "totals") {
    warnings.push("Chunked execution only supports the Totals rollup. Level rollups are ignored.");
  }

  return warnings;
}

export function getHiddenWeightMetricNames(request: IReportRequest, metricsByName: WarehouseFieldMap) {
  const selectedMetrics = Array.isArray(request.metrics) ? request.metrics : [];
  const selectedMetricNames = new Set(
    selectedMetrics.map((metric) => getMetricName(metric)).filter(Boolean) as string[]
  );
  const hiddenWeightMetricNames = new Set<string>();

  for (const metric of selectedMetrics) {
    if (getMetricAggregation(metric, metricsByName) !== "mean") {
      continue;
    }

    const weightingMetricName = getMetricWeightingMetric(metric, metricsByName);
    if (!weightingMetricName || selectedMetricNames.has(weightingMetricName)) {
      continue;
    }

    hiddenWeightMetricNames.add(weightingMetricName);
  }

  return [...hiddenWeightMetricNames];
}

export function buildChunkExecutionRequest(
  request: ExecutableReportRequest,
  plan: IChunkExecutionPlan,
  window: [string, string],
  hiddenWeightMetricNames: string[] = []
) {
  const chunkRequest: any = stripExecutionRequestMeta(request);
  const metrics = Array.isArray(chunkRequest.metrics) ? [...chunkRequest.metrics] : [];
  const selectedMetricNames = new Set(metrics.map((metric) => getMetricName(metric)).filter(Boolean) as string[]);

  for (const hiddenWeightMetricName of hiddenWeightMetricNames) {
    if (!selectedMetricNames.has(hiddenWeightMetricName)) {
      metrics.push(hiddenWeightMetricName);
    }
  }

  chunkRequest.metrics = metrics;
  chunkRequest.criteria = cloneRequestList(chunkRequest.criteria) || [];
  chunkRequest.criteria[plan.criterionIndex] = [plan.fieldName, "between", [window[0], window[1]]];

  delete chunkRequest.rollup;
  delete chunkRequest.row_filters;
  delete chunkRequest.order_by;
  delete chunkRequest.limit;
  delete chunkRequest.limit_first;

  return chunkRequest as IReportRequest;
}

export function mergeChunkedReportResults(
  results: IReportResult[],
  request: ExecutableReportRequest,
  metricsByName: WarehouseFieldMap,
  dimensionsByName: WarehouseFieldMap,
  plan: IChunkExecutionPlan,
  hiddenWeightMetricNames: string[] = []
) {
  if (!results.length) {
    throw new Error("Expected at least one report chunk to merge.");
  }

  const displayNameMap = results.reduce((merged, result) => {
    return Object.assign(merged, result?.display_name_map || {});
  }, {} as Record<string, any>);
  const effectiveRequest = buildEffectiveChunkedRequest(request);
  const dimensionDisplayColumns = (effectiveRequest.dimensions || []).map((dimension) => {
    return resolveRequestFieldDisplayName(dimension as RequestField, displayNameMap, dimensionsByName);
  });
  const metricInfos = createMetricInfos(effectiveRequest, metricsByName, displayNameMap, hiddenWeightMetricNames);
  const rowAccumulators = new Map<string, IRowAccumulator>();
  const simpleAverageMetricDisplayNames = new Set<string>();

  for (const result of results) {
    const columnIndexByName = new Map<string, number>();
    result.columns.forEach((columnName, index) => columnIndexByName.set(columnName, index));

    for (const row of result.data || []) {
      const dimensionKeyValues = dimensionDisplayColumns.map((columnName) => {
        const columnIndex = columnIndexByName.get(columnName);
        return columnIndex === undefined ? null : row[columnIndex];
      });
      const rowKey = JSON.stringify(dimensionKeyValues);

      let rowAccumulator = rowAccumulators.get(rowKey);
      if (!rowAccumulator) {
        rowAccumulator = {
          dimensionValues: {},
          metricAccumulators: {},
        };
        dimensionDisplayColumns.forEach((columnName, index) => {
          rowAccumulator!.dimensionValues[columnName] = dimensionKeyValues[index];
        });
        rowAccumulators.set(rowKey, rowAccumulator);
      }

      for (const metricInfo of metricInfos) {
        if (!rowAccumulator.metricAccumulators[metricInfo.displayName]) {
          rowAccumulator.metricAccumulators[metricInfo.displayName] = createMetricAccumulator();
        }

        const accumulator = rowAccumulator.metricAccumulators[metricInfo.displayName];
        accumulateMetricFromArrayRow(accumulator, metricInfo, row, columnIndexByName);
        if (accumulator.sawSimpleAverage && metricInfo.aggregation === "mean") {
          simpleAverageMetricDisplayNames.add(metricInfo.displayName);
        }
      }
    }
  }

  let mergedRows = [...rowAccumulators.values()].map((rowAccumulator) => {
    const row: RowObject = Object.assign({}, rowAccumulator.dimensionValues);
    for (const metricInfo of metricInfos) {
      row[metricInfo.displayName] = finalizeMetricValue(
        rowAccumulator.metricAccumulators[metricInfo.displayName] || createMetricAccumulator(),
        metricInfo
      );
    }
    return row;
  });

  mergedRows = applyRowFilters(mergedRows, effectiveRequest, displayNameMap, metricsByName, dimensionsByName);
  mergedRows = applyOrderBy(mergedRows, effectiveRequest, displayNameMap, metricsByName, dimensionsByName);
  mergedRows = applyLimit(mergedRows, effectiveRequest);

  if (effectiveRequest.rollup === "totals") {
    const totalsRollupRow = buildTotalsRollupRow(
      mergedRows,
      dimensionDisplayColumns,
      metricInfos,
      results[0].rollup_marker
    );
    if (totalsRollupRow) {
      mergedRows = [...mergedRows, totalsRollupRow];
    }
  }

  const hiddenDisplayNames = new Set(
    metricInfos.filter((metricInfo) => !metricInfo.includeInOutput).map((metricInfo) => metricInfo.displayName)
  );
  const finalColumns = results[0].columns.filter((columnName) => !hiddenDisplayNames.has(columnName));
  const roundedRows = mergedRows.map((row) => applyMetricRoundingToRow(row, metricInfos));
  const finalData = roundedRows.map((row) => finalColumns.map((columnName) => row[columnName]));
  const querySummaries: string[] = [
    `Client-side windowing combined ${plan.windows.length} ${plan.unitLabel}${
      plan.windows.length === 1 ? "" : "s"
    } for ${plan.fieldName}: ${plan.rangeStart} to ${plan.rangeEnd}.`,
  ];

  results.forEach((result, index) => {
    querySummaries.push(
      `Window ${index + 1}/${plan.windows.length}: ${plan.windows[index][0]} to ${plan.windows[index][1]}`
    );
    querySummaries.push(...(Array.isArray(result.query_summaries) ? result.query_summaries : []));
  });

  return {
    effectiveRequest,
    simpleAverageMetricDisplayNames: [...simpleAverageMetricDisplayNames].sort((left, right) =>
      left.localeCompare(right)
    ),
    reportResult: {
      columns: finalColumns,
      data: finalData,
      rollup_marker: results[0].rollup_marker,
      display_name_map: displayNameMap,
      query_summaries: querySummaries,
      duration: results.reduce((sum, result) => sum + (Number(result.duration) || 0), 0),
      unsupported_grain_metrics: results.reduce((merged, result) => {
        return Object.assign(merged, result?.unsupported_grain_metrics || {});
      }, {} as Record<string, any>),
      is_partial: results.some((result) => !!result?.is_partial),
    },
  } as IMergedChunkedReport;
}
