import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildChunkExecutionPlan,
  buildChunkExecutionRequest,
  getHiddenWeightMetricNames,
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
});
