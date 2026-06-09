import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHistoricalComparisonPlan,
  buildHistoricalComparisonRequest,
  buildChunkExecutionPlan,
  buildChunkExecutionRequest,
  getHiddenWeightMetricNames,
  mergeHistoricalComparisonReportResults,
  mergeChunkedReportResults,
} from "@/reportWindowing";

const dimensionsByName = {
  franchise_name: {
    display_name: "Franchise Name",
    name: "franchise_name",
    type: "varchar",
  },
  debut_date: {
    display_name: "Debut Date",
    name: "debut_date",
    type: "date",
  },
  hour_of_day: {
    display_name: "Hour Of Day",
    name: "hour_of_day",
    type: "integer",
  },
  week_of_year: {
    display_name: "Week Of Year",
    name: "week_of_year",
    type: "integer",
  },
};

const metricsByName = {
  batting_average: {
    aggregation: "mean",
    display_name: "AVG",
    name: "batting_average",
    rounding: 2,
    type: "float",
    weighting_metric: "at_bats",
  },
  hits: {
    aggregation: "sum",
    display_name: "H",
    name: "hits",
    type: "integer",
  },
  at_bats: {
    aggregation: "sum",
    display_name: "AB",
    name: "at_bats",
    type: "integer",
  },
};

function createChunkedRequest() {
  return {
    criteria: [["debut_date", "between", ["2024-01-01", "2024-01-02"]]],
    dimensions: ["franchise_name"],
    limit: 50000,
    limit_first: false,
    meta: {
      windowing: { size: 1 },
    },
    metrics: [
      "hits",
      {
        aggregation: "mean",
        display_name: "AVG",
        name: "batting_average",
        rounding: 2,
        weighting_metric: "at_bats",
      },
    ],
    order_by: [["franchise_name", "asc"]],
    rollup: "totals",
    row_filters: [],
  };
}

describe("reportWindowing", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds hidden weighting metrics to chunk requests for mean metrics", () => {
    const request = createChunkedRequest();
    const plan = buildChunkExecutionPlan(request as any, dimensionsByName as any);
    const hiddenWeightMetricNames = getHiddenWeightMetricNames(request as any, metricsByName as any);

    expect(plan?.windows).toEqual([
      ["2024-01-01", "2024-01-01"],
      ["2024-01-02", "2024-01-02"],
    ]);
    expect(hiddenWeightMetricNames).toEqual(["at_bats"]);

    const chunkRequest = buildChunkExecutionRequest(
      request as any,
      plan as any,
      plan!.windows[0],
      hiddenWeightMetricNames
    );

    expect(chunkRequest.metrics).toEqual([
      "hits",
      {
        aggregation: "mean",
        display_name: "AVG",
        name: "batting_average",
        rounding: 2,
        weighting_metric: "at_bats",
      },
      "at_bats",
    ]);
    expect(chunkRequest.criteria).toEqual([["debut_date", "between", ["2024-01-01", "2024-01-01"]]]);
    expect(chunkRequest.rollup).toBeUndefined();
    expect(chunkRequest.order_by).toBeUndefined();
    expect(chunkRequest.row_filters).toBeUndefined();
    expect(chunkRequest.limit).toBeUndefined();
    expect(chunkRequest.limit_first).toBeUndefined();
  });

  it("supports date > criteria by chunking through the current day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-15T12:34:56"));

    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", ">", "2024-05-13"]],
    };

    const plan = buildChunkExecutionPlan(request as any, dimensionsByName as any);

    expect(plan).toMatchObject({
      rangeStart: "2024-05-14",
      rangeEnd: "2024-05-15",
      windows: [
        ["2024-05-14", "2024-05-14"],
        ["2024-05-15", "2024-05-15"],
      ],
    });
  });

  it("rejects date < criteria and asks for a between range", () => {
    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", "<", "2024-05-13"]],
    };

    expect(() => buildChunkExecutionPlan(request as any, dimensionsByName as any)).toThrow(
      "Chunk window size does not support date < or <= criteria. Please use a specific between date range."
    );
  });

  it("builds date-mode historical comparisons using contiguous prior-day shifts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-28T14:20:00"));

    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", "between", ["2024-05-28", "2024-05-28"]]],
      meta: {
        historicalComparison: { mode: "date", periods: 2 },
      },
    };

    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    expect(plan).toMatchObject({
      currentRangeStart: "2024-05-28",
      currentRangeEnd: "2024-05-28",
      fieldName: "debut_date",
      periods: [
        { rangeStart: "2024-05-27", rangeEnd: "2024-05-27" },
        { rangeStart: "2024-05-26", rangeEnd: "2024-05-26" },
      ],
    });
  });

  it("allows hour-mode historical comparisons for past ranges when hour_of_day is selected", () => {
    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", "between", ["2024-05-20", "2024-05-21"]]],
      dimensions: ["franchise_name", "hour_of_day"],
      meta: {
        historicalComparison: { mode: "hour", periods: 2 },
      },
    };

    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    expect(plan).toMatchObject({
      currentRangeStart: "2024-05-20",
      currentRangeEnd: "2024-05-21",
      periods: [
        { rangeStart: "2024-05-13", rangeEnd: "2024-05-14" },
        { rangeStart: "2024-05-06", rangeEnd: "2024-05-07" },
      ],
    });
  });

  it("requires hour_of_day as a selected dimension for hour-mode comparisons", () => {
    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", "between", ["2024-05-20", "2024-05-21"]]],
      meta: {
        historicalComparison: { mode: "hour", periods: 1 },
      },
    };

    expect(() => buildHistoricalComparisonPlan(request as any, dimensionsByName as any)).toThrow(
      "Historical comparison mode Hour requires Hour Of Day as a selected dimension."
    );
  });

  it("requires a selected date dimension for multi-day date comparisons", () => {
    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", "between", ["2024-05-20", "2024-05-21"]]],
      dimensions: ["franchise_name"],
      meta: {
        historicalComparison: { mode: "date", periods: 1 },
      },
    };

    expect(() => buildHistoricalComparisonPlan(request as any, dimensionsByName as any)).toThrow(
      "Historical comparison modes Date and Day of Week require a selected date or datetime dimension when the active range spans multiple days."
    );
  });

  it("allows week-mode historical comparisons for past week ranges", () => {
    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", "between", ["2024-05-13", "2024-05-19"]]],
      dimensions: ["franchise_name", "week_of_year"],
      meta: {
        historicalComparison: { mode: "week", periods: 1 },
      },
    };

    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    expect(plan).toMatchObject({
      currentRangeStart: "2024-05-13",
      currentRangeEnd: "2024-05-19",
      periods: [{ rangeStart: "2024-05-06", rangeEnd: "2024-05-12" }],
    });
  });

  it("builds historical comparison requests with hidden weighting metrics", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-28T14:20:00"));

    const request = {
      ...createChunkedRequest(),
      criteria: [["debut_date", "between", ["2024-05-28", "2024-05-28"]]],
      dimensions: ["franchise_name", "hour_of_day"],
      row_filters: [["hits", ">", 5]],
      meta: {
        historicalComparison: { mode: "hour", periods: 1 },
      },
    };
    const hiddenWeightMetricNames = getHiddenWeightMetricNames(request as any, metricsByName as any);
    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    const comparisonRequest = buildHistoricalComparisonRequest(
      request as any,
      plan as any,
      plan!.periods[0],
      hiddenWeightMetricNames
    );

    expect(comparisonRequest.criteria).toEqual([["debut_date", "between", ["2024-05-21", "2024-05-21"]]]);
    expect(comparisonRequest.metrics).toEqual([
      "hits",
      {
        aggregation: "mean",
        display_name: "AVG",
        name: "batting_average",
        rounding: 2,
        weighting_metric: "at_bats",
      },
      "at_bats",
    ]);
    expect(comparisonRequest.row_filters).toBeUndefined();
    expect(comparisonRequest.order_by).toBeUndefined();
    expect(comparisonRequest.limit).toBeUndefined();
    expect(comparisonRequest.limit_first).toBeUndefined();
  });

  it("merges chunked totals rollups and weighted mean metrics correctly", () => {
    const request = createChunkedRequest();
    const plan = buildChunkExecutionPlan(request as any, dimensionsByName as any);
    const hiddenWeightMetricNames = getHiddenWeightMetricNames(request as any, metricsByName as any);

    const merged = mergeChunkedReportResults(
      [
        {
          columns: ["Franchise Name", "H", "AVG", "AB"],
          data: [
            ["Boston Red Sox", 30, 0.12, 100],
            ["Chicago Cubs", 10, 0.27, 20],
          ],
          display_name_map: {
            at_bats: "AB",
            batting_average: "AVG",
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-01"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Franchise Name", "H", "AVG", "AB"],
          data: [
            ["Boston Red Sox", 20, 0.43, 50],
            ["Chicago Cubs", 5, 0.51, 10],
          ],
          display_name_map: {
            at_bats: "AB",
            batting_average: "AVG",
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1.5,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-02"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
      ] as any,
      request as any,
      metricsByName as any,
      dimensionsByName as any,
      plan as any,
      hiddenWeightMetricNames
    );

    expect(merged.effectiveRequest.metrics).toEqual(request.metrics);
    expect(merged.effectiveRequest.rollup).toBe("totals");
    expect(merged.simpleAverageMetricDisplayNames).toEqual([]);
    expect(merged.reportResult.columns).toEqual(["Franchise Name", "H", "AVG"]);
    expect(merged.reportResult.query_summaries).toEqual([
      "Client-side windowing combined 2 days for debut_date: 2024-01-01 to 2024-01-02.",
      "Window 1/2: 2024-01-01 to 2024-01-01",
      "Backend window 2024-01-01",
      "Window 2/2: 2024-01-02 to 2024-01-02",
      "Backend window 2024-01-02",
    ]);
    expect(merged.reportResult.duration).toBe(2.5);
    expect(merged.reportResult.data).toHaveLength(3);

    const [alphaRow, betaRow, totalsRow] = merged.reportResult.data;
    expect(alphaRow[0]).toBe("Boston Red Sox");
    expect(alphaRow[1]).toBe(50);
    expect(alphaRow[2]).toBe(0.22);

    expect(betaRow[0]).toBe("Chicago Cubs");
    expect(betaRow[1]).toBe(15);
    expect(betaRow[2]).toBe(0.35);

    expect(totalsRow[0]).toBe("__ROLLUP__");
    expect(totalsRow[1]).toBe(65);
    expect(totalsRow[2]).toBe(0.24);
  });

  it("merges historical comparison results by current row shape and adds comparison columns", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-28T14:20:00"));

    const request = {
      criteria: [["debut_date", "between", ["2024-05-28", "2024-05-28"]]],
      dimensions: ["franchise_name", "debut_date"],
      limit: 50000,
      limit_first: false,
      meta: {
        historicalComparison: { mode: "date", periods: 2 },
      },
      metrics: [
        "hits",
        {
          aggregation: "mean",
          display_name: "AVG",
          name: "batting_average",
          rounding: 2,
          weighting_metric: "at_bats",
        },
      ],
      order_by: [
        ["franchise_name", "asc"],
        ["debut_date", "asc"],
      ],
      row_filters: [],
    };
    const hiddenWeightMetricNames = getHiddenWeightMetricNames(request as any, metricsByName as any);
    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    const merged = mergeHistoricalComparisonReportResults(
      {
        columns: ["Franchise Name", "Debut Date", "H", "AVG"],
        data: [
          ["Boston Red Sox", "2024-05-28", 10, 0.25],
          ["Chicago Cubs", "2024-05-28", 6, 0.2],
        ],
        display_name_map: {
          at_bats: "AB",
          batting_average: "AVG",
          debut_date: "Debut Date",
          franchise_name: "Franchise Name",
          hits: "H",
        },
        duration: 1,
        is_partial: false,
        query_summaries: ["Current backend report"],
        rollup_marker: "__ROLLUP__",
        unsupported_grain_metrics: {},
      } as any,
      [
        {
          columns: ["Franchise Name", "Debut Date", "H", "AVG", "AB"],
          data: [
            ["Boston Red Sox", "2024-05-27", 8, 0.2, 40],
            ["Chicago Cubs", "2024-05-27", 9, 0.3, 30],
          ],
          display_name_map: {
            at_bats: "AB",
            batting_average: "AVG",
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1.5,
          is_partial: false,
          query_summaries: ["Historical backend report 1"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Franchise Name", "Debut Date", "H", "AVG", "AB"],
          data: [
            ["Boston Red Sox", "2024-05-26", 4, 0.1, 20],
            ["Chicago Cubs", "2024-05-26", 3, 0.5, 10],
          ],
          display_name_map: {
            at_bats: "AB",
            batting_average: "AVG",
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1.25,
          is_partial: false,
          query_summaries: ["Historical backend report 2"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
      ] as any,
      request as any,
      metricsByName as any,
      dimensionsByName as any,
      plan as any,
      hiddenWeightMetricNames
    );

    expect(merged.reportResult.columns).toEqual([
      "Franchise Name",
      "Debut Date",
      "H",
      "H vs Last 2 Days",
      "AVG",
      "AVG vs Last 2 Days",
    ]);
    expect(merged.simpleAverageMetricDisplayNames).toEqual([]);
    expect(merged.reportResult.data).toEqual([
      ["Boston Red Sox", "2024-05-28", 10, 6, 0.25, 0.17],
      ["Chicago Cubs", "2024-05-28", 6, 6, 0.2, 0.35],
    ]);
    expect(merged.reportResult.query_summaries).toEqual([
      "Client-side historical comparison (date) merged 2 prior periods for debut_date: 2024-05-28 to 2024-05-28.",
      "Current: Current backend report",
      "Historical 1/2: 2024-05-27 to 2024-05-27",
      "Historical backend report 1",
      "Historical 2/2: 2024-05-26 to 2024-05-26",
      "Historical backend report 2",
    ]);
  });

  it("keeps decimal precision for multi-period historical averages on integer metrics", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-28T14:20:00"));

    const request = {
      criteria: [["debut_date", "between", ["2024-05-28", "2024-05-28"]]],
      dimensions: ["franchise_name", "debut_date"],
      limit: 50000,
      limit_first: false,
      meta: {
        historicalComparison: { mode: "date", periods: 3 },
      },
      metrics: ["hits"],
      order_by: [
        ["franchise_name", "asc"],
        ["debut_date", "asc"],
      ],
      row_filters: [],
    };
    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    const merged = mergeHistoricalComparisonReportResults(
      {
        columns: ["Franchise Name", "Debut Date", "H"],
        data: [["Boston Red Sox", "2024-05-28", 10]],
        display_name_map: {
          debut_date: "Debut Date",
          franchise_name: "Franchise Name",
          hits: "H",
        },
        duration: 1,
        is_partial: false,
        query_summaries: ["Current backend report"],
        rollup_marker: "__ROLLUP__",
        unsupported_grain_metrics: {},
      } as any,
      [
        {
          columns: ["Franchise Name", "Debut Date", "H"],
          data: [["Boston Red Sox", "2024-05-27", 6]],
          display_name_map: {
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1,
          is_partial: false,
          query_summaries: ["Historical backend report 1"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Franchise Name", "Debut Date", "H"],
          data: [["Boston Red Sox", "2024-05-26", 5]],
          display_name_map: {
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1,
          is_partial: false,
          query_summaries: ["Historical backend report 2"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Franchise Name", "Debut Date", "H"],
          data: [["Boston Red Sox", "2024-05-25", 8]],
          display_name_map: {
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1,
          is_partial: false,
          query_summaries: ["Historical backend report 3"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
      ] as any,
      request as any,
      metricsByName as any,
      dimensionsByName as any,
      plan as any
    );

    expect(merged.reportResult.columns).toEqual(["Franchise Name", "Debut Date", "H", "H vs Last 3 Days"]);
    expect(merged.reportResult.data).toEqual([["Boston Red Sox", "2024-05-28", 10, 6.33]]);
  });

  it("can output historical comparison columns as percent change", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-28T14:20:00"));

    const request = {
      criteria: [["debut_date", "between", ["2024-05-28", "2024-05-28"]]],
      dimensions: ["franchise_name", "debut_date"],
      limit: 50000,
      limit_first: false,
      meta: {
        historicalComparison: { mode: "date", periods: 2, valueMode: "percent_change" },
      },
      metrics: [
        "hits",
        {
          aggregation: "mean",
          display_name: "AVG",
          name: "batting_average",
          rounding: 2,
          weighting_metric: "at_bats",
        },
      ],
      order_by: [
        ["franchise_name", "asc"],
        ["debut_date", "asc"],
      ],
      row_filters: [],
    };
    const hiddenWeightMetricNames = getHiddenWeightMetricNames(request as any, metricsByName as any);
    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    const merged = mergeHistoricalComparisonReportResults(
      {
        columns: ["Franchise Name", "Debut Date", "H", "AVG"],
        data: [
          ["Boston Red Sox", "2024-05-28", 10, 0.25],
          ["Chicago Cubs", "2024-05-28", 6, 0.2],
        ],
        display_name_map: {
          at_bats: "AB",
          batting_average: "AVG",
          debut_date: "Debut Date",
          franchise_name: "Franchise Name",
          hits: "H",
        },
        duration: 1,
        is_partial: false,
        query_summaries: ["Current backend report"],
        rollup_marker: "__ROLLUP__",
        unsupported_grain_metrics: {},
      } as any,
      [
        {
          columns: ["Franchise Name", "Debut Date", "H", "AVG", "AB"],
          data: [
            ["Boston Red Sox", "2024-05-27", 8, 0.2, 40],
            ["Chicago Cubs", "2024-05-27", 9, 0.3, 30],
          ],
          display_name_map: {
            at_bats: "AB",
            batting_average: "AVG",
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1.5,
          is_partial: false,
          query_summaries: ["Historical backend report 1"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Franchise Name", "Debut Date", "H", "AVG", "AB"],
          data: [
            ["Boston Red Sox", "2024-05-26", 4, 0.1, 20],
            ["Chicago Cubs", "2024-05-26", 3, 0.5, 10],
          ],
          display_name_map: {
            at_bats: "AB",
            batting_average: "AVG",
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
          },
          duration: 1.25,
          is_partial: false,
          query_summaries: ["Historical backend report 2"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
      ] as any,
      request as any,
      metricsByName as any,
      dimensionsByName as any,
      plan as any,
      hiddenWeightMetricNames
    );

    expect(merged.reportResult.columns).toEqual([
      "Franchise Name",
      "Debut Date",
      "H",
      "H vs Last 2 Days",
      "AVG",
      "AVG vs Last 2 Days",
    ]);
    expect(merged.reportResult.data).toEqual([
      ["Boston Red Sox", "2024-05-28", 10, 66.67, 0.25, 50],
      ["Chicago Cubs", "2024-05-28", 6, 0, 0.2, -42.86],
    ]);
  });

  it("aligns week_of_year rows across shifted week comparisons", () => {
    const request = {
      criteria: [["debut_date", "between", ["2024-05-13", "2024-05-19"]]],
      dimensions: ["franchise_name", "week_of_year"],
      limit: 50000,
      limit_first: false,
      meta: {
        historicalComparison: { mode: "week", periods: 1 },
      },
      metrics: ["hits"],
      order_by: [
        ["franchise_name", "asc"],
        ["week_of_year", "asc"],
      ],
      row_filters: [],
    };
    const plan = buildHistoricalComparisonPlan(request as any, dimensionsByName as any);

    const merged = mergeHistoricalComparisonReportResults(
      {
        columns: ["Franchise Name", "Week Of Year", "H"],
        data: [["Boston Red Sox", 20, 10]],
        display_name_map: {
          debut_date: "Debut Date",
          franchise_name: "Franchise Name",
          hits: "H",
          week_of_year: "Week Of Year",
        },
        duration: 1,
        is_partial: false,
        query_summaries: ["Current backend report"],
        rollup_marker: "__ROLLUP__",
        unsupported_grain_metrics: {},
      } as any,
      [
        {
          columns: ["Franchise Name", "Week Of Year", "H"],
          data: [["Boston Red Sox", 19, 8]],
          display_name_map: {
            debut_date: "Debut Date",
            franchise_name: "Franchise Name",
            hits: "H",
            week_of_year: "Week Of Year",
          },
          duration: 1.5,
          is_partial: false,
          query_summaries: ["Historical backend report 1"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
      ] as any,
      request as any,
      metricsByName as any,
      dimensionsByName as any,
      plan as any
    );

    expect(merged.reportResult.columns).toEqual(["Franchise Name", "Week Of Year", "H", "H vs Last Week"]);
    expect(merged.reportResult.data).toEqual([["Boston Red Sox", 20, 10, 8]]);
  });

  it("preserves ad hoc dimensions when merging chunked rows", () => {
    const request = {
      criteria: [["debut_date", "between", ["2024-01-01", "2024-01-02"]]],
      dimensions: [
        {
          display_name: "Franchise Alias",
          formula: "{franchise_name}",
          name: "franchise_alias",
        },
        "debut_date",
      ],
      limit: 50000,
      limit_first: false,
      meta: {
        windowing: { size: 1 },
      },
      metrics: ["hits"],
      order_by: [
        ["franchise_alias", "asc"],
        ["debut_date", "asc"],
      ],
      row_filters: [],
    };

    const plan = buildChunkExecutionPlan(request as any, dimensionsByName as any);

    const merged = mergeChunkedReportResults(
      [
        {
          columns: ["Franchise Alias", "Debut Date", "H"],
          data: [
            ["Boston Red Sox", "2024-01-01", 30],
            ["Chicago Cubs", "2024-01-01", 10],
          ],
          display_name_map: {
            debut_date: "Debut Date",
            franchise_alias: "Franchise Alias",
            hits: "H",
          },
          duration: 1,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-01"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Franchise Alias", "Debut Date", "H"],
          data: [
            ["Boston Red Sox", "2024-01-02", 20],
            ["Chicago Cubs", "2024-01-02", 5],
          ],
          display_name_map: {
            debut_date: "Debut Date",
            franchise_alias: "Franchise Alias",
            hits: "H",
          },
          duration: 1.5,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-02"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
      ] as any,
      request as any,
      metricsByName as any,
      dimensionsByName as any,
      plan as any
    );

    expect(merged.reportResult.columns).toEqual(["Franchise Alias", "Debut Date", "H"]);
    expect(merged.reportResult.data).toEqual([
      ["Boston Red Sox", "2024-01-01", 30],
      ["Boston Red Sox", "2024-01-02", 20],
      ["Chicago Cubs", "2024-01-01", 10],
      ["Chicago Cubs", "2024-01-02", 5],
    ]);
  });

  it("preserves ad hoc dimensions when chunking across windows without the date dimension in output", () => {
    const request = {
      criteria: [["debut_date", "between", ["2024-01-01", "2024-01-03"]]],
      dimensions: [
        {
          display_name: "Player Alias",
          formula: "{player_id}",
          name: "player_alias",
        },
      ],
      limit: 50000,
      limit_first: false,
      meta: {
        windowing: { size: 1 },
      },
      metrics: ["hits"],
      order_by: [],
      row_filters: [],
    };

    const plan = buildChunkExecutionPlan(request as any, dimensionsByName as any);

    const merged = mergeChunkedReportResults(
      [
        {
          columns: ["Player Alias", "H"],
          data: [["troutmi01", 163]],
          display_name_map: {
            hits: "H",
            player_alias: "Player Alias",
          },
          duration: 1,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-01"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Player Alias", "H"],
          data: [["judgeaa01", 335]],
          display_name_map: {
            hits: "H",
            player_alias: "Player Alias",
          },
          duration: 1.5,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-02"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
        {
          columns: ["Player Alias", "H"],
          data: [["ohtansh01", 298]],
          display_name_map: {
            hits: "H",
            player_alias: "Player Alias",
          },
          duration: 2,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-03"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        },
      ] as any,
      request as any,
      metricsByName as any,
      dimensionsByName as any,
      plan as any
    );

    expect(merged.reportResult.columns).toEqual(["Player Alias", "H"]);
    expect(merged.reportResult.data).toEqual([
      ["troutmi01", 163],
      ["judgeaa01", 335],
      ["ohtansh01", 298],
    ]);
  });
});
