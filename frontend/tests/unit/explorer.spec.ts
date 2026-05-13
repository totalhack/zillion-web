import { shallowMount } from "@vue/test-utils";
import FileSaver from "file-saver";
import Vue from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Explorer from "@/views/main/Explorer.vue";
import {
  dispatchAddNotification,
  dispatchAddWarning,
  dispatchClearNotifications,
  dispatchExecuteReport,
  dispatchExplorerCloseLoadingOverlay,
  dispatchExplorerCloseSettingsDrawer,
  dispatchExplorerOpenLoadingOverlay,
  dispatchExplorerOpenSettingsDrawer,
  dispatchExplorerSetReportState,
  dispatchExplorerSetResultLayout,
  dispatchExplorerToggleSettingsDrawer,
  dispatchHydrateExplorerStore,
  dispatchSaveReport,
  dispatchSetActiveWarehouseId,
  dispatchSetDefaultWarehouseId,
} from "@/store/main/actions";
import {
  readActiveWarehouseId,
  readDimensions,
  readExplorerResultLayout,
  readExplorerShowSettingsDrawer,
  readMetrics,
  readReportRequest,
  readReportResult,
  readUnsupportedGrainMetrics,
  readWarehouses,
} from "@/store/main/getters";
import { saveSessionReportRequest, saveSessionWarehouseId } from "@/utils";

vi.mock("file-saver", () => ({
  default: {
    saveAs: vi.fn(),
  },
}));

vi.mock("@/utils", async () => {
  const actual = await vi.importActual<typeof import("@/utils")>("@/utils");
  return {
    ...actual,
    getSessionReportRequest: vi.fn(() => null),
    getSessionWarehouseId: vi.fn(() => null),
    saveSessionReportRequest: vi.fn(),
    saveSessionWarehouseId: vi.fn(),
  };
});

vi.mock("@/store/main/actions", () => ({
  dispatchAddNotification: vi.fn(),
  dispatchAddWarning: vi.fn(),
  dispatchClearNotifications: vi.fn(),
  dispatchExecuteReport: vi.fn(),
  dispatchExplorerCloseLoadingOverlay: vi.fn(),
  dispatchExplorerCloseSettingsDrawer: vi.fn(),
  dispatchExplorerOpenLoadingOverlay: vi.fn(),
  dispatchExplorerOpenSettingsDrawer: vi.fn(),
  dispatchExplorerSetReportState: vi.fn(),
  dispatchExplorerSetResultLayout: vi.fn(),
  dispatchExplorerToggleSettingsDrawer: vi.fn(),
  dispatchGetReportFromId: vi.fn(),
  dispatchHydrateExplorerStore: vi.fn(),
  dispatchSaveReport: vi.fn(),
  dispatchSetActiveWarehouseId: vi.fn(),
  dispatchSetDefaultWarehouseId: vi.fn(),
}));

vi.mock("@/store/main/getters", () => ({
  readActiveWarehouseId: vi.fn(),
  readDimensions: vi.fn(),
  readExplorerResultLayout: vi.fn(),
  readExplorerShowSettingsDrawer: vi.fn(),
  readMetrics: vi.fn(),
  readReportRequest: vi.fn(),
  readReportResult: vi.fn(),
  readUnsupportedGrainMetrics: vi.fn(),
  readWarehouses: vi.fn(),
}));

const stubs = [
  "criteria-select",
  "dimension-select",
  "graph-select",
  "limit-select",
  "metric-select",
  "order-by-select",
  "query-summaries",
  "report-from-text-dialog",
  "report-loading-overlay",
  "report-result-graph-card",
  "report-result-table-card",
  "report-save-dialog",
  "result-layout-select",
  "rollup-select",
  "row-filter-select",
  "v-bottom-navigation",
  "v-btn",
  "v-card",
  "v-card-subtitle",
  "v-card-text",
  "v-col",
  "v-container",
  "v-icon",
  "v-list-item",
  "v-list-item-content",
  "v-navigation-drawer",
  "v-row",
  "v-select",
  "v-switch",
  "v-tab",
  "v-tab-item",
  "v-tabs",
  "v-tabs-items",
  "v-tabs-slider",
  "v-text-field",
  "v-tooltip",
];

const store = { id: "store" };
const router = { replace: vi.fn() };
const route = { hash: "", path: "/main/explorer", query: {} as Record<string, any> };

async function mountExplorer({ mobile = false, name = mobile ? "xs" : "lg" } = {}) {
  const wrapper = shallowMount(Explorer as any, {
    mocks: {
      $route: route,
      $router: router,
      $store: store,
      $vuetify: { breakpoint: { mobile, name } },
    },
    stubs,
  });
  await Vue.nextTick();
  await Promise.resolve();
  await Vue.nextTick();
  return wrapper;
}

const selectorStub = Vue.extend({
  template: "<div />",
  data() {
    return {
      selected: [],
      uiSelected: [],
    };
  },
});

const nullSelectionStub = Vue.extend({
  template: "<div />",
  data() {
    return {
      selected: null,
    };
  },
});

const reportAbTestDialogStub = Vue.extend({
  template: "<div />",
  methods: {
    hasCompleteConfig() {
      return false;
    },
    loadConfig() {
      return null;
    },
    open() {
      return undefined;
    },
    readConfig() {
      return null;
    },
    runAnalysis() {
      return Promise.resolve();
    },
  },
});

function setSelectorRefs(wrapper, overrides: Record<string, any> = {}) {
  const refs = wrapper.vm.$refs as any;
  let metricUiSelected = [{ active: true, display_name: "Hits", name: "hits" }];
  refs.metrics = {
    get selected() {
      return metricUiSelected.filter((metric) => metric.active !== false).map((metric) => metric.name);
    },
    set selected(selectedList) {
      metricUiSelected = (selectedList || []).map((metric) => {
        if (typeof metric === "string") {
          return { active: true, display_name: metric === "hits" ? "Hits" : metric, name: metric };
        }
        return Object.assign({ active: true }, metric);
      });
    },
    get uiSelected() {
      return metricUiSelected;
    },
    set uiSelected(selectedList) {
      metricUiSelected = selectedList;
    },
  };
  refs.dimensions = { selected: ["franchise_name"] };
  refs.criteria = { selected: [] };
  refs.row_filters = { selected: [] };
  refs.rollup = { selected: null };
  refs.order_by = { selected: [] };
  refs.limit = { selected: 100 };
  Object.assign(refs, overrides);
}

describe("Explorer", () => {
  let originalDocumentTitle: string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalDocumentTitle = document.title;
    route.query = {};
    route.hash = "";
    router.replace.mockResolvedValue(undefined as any);
    window.history.replaceState({ key: "initial" }, "", "/main/explorer");
    vi.mocked(dispatchExecuteReport).mockResolvedValue(true as any);
    vi.mocked(dispatchHydrateExplorerStore).mockResolvedValue(undefined as any);
    vi.mocked(dispatchSaveReport).mockResolvedValue({ spec_id: 99 } as any);
    vi.mocked(readActiveWarehouseId).mockReturnValue(5);
    vi.mocked(readDimensions).mockReturnValue({
      franchise_name: { display_name: "Franchise Name", name: "franchise_name", type: "varchar" },
    });
    vi.mocked(readExplorerResultLayout).mockReturnValue("wide");
    vi.mocked(readExplorerShowSettingsDrawer).mockReturnValue(false);
    vi.mocked(readMetrics).mockReturnValue({
      hits: { display_name: "Hits", name: "hits", type: "integer" },
    });
    vi.mocked(readReportRequest).mockReturnValue(null);
    vi.mocked(readReportResult).mockReturnValue(null);
    vi.mocked(readUnsupportedGrainMetrics).mockReturnValue({});
    vi.mocked(readWarehouses).mockReturnValue({ 5: { id: 5, name: "Reporting" } });
  });

  afterEach(() => {
    document.title = originalDocumentTitle;
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  it("adds criteria and partition fields from table dimension context", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);

    (wrapper.vm as any).addCriteriaFromDimension({ name: "franchise_name", value: "Boston Red Sox" });
    expect((wrapper.vm.$refs.criteria as any).selected).toEqual([["franchise_name", "=", "Boston Red Sox"]]);

    (wrapper.vm as any).addCriteriaFromDimension({ name: "franchise_name", value: "Boston Red Sox" });
    expect((wrapper.vm.$refs.criteria as any).selected).toEqual([
      ["franchise_name", "=", "Boston Red Sox"],
      ["franchise_name", "=", "Boston Red Sox"],
    ]);

    (wrapper.vm as any).addPartitionFromDimension({
      display_name: "Franchise Name",
      name: "franchise_name",
      value: "Boston Red Sox",
    });
    expect((wrapper.vm.$refs.dimensions as any).selected).toContainEqual({
      display_name: "Franchise Name Part",
      formula: '{franchise_name} = "Boston Red Sox"',
      name: "franchise_name_part",
    });

    (wrapper.vm as any).addPartitionFromDimension({ formula: "{franchise_name}", name: "formula_dim" });
    expect(dispatchAddWarning).toHaveBeenCalledWith(store, "Can not add partition from formula dimensions");
  });

  it("builds selections and warns when rollup has no dimensions", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper, {
      dimensions: { selected: [] },
      rollup: { selected: "all" },
    });
    (wrapper.vm as any).limitFirst = true;

    expect((wrapper.vm as any).reportSelections).toEqual({
      criteria: [],
      dimensions: [],
      limit: 100,
      limit_first: true,
      metrics: ["hits"],
      order_by: [],
      rollup: null,
      row_filters: [],
    });
    expect(dispatchAddNotification).toHaveBeenCalledWith(store, {
      color: "warning",
      content: "No Dimensions specified, ignoring Rollup",
    });
  });

  it("creates a default title from selected metrics and dimensions", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper, {
      dimensions: { selected: ["franchise_name", { display_name: "Custom Dim", name: "custom_dim" }] },
    });
    (wrapper.vm.$refs.metrics as any).selected = ["hits"];
    await wrapper.setData({ isMounted: false });
    await wrapper.setData({ isMounted: true });

    expect((wrapper.vm as any).defaultTitle()).toBe("Hits by Franchise Name, Custom Dim");
  });

  it("runs a valid report and stores the current request in session storage", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);
    (wrapper.vm as any).isMounted = true;

    await (wrapper.vm as any).run();

    expect(dispatchClearNotifications).toHaveBeenCalledWith(store);
    expect(dispatchExecuteReport).toHaveBeenCalledWith(
      store,
      expect.objectContaining({
        criteria: [],
        dimensions: ["franchise_name"],
        limit: 100,
        limit_first: false,
        metrics: ["hits"],
        order_by: [],
        rollup: null,
        row_filters: [],
        meta: expect.objectContaining({ resultLayout: "wide" }),
      })
    );
    expect(saveSessionWarehouseId).toHaveBeenCalledWith(5);
    expect(saveSessionReportRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ resultLayout: "wide" }),
        metrics: ["hits"],
      })
    );
  });

  it("persists raw ui criteria separately when execution criteria are normalized", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper, {
      criteria: {
        selected: [["day_name", "=", "Wednesday"]],
        uiSelected: [["day_name", "=", "today"]],
      },
    });

    expect((wrapper.vm as any).selections).toEqual(
      expect.objectContaining({
        criteria: [["day_name", "=", "Wednesday"]],
        meta: expect.objectContaining({
          ui_criteria: [["day_name", "=", "today"]],
        }),
      })
    );
  });

  it("saves reports, updates the URL, and applies the saved title", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);
    window.history.replaceState({ key: "route-key" }, "", "/main/explorer?warehouse=5&report=10");
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => undefined);

    await (wrapper.vm as any).save({ autorun: true, title: "Saved Report", update: false });

    expect(dispatchSaveReport).toHaveBeenCalledWith(
      store,
      expect.objectContaining({
        meta: expect.objectContaining({ title: "Saved Report" }),
      })
    );
    expect(router.replace).toHaveBeenCalledWith({
      path: "/main/explorer",
      hash: "",
      query: { autorun: "true", report: "99", warehouse: "5" },
    });
    expect(replaceState).toHaveBeenCalledWith(
      { key: "route-key" },
      "",
      "/main/explorer?warehouse=5&report=99&autorun=true"
    );
    expect(document.title).toBe("Saved Report");

    replaceState.mockRestore();
  });

  it("falls back to history replacement when router URL updates fail", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);
    window.history.replaceState({ key: "route-key" }, "", "/main/explorer?warehouse=5&report=10");
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => undefined);
    router.replace.mockRejectedValueOnce(new Error("router replace failed"));

    await (wrapper.vm as any).save({ title: "Saved Report" });

    expect(replaceState).toHaveBeenCalledWith({ key: "route-key" }, "", "/main/explorer?warehouse=5&report=99");

    replaceState.mockRestore();
  });

  it("pushes a mobile history entry for explorer modals and consumes it on manual close", async () => {
    const wrapper = await mountExplorer({ mobile: true });
    setSelectorRefs(wrapper, {
      reportSaveDialog: { close: vi.fn() },
    });
    const pushState = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);

    (wrapper.vm as any).handleModalVisibilityChange("reportSaveDialog", true);

    expect(pushState).toHaveBeenCalledWith(
      expect.objectContaining({
        explorerHistoryOwner: "explorer",
        explorerModalId: "reportSaveDialog",
      }),
      "",
      "/main/explorer"
    );
    expect((wrapper.vm as any).activeMobileModalId).toBe("reportSaveDialog");

    (wrapper.vm as any).handleModalVisibilityChange("reportSaveDialog", false);

    expect(back).toHaveBeenCalled();

    pushState.mockRestore();
    back.mockRestore();
  });

  it("uses mobile back navigation to close the active explorer modal", async () => {
    const wrapper = await mountExplorer({ mobile: true });
    const close = vi.fn();
    setSelectorRefs(wrapper, {
      reportSaveDialog: { close },
    });
    (wrapper.vm as any).activeMobileModalId = "reportSaveDialog";

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(close).toHaveBeenCalled();
  });

  it("resyncs browser history when the router already has the saved report query", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);
    route.query = { report: "99", warehouse: "5" };
    window.history.replaceState({ key: "route-key" }, "", "/main/explorer?warehouse=5&report=10");
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => undefined);

    await (wrapper.vm as any).updateSavedReportUrl(99);

    expect(router.replace).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith({ key: "route-key" }, "", "/main/explorer?warehouse=5&report=99");

    replaceState.mockRestore();
  });

  it("loads saved ui criteria when report metadata includes them", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);

    await (wrapper.vm as any).load(
      {
        criteria: [["day_name", "=", "Wednesday"]],
        dimensions: ["franchise_name"],
        limit: 100,
        limit_first: false,
        meta: {
          graphOptions: { graphType: null, logYScale: false, multiAxis: false },
          resultLayout: "wide",
          ui_criteria: [["day_name", "=", "today"]],
        },
        metrics: ["hits"],
        order_by: [],
        rollup: null,
        row_filters: [],
      },
      false
    );

    expect((wrapper.vm.$refs.criteria as any).selected).toEqual([["day_name", "=", "today"]]);
  });

  it("adds a default current-date criterion when the explorer loads empty", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-15T12:34:56"));
    vi.mocked(readDimensions).mockReturnValue({
      date: { display_name: "Date", name: "date", type: "date" },
    });

    const wrapper = shallowMount(Explorer as any, {
      mocks: {
        $route: route,
        $router: router,
        $store: store,
        $vuetify: { breakpoint: { mobile: false, name: "lg" } },
      },
      stubs: {
        ...Object.fromEntries(stubs.map((stubName) => [stubName, true])),
        "criteria-select": selectorStub,
        "dimension-select": selectorStub,
        "limit-select": nullSelectionStub,
        "metric-select": selectorStub,
        "order-by-select": selectorStub,
        "report-ab-test-dialog": reportAbTestDialogStub,
        "rollup-select": nullSelectionStub,
        "row-filter-select": selectorStub,
      },
    });

    await Vue.nextTick();
    await Promise.resolve();
    await Vue.nextTick();

    expect((wrapper.vm.$refs.criteria as any).selected).toEqual([["date", "=", "2024-05-15"]]);

    vi.useRealTimers();
  });

  it("strips ui-only fields from ad hoc metrics before saving", async () => {
    const wrapper = await mountExplorer();
    const adHocMetric = {
      active: true,
      aggregation: "mean",
      description: "1.0*IFNULL({home_runs},0)/{games}",
      display_name: "Home Runs Per Game",
      formula: "1.0*IFNULL({home_runs},0)/{games}",
      group: "Ad Hoc Metrics",
      name: "home_runs_per_game",
      required_grain: null,
      rounding: null,
      technical: null,
      weighting_metric: "games",
    };

    setSelectorRefs(wrapper, {
      metrics: {
        createdOptionsGroup: "Ad Hoc Metrics",
        rawOptionsMap: { hits: { display_name: "Hits", name: "hits", type: "integer" } },
        selected: [adHocMetric],
        uiSelected: [adHocMetric],
      },
    });

    await (wrapper.vm as any).save({ title: "Ad Hoc Metric Save" });

    const payload = vi.mocked(dispatchSaveReport).mock.calls[0][1] as any;

    expect(payload).toMatchObject({
      meta: { title: "Ad Hoc Metric Save" },
      metrics: [
        {
          aggregation: "mean",
          display_name: "Home Runs Per Game",
          formula: "1.0*IFNULL({home_runs},0)/{games}",
          name: "home_runs_per_game",
          weighting_metric: "games",
        },
      ],
    });
    expect(payload.metrics[0]).not.toHaveProperty("active");
    expect(payload.metrics[0]).not.toHaveProperty("group");
  });

  it("pauses unsupported metrics before saving and persists them in report metadata", async () => {
    vi.mocked(readUnsupportedGrainMetrics).mockReturnValue({ hits: { requested_grain: "year" } });
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);

    await (wrapper.vm as any).save({ title: "Partial Save" });

    expect((wrapper.vm.$refs.metrics as any).uiSelected).toEqual([
      { active: false, display_name: "Hits", name: "hits" },
    ]);
    expect(dispatchSaveReport).toHaveBeenCalledWith(
      store,
      expect.objectContaining({
        meta: expect.objectContaining({
          title: "Partial Save",
          ui_metrics: [{ active: false, display_name: "Hits", name: "hits" }],
        }),
        metrics: [],
      })
    );
    expect(dispatchAddNotification).toHaveBeenCalledWith(store, {
      color: "warning",
      content: "Paused unsupported metrics before saving: Hits",
    });
  });

  it("retries save after an unsupported-grain response and pauses the failing metrics", async () => {
    vi.mocked(readUnsupportedGrainMetrics)
      .mockReturnValueOnce({})
      .mockReturnValue({ hits: { requested_grain: "year", unsupported_dimensions: "minute" } });
    const savePayloads: any[] = [];
    vi.mocked(dispatchSaveReport).mockImplementation(async (_store, payload) => {
      savePayloads.push(JSON.parse(JSON.stringify(payload)));
      if (savePayloads.length === 1) {
        return { error_type: "unsupported_grain" } as any;
      }
      return { spec_id: 123 } as any;
    });

    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);

    await (wrapper.vm as any).save({ title: "Retry Save" });

    expect(dispatchSaveReport).toHaveBeenCalledTimes(2);
    expect(savePayloads[0]).toMatchObject({
      meta: { title: "Retry Save" },
      metrics: ["hits"],
    });
    expect(savePayloads[1]).toMatchObject({
      meta: {
        title: "Retry Save",
        ui_metrics: [{ active: false, display_name: "Hits", name: "hits" }],
      },
      metrics: [],
    });
    expect((wrapper.vm.$refs.metrics as any).uiSelected).toEqual([
      { active: false, display_name: "Hits", name: "hits" },
    ]);
    expect(dispatchAddNotification).toHaveBeenCalledWith(store, {
      color: "warning",
      content: "Paused unsupported metrics before saving: Hits",
    });
  });

  it("warns when the NLP report entry point is used", async () => {
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper);

    await (wrapper.vm as any).loadFromText({ autorun: false, text: "hits by franchise_name" });

    expect(dispatchAddWarning).toHaveBeenCalledWith(store, "NLP Report is temporarily disabled");
    expect(dispatchExplorerOpenLoadingOverlay).not.toHaveBeenCalled();
    expect(dispatchExplorerSetReportState).not.toHaveBeenCalled();
  });

  it("routes keyboard shortcuts to report actions", async () => {
    vi.mocked(readReportResult).mockReturnValue({
      columns: ["Franchise Name", "Hits"],
      data: [["Boston Red Sox", 1]],
      display_name_map: {},
    } as any);
    const wrapper = await mountExplorer();
    setSelectorRefs(wrapper, {
      reportResultTableCard: { getActiveDataString: vi.fn(() => "Franchise Name,Hits\nBoston Red Sox,1") },
      reportSaveDialog: { open: vi.fn() },
    });

    const preventDefault = vi.fn();
    (wrapper.vm as any).keyListenerHandler({ ctrlKey: true, key: "z", preventDefault });
    expect(dispatchExplorerToggleSettingsDrawer).toHaveBeenCalledWith(store);

    (wrapper.vm as any).keyListenerHandler({ ctrlKey: true, key: "D", preventDefault, shiftKey: true });
    expect(FileSaver.saveAs).toHaveBeenCalledWith(expect.any(Blob), "report.csv");
  });

  it("adds a completion symbol to the title when a report finishes in a hidden tab and clears it on return", async () => {
    const wrapper = await mountExplorer();
    const vm = wrapper.vm as any;

    vm.setPageTitle("Hits by Franchise Name");
    vm.reportExecutionPendingCompletion = true;
    Object.defineProperty(document, "hidden", { configurable: true, value: true });

    vm.handleReportExecutionFinished();

    expect(document.title).toBe("• Hits by Franchise Name");

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(document.title).toBe("Hits by Franchise Name");
  });

  it("does not add a completion symbol when the tab is already visible", async () => {
    const wrapper = await mountExplorer();
    const vm = wrapper.vm as any;

    vm.setPageTitle("Hits by Franchise Name");
    vm.reportExecutionPendingCompletion = true;
    Object.defineProperty(document, "hidden", { configurable: true, value: false });

    vm.handleReportExecutionFinished();

    expect(document.title).toBe("Hits by Franchise Name");
  });
});
