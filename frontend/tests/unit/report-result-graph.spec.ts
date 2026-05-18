import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bb } from "billboard.js";
import ReportResultGraph from "@/components/ReportResultGraph.vue";
import { dispatchAddNotification } from "@/store/main/actions";
import {
  readActiveWarehouseId,
  readDimensions,
  readMetrics,
  readReportRequest,
  readReportResult,
  readWarehouses,
} from "@/store/main/getters";

vi.mock("billboard.js", () => ({
  area: vi.fn(() => "area"),
  bar: vi.fn(() => "bar"),
  bb: {
    generate: vi.fn(() => ({
      destroy: vi.fn(() => null),
      flush: vi.fn(),
      hide: vi.fn(),
      internal: {},
      resize: vi.fn(),
      revert: vi.fn(),
      show: vi.fn(),
      xs: vi.fn(() => ({})),
    })),
  },
  line: vi.fn(() => "line"),
  selection: vi.fn(),
  zoom: vi.fn(() => "zoom"),
}));

vi.mock("@/store/main/actions", () => ({
  dispatchAddNotification: vi.fn(),
}));

vi.mock("@/store/main/getters", () => ({
  readActiveWarehouseId: vi.fn(),
  readDimensions: vi.fn(),
  readMetrics: vi.fn(),
  readReportRequest: vi.fn(),
  readReportResult: vi.fn(),
  readWarehouses: vi.fn(),
}));

const store = { id: "store" };

function mountGraph(seriesSearchTerm = "") {
  return mount(ReportResultGraph as any, {
    attachTo: document.body,
    mocks: {
      $store: store,
      $vuetify: { breakpoint: { mobile: false } },
    },
    propsData: {
      graphOptions: { graphType: null, logYScale: false, multiAxis: false },
      resultLayout: null,
      seriesSearchTerm,
      tab: null,
    },
  });
}

describe("ReportResultGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readActiveWarehouseId).mockReturnValue(1);
    vi.mocked(readWarehouses).mockReturnValue({ 1: { id: 1, name: "Reporting" } });
    vi.mocked(readDimensions).mockReturnValue({
      debut_date: { name: "debut_date", type: "date" },
      franchise_name: { name: "franchise_name", type: "varchar" },
    });
    vi.mocked(readMetrics).mockReturnValue({
      hits: { aggregation: "sum", name: "hits", type: "integer" },
      runs: { aggregation: "sum", name: "runs", type: "integer" },
    });
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["franchise_name", "debut_date"],
      metrics: ["hits", "runs"],
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Franchise Name", "Debut Date", "H", "R"],
      data: [
        ["Boston Red Sox", "2024-01-01", 10, 1],
        ["Chicago Cubs", "2024-01-01", 20, 2],
      ],
      display_name_map: {
        debut_date: "Debut Date",
        franchise_name: "Franchise Name",
        hits: "H",
        runs: "R",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reports legend controls when chart series are available", () => {
    const wrapper = mountGraph();

    expect((wrapper.vm as any).hasLegendControls).toBe(true);
    expect(wrapper.find("#legend").exists()).toBe(true);
    expect(wrapper.findAll("#legend .bb-legend-item").length).toBe(4);
  });

  it("emits the legend label count", () => {
    const wrapper = mountGraph();
    const vm = wrapper.vm as any;

    vm.emitLegendLabelCount();

    expect(wrapper.emitted("legend-label-count-change")?.[0]).toEqual([4]);
  });

  it("counts unique legend labels instead of one per row", () => {
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["debut_date"],
      metrics: ["hits", "runs"],
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Debut Date", "H", "R"],
      data: [
        ["2024-01-01", 10, 1],
        ["2024-01-02", 20, 2],
      ],
      display_name_map: {
        debut_date: "Debut Date",
        hits: "H",
        runs: "R",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);

    const wrapper = mountGraph();
    const vm = wrapper.vm as any;

    expect(vm.getMetricBucketIds("H")).toEqual(["H"]);
    expect(vm.getMetricBucketIds("R")).toEqual(["R"]);
    expect(vm.legendLabelCount).toBe(2);
  });

  it("filters chart visibility by search term and manual legend toggles", async () => {
    const wrapper = mountGraph();
    const vm = wrapper.vm as any;
    await wrapper.setProps({ seriesSearchTerm: "Boston" });
    vm.manuallyHiddenSeriesIds = ["H/Boston Red Sox"];
    vm.$chart = {
      flush: vi.fn(),
      hide: vi.fn(),
      resize: vi.fn(),
      show: vi.fn(),
    };

    vm.applyLegendVisibilityFilters(true);

    expect(vm.visibleSeriesIdsByControls).toEqual(["H/Boston Red Sox", "R/Boston Red Sox"]);
    expect(vm.controlHiddenSeriesIds).toEqual(["H/Chicago Cubs", "R/Chicago Cubs"]);
    expect(vm.$chart.show).toHaveBeenCalledWith(["R/Boston Red Sox"], {
      withLegend: false,
    });
    expect(vm.$chart.hide).toHaveBeenCalledWith(["H/Chicago Cubs", "R/Chicago Cubs", "H/Boston Red Sox"], {
      withLegend: false,
    });
    expect(vm.$chart.flush).toHaveBeenCalled();
  });

  it("supports negated search terms with !", async () => {
    const wrapper = mountGraph();
    const vm = wrapper.vm as any;

    await wrapper.setProps({ seriesSearchTerm: "!Boston" });

    expect(vm.visibleSeriesIdsByControls).toEqual(["H/Chicago Cubs", "R/Chicago Cubs"]);
    expect(vm.controlHiddenSeriesIds).toEqual(["H/Boston Red Sox", "R/Boston Red Sox"]);
  });

  it("tracks manual series selections independently from metric and search filters", () => {
    const wrapper = mountGraph();
    const vm = wrapper.vm as any;

    vm.updateManualSeriesSelection("H/Boston Red Sox");
    expect(vm.manuallyHiddenSeriesIds).toEqual(["H/Boston Red Sox"]);

    vm.updateManualSeriesSelection("H/Boston Red Sox");
    expect(vm.manuallyHiddenSeriesIds).toEqual([]);

    vm.updateManualSeriesSelection("R/Boston Red Sox", true);
    expect(vm.manuallyHiddenSeriesIds).toEqual(["H/Boston Red Sox", "H/Chicago Cubs", "R/Chicago Cubs"]);
  });

  it("reapplies legend visibility after a legend click", () => {
    const wrapper = mountGraph();
    const vm = wrapper.vm as any;

    vm.applyLegendVisibilityFilters = vi.fn();

    vm.handleLegendItemClick("H/Boston Red Sox");

    expect(vm.manuallyHiddenSeriesIds).toEqual(["H/Boston Red Sox"]);
    expect(vm.applyLegendVisibilityFilters).toHaveBeenCalledTimes(1);
  });

  it("focuses and reverts chart series on legend hover", () => {
    const wrapper = mountGraph("Boston");
    const vm = wrapper.vm as any;

    vm.$chart = {
      focus: vi.fn(),
      revert: vi.fn(),
    };

    vm.handleLegendItemMouseEnter("H/Boston Red Sox");

    expect(vm.hoveredLegendSeriesId).toBe("H/Boston Red Sox");
    expect(vm.$chart.focus).toHaveBeenCalledWith("H/Boston Red Sox");

    vm.handleLegendItemMouseLeave();

    expect(vm.hoveredLegendSeriesId).toBeNull();
    expect(vm.$chart.revert).toHaveBeenCalledTimes(1);
  });

  it("greys manually hidden legend labels while keeping them visible", async () => {
    const wrapper = mountGraph("Boston");
    const vm = wrapper.vm as any;
    vm.manuallyHiddenSeriesIds = ["H/Boston Red Sox", "R/Boston Red Sox"];

    await wrapper.vm.$nextTick();

    const legendItems = wrapper.findAll("#legend .bb-legend-item");
    expect(legendItems.length).toBe(2);
    expect(legendItems.at(0)?.classes()).toContain(vm.manualHiddenLegendClass);
    expect(legendItems.at(1)?.classes()).toContain(vm.manualHiddenLegendClass);
  });

  it("centers the legend layout", () => {
    const wrapper = mountGraph();
    const vm = wrapper.vm as any;

    vm.syncLegendAlignment();

    const legend = document.getElementById("legend");
    expect(legend?.classList.contains("justify-center")).toBe(true);
    expect(legend?.classList.contains("justify-left")).toBe(false);
  });

  it("keeps tab layout chart height constrained to the graph stage", () => {
    vi.mocked(readReportRequest).mockReturnValue({
      dimensions: ["debut_date"],
      metrics: ["hits"],
    } as any);
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Debut Date", "H"],
      data: Array.from({ length: 13 }, (_, index) => [`2024-01-${String(index + 1).padStart(2, "0")}`, index + 1]),
      display_name_map: {
        debut_date: "Debut Date",
        hits: "H",
      },
      duration: 1,
      is_partial: false,
      query_summaries: [],
      rollup_marker: "__ROLLUP__",
      unsupported_grain_metrics: {},
    } as any);

    const wrapper = mount(ReportResultGraph as any, {
      attachTo: document.body,
      mocks: {
        $store: store,
        $vuetify: { breakpoint: { mobile: false } },
      },
      propsData: {
        graphOptions: { graphType: "line", logYScale: false, multiAxis: false },
        resultLayout: "tabs",
        seriesSearchTerm: "",
        tab: "graphTab",
      },
    });
    const vm = wrapper.vm as any;

    Object.defineProperty(document.getElementById("graph-stage"), "clientHeight", {
      configurable: true,
      value: 320,
    });

    vm.initChart();

    const chart = vi.mocked(bb.generate).mock.results.at(-1)?.value;
    expect(chart.resize).toHaveBeenLastCalledWith({ height: 320 });
  });
});
