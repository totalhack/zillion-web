import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReportResultTable from "@/components/ReportResultTable.vue";
import {
  readActiveWarehouseId,
  readDimensions,
  readMetrics,
  readReportRequest,
  readReportResult,
  readWarehouses,
} from "@/store/main/getters";

vi.mock("@/store/main/getters", () => ({
  readActiveWarehouseId: vi.fn(),
  readDimensions: vi.fn(),
  readMetrics: vi.fn(),
  readReportRequest: vi.fn(),
  readReportResult: vi.fn(),
  readWarehouses: vi.fn(),
}));

const store = { id: "store" };

function mountTable(propsData = {}) {
  return shallowMount(ReportResultTable, {
    mocks: {
      $store: store,
      $vuetify: { breakpoint: { mobile: false } },
    },
    propsData: {
      normalizeMode: null,
      showNormalizedValues: false,
      ...propsData,
    },
    stubs: ["context-menu", "v-data-table", "v-switch", "v-text-field"],
  });
}

describe("ReportResultTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readActiveWarehouseId).mockReturnValue(1);
    vi.mocked(readWarehouses).mockReturnValue({ 1: { id: 1, name: "Reporting" } });
    vi.mocked(readDimensions).mockReturnValue({
      debut_date: { name: "debut_date", type: "date" },
      franchise_name: { name: "franchise_name", type: "varchar" },
    });
    vi.mocked(readMetrics).mockReturnValue({
      batting_average: {
        aggregation: "mean",
        meta: {
          display_colors: {
            green: { max: 10 },
            red: { min: 20 },
          },
        },
        name: "batting_average",
        type: "numeric",
      },
      hits: { aggregation: "sum", name: "hits", type: "integer" },
    });
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name"],
      metrics: ["hits", "batting_average"],
    });
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Franchise Name", "H", "AVG"],
      data: [
        ["Boston Red Sox", 10, 5.25],
        ["__ROLLUP__", 40, 12.5],
      ],
      display_name_map: {
        batting_average: "AVG",
        franchise_name: "Franchise Name",
        hits: "H",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);
  });

  it("maps report array rows into table objects and marks rollup rows", () => {
    const wrapper = mountTable();

    expect((wrapper.vm as any).reportData).toEqual([
      { _id: 0, _isRollup: false, AVG: 5.25, "Franchise Name": "Boston Red Sox", H: 10 },
      { _id: 1, _isRollup: true, AVG: 12.5, "Franchise Name": "__ROLLUP__", H: 40 },
    ]);
    expect((wrapper.vm as any).getRowClass({ _isRollup: true })).toEqual(["rollup-row"]);
    expect((wrapper.vm as any).getRowClass({ _isRollup: false })).toEqual([]);
  });

  it("chooses filter behavior based on field type", () => {
    const wrapper = mountTable();
    const vm = wrapper.vm as any;

    expect(vm.getFilter("H")(">=10", 10)).toBe(true);
    expect(vm.getFilter("H")(">10", 10)).toBe(false);
    expect(vm.getFilter("AVG")("<10", 5.25)).toBe(true);
    expect(vm.getFilter("Franchise Name")("Boston", "Boston Red Sox / test")).toBe(true);
    expect(vm.getFilter("Franchise Name")("!Boston", "Chicago Cubs")).toBe(true);
    expect(vm.getFilter("Unknown Ad Hoc")(">2.5", 3)).toBe(true);
  });

  it("builds headers that apply active column filters", () => {
    const wrapper = mountTable();
    const vm = wrapper.vm as any;
    const headers = vm.reportHeaders;

    expect(headers.map((header) => header.value)).toEqual(["Franchise Name", "H", "AVG"]);

    vm.filters.H = ">10";
    expect(headers[1].filter(9, null, {})).toBe(false);
    expect(headers[1].filter(11, null, {})).toBe(true);

    vm.handleFilterInput("H", "");
    expect(vm.filters.H).toBe("");
  });

  it("returns display-color styles for configured metric ranges", () => {
    const wrapper = mountTable();
    const vm = wrapper.vm as any;

    expect(vm.getCellStyle("AVG", 5)).toBe("color: green");
    expect(vm.getCellStyle("AVG", 25)).toBe("color: red");
    expect(vm.getCellStyle("H", 25)).toBe("");
  });

  it("exports only active filtered data with type-aware CSV quoting", () => {
    const wrapper = mountTable();
    const vm = wrapper.vm as any;
    vm.$refs.datatable = {
      $children: [
        {
          filteredItems: [
            { AVG: 5.25, "Franchise Name": "Boston Red Sox", H: 10, extra: "ignore" },
            { AVG: 15, "Franchise Name": "Chicago Cubs", H: 3, extra: "ignore" },
          ],
        },
      ],
    };

    expect(vm.quotesMask).toEqual([true, false, false]);
    expect(vm.getActiveData()).toEqual([
      { AVG: 5.25, "Franchise Name": "Boston Red Sox", H: 10 },
      { AVG: 15, "Franchise Name": "Chicago Cubs", H: 3 },
    ]);
    expect(vm.getActiveDataString()).toContain('"Franchise Name",H,AVG');
    expect(vm.getActiveDataString()).toContain('"Boston Red Sox",10,5.25');
  });

  it("formats historical percent change columns with a percent suffix", () => {
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name"],
      meta: { historicalComparison: { mode: "date", periods: 2, valueMode: "percent_change" } },
      metrics: ["hits"],
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Franchise Name", "H", "H vs Last 2 Same Days"],
      data: [["Boston Red Sox", 10, 66.67]],
      display_name_map: {
        franchise_name: "Franchise Name",
        hits: "H",
        historical_pct_change_avg_2_hits: "H vs Last 2 Same Days",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);

    const wrapper = mountTable();
    const vm = wrapper.vm as any;
    const displayRow = vm.displayReportData[0];

    expect(vm.getCellDisplayValue("H vs Last 2 Same Days", displayRow["H vs Last 2 Same Days"], displayRow)).toBe(
      "66.67%"
    );
    expect(vm.getExportRow(displayRow)["H vs Last 2 Same Days"]).toBe("66.67%");
  });

  it("only offers total normalization when a grand-total rollup is present", () => {
    const wrapper = mountTable();

    expect((wrapper.vm as any).canNormalize).toBe(false);
    expect((wrapper.vm as any).canNormalizeTotal).toBe(false);
    expect((wrapper.vm as any).canNormalizeByGroup).toBe(false);

    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name"],
      metrics: ["hits", "batting_average"],
      rollup: "all",
    } as any);

    const rollupWrapper = mountTable();
    expect((rollupWrapper.vm as any).canNormalize).toBe(true);
    expect((rollupWrapper.vm as any).canNormalizeTotal).toBe(true);
    expect((rollupWrapper.vm as any).canNormalizeByGroup).toBe(false);
  });

  it("offers group normalization for level rollups without requiring a grand total row", () => {
    vi.mocked(readDimensions).mockReturnValue({
      debut_date: { name: "debut_date", type: "date" },
      franchise_name: { name: "franchise_name", type: "varchar" },
    });
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name", "debut_date"],
      metrics: ["hits", "batting_average"],
      rollup: 1,
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Franchise Name", "Debut Date", "H", "AVG"],
      data: [
        ["Boston Red Sox", "2023-11-17", 10, 5],
        ["Boston Red Sox", "__ROLLUP__", 20, 8],
        ["Chicago Cubs", "2023-11-17", 30, 12],
        ["Chicago Cubs", "__ROLLUP__", 30, 12],
      ],
      display_name_map: {
        batting_average: "AVG",
        debut_date: "Debut Date",
        franchise_name: "Franchise Name",
        hits: "H",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);

    const wrapper = mountTable();
    expect((wrapper.vm as any).canNormalize).toBe(true);
    expect((wrapper.vm as any).canNormalizeTotal).toBe(false);
    expect((wrapper.vm as any).canNormalizeByGroup).toBe(true);
    expect((wrapper.vm as any).normalizationAvailability).toEqual({ total: false, group: true });
  });

  it("normalizes sums and means against the final totals rollup row", async () => {
    vi.mocked(readDimensions).mockReturnValue({
      debut_date: { name: "debut_date", type: "date" },
      franchise_name: { name: "franchise_name", type: "varchar" },
    });
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name", "debut_date"],
      metrics: ["hits", "batting_average"],
      rollup: "all",
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Franchise Name", "Debut Date", "H", "AVG"],
      data: [
        ["Boston Red Sox", "2023-11-17", 10, 5],
        ["Boston Red Sox", "__ROLLUP__", 20, 8],
        ["Chicago Cubs", "2023-11-17", 30, 12],
        ["__ROLLUP__", "__ROLLUP__", 50, 10],
      ],
      display_name_map: {
        batting_average: "AVG",
        debut_date: "Debut Date",
        franchise_name: "Franchise Name",
        hits: "H",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);

    const wrapper = mountTable();
    const vm = wrapper.vm as any;
    await wrapper.setProps({ normalizeMode: "total" });

    expect(vm.totalsRollupRow).toEqual({
      _id: 3,
      _isRollup: true,
      AVG: 10,
      "Debut Date": "__ROLLUP__",
      "Franchise Name": "__ROLLUP__",
      H: 50,
    });
    expect(vm.displayReportData).toEqual([
      { _id: 0, _isRollup: false, AVG: 50, "Debut Date": "2023-11-17", "Franchise Name": "Boston Red Sox", H: 20 },
      { _id: 1, _isRollup: true, AVG: 80, "Debut Date": "__ROLLUP__", "Franchise Name": "Boston Red Sox", H: 40 },
      { _id: 2, _isRollup: false, AVG: 120, "Debut Date": "2023-11-17", "Franchise Name": "Chicago Cubs", H: 60 },
      { _id: 3, _isRollup: true, AVG: 10, "Debut Date": "__ROLLUP__", "Franchise Name": "__ROLLUP__", H: 50 },
    ]);
    expect(vm.getCellDisplayValue("H", 40)).toBe("40.00%");
    expect(vm.getCellDisplayValue("AVG", 80)).toBe("80.00%");
    expect(vm.getCellDisplayValue("H", vm.displayReportData[3].H, vm.displayReportData[3])).toBe(50);
    expect(vm.getCellStyle("AVG", 80)).toBe("");
  });

  it("normalizes detail rows against their nearest rollup group when requested", async () => {
    vi.mocked(readDimensions).mockReturnValue({
      debut_date: { name: "debut_date", type: "date" },
      franchise_name: { name: "franchise_name", type: "varchar" },
    });
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name", "debut_date"],
      metrics: ["hits", "batting_average"],
      rollup: "all",
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Franchise Name", "Debut Date", "H", "AVG"],
      data: [
        ["Boston Red Sox", "2023-11-17", 10, 5],
        ["Boston Red Sox", "__ROLLUP__", 20, 8],
        ["Chicago Cubs", "2023-11-17", 30, 12],
        ["Chicago Cubs", "__ROLLUP__", 30, 12],
        ["__ROLLUP__", "__ROLLUP__", 50, 10],
      ],
      display_name_map: {
        batting_average: "AVG",
        debut_date: "Debut Date",
        franchise_name: "Franchise Name",
        hits: "H",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);

    const wrapper = mountTable({ normalizeMode: "group" });
    const vm = wrapper.vm as any;

    expect(vm.canNormalizeByGroup).toBe(true);
    expect(vm.displayReportData).toEqual([
      { _id: 0, _isRollup: false, AVG: 62.5, "Debut Date": "2023-11-17", "Franchise Name": "Boston Red Sox", H: 50 },
      { _id: 1, _isRollup: true, AVG: 80, "Debut Date": "__ROLLUP__", "Franchise Name": "Boston Red Sox", H: 40 },
      { _id: 2, _isRollup: false, AVG: 100, "Debut Date": "2023-11-17", "Franchise Name": "Chicago Cubs", H: 100 },
      { _id: 3, _isRollup: true, AVG: 120, "Debut Date": "__ROLLUP__", "Franchise Name": "Chicago Cubs", H: 60 },
      { _id: 4, _isRollup: true, AVG: 10, "Debut Date": "__ROLLUP__", "Franchise Name": "__ROLLUP__", H: 50 },
    ]);
    expect(vm.getCellDisplayValue("H", vm.displayReportData[0].H, vm.displayReportData[0])).toBe("50.00%");
    expect(vm.getCellDisplayValue("H", vm.displayReportData[4].H, vm.displayReportData[4])).toBe(50);
  });

  it("normalizes detail rows against the most specific available ancestor rollup", () => {
    vi.mocked(readDimensions).mockReturnValue({
      ballpark: { name: "ballpark", type: "varchar" },
      debut_date: { name: "debut_date", type: "date" },
      franchise_name: { name: "franchise_name", type: "varchar" },
      player_id: { name: "player_id", type: "varchar" },
      year: { name: "year", type: "integer" },
    });
    vi.mocked(readMetrics).mockReturnValue({
      batting_average: { aggregation: "mean", name: "batting_average", type: "numeric" },
      singles: { aggregation: "sum", name: "singles", type: "integer" },
    } as any);
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["debut_date", "ballpark", "franchise_name", "player_id", "year"],
      metrics: ["singles", "batting_average"],
      rollup: 1,
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Debut Date", "Ballpark", "Franchise Name", "Player ID", "Year", "1B", "AVG"],
      data: [
        ["2011-07-08", "Angel Stadium", "Los Angeles Angels", "troutmi01", 2021, 22, 0.333],
        ["2011-07-08", "Angel Stadium", "Los Angeles Angels", "troutmi01", 2022, 62, 0.283],
        ["2011-07-08", "__ROLLUP__", "__ROLLUP__", "__ROLLUP__", "__ROLLUP__", 84, 0.308],
      ],
      display_name_map: {
        ballpark: "Ballpark",
        batting_average: "AVG",
        debut_date: "Debut Date",
        franchise_name: "Franchise Name",
        player_id: "Player ID",
        singles: "1B",
        year: "Year",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);

    const wrapper = mountTable({ normalizeMode: "group" });
    const vm = wrapper.vm as any;

    expect(vm.canNormalize).toBe(true);
    expect(vm.canNormalizeTotal).toBe(false);
    expect(vm.canNormalizeByGroup).toBe(true);
    expect(vm.displayReportData).toEqual([
      {
        _id: 0,
        _isRollup: false,
        "1B": 26.190476190476193,
        AVG: 108.11688311688312,
        Ballpark: "Angel Stadium",
        "Debut Date": "2011-07-08",
        "Franchise Name": "Los Angeles Angels",
        "Player ID": "troutmi01",
        Year: 2021,
      },
      {
        _id: 1,
        _isRollup: false,
        "1B": 73.80952380952381,
        AVG: 91.88311688311688,
        Ballpark: "Angel Stadium",
        "Debut Date": "2011-07-08",
        "Franchise Name": "Los Angeles Angels",
        "Player ID": "troutmi01",
        Year: 2022,
      },
      {
        _id: 2,
        _isRollup: true,
        "1B": 84,
        AVG: 0.308,
        Ballpark: "__ROLLUP__",
        "Debut Date": "2011-07-08",
        "Franchise Name": "__ROLLUP__",
        "Player ID": "__ROLLUP__",
        Year: "__ROLLUP__",
      },
    ]);
  });

  it("keeps active rows raw even while normalized values are displayed", async () => {
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name"],
      metrics: ["hits", "batting_average"],
      rollup: "all",
    } as any);

    const wrapper = mountTable();
    const vm = wrapper.vm as any;
    await wrapper.setProps({ normalizeMode: "total" });
    vm.$refs.datatable = {
      $children: [
        {
          filteredItems: vm.displayReportData,
        },
      ],
    };

    expect(vm.getActiveRows()).toEqual([
      { _id: 0, _isRollup: false, AVG: 5.25, "Franchise Name": "Boston Red Sox", H: 10 },
      { _id: 1, _isRollup: true, AVG: 12.5, "Franchise Name": "__ROLLUP__", H: 40 },
    ]);
    expect(vm.getActiveDataString()).toContain('"Boston Red Sox",25.00%,42.00%');
    expect(vm.getActiveDataString()).toContain('"__ROLLUP__",40,12.5');
  });
});
