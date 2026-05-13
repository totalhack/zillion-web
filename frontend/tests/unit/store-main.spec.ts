import axios from "axios";
import Vue from "vue";
import Vuex from "vuex";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api";
import router from "@/router";
import { actions } from "@/store/main/actions";
import { getters } from "@/store/main/getters";
import { mutations } from "@/store/main/mutations";
import { MainState } from "@/store/main/state";

vi.mock("@/api", () => ({
  api: {
    executeReport: vi.fn(),
    getMe: vi.fn(),
    getReportFromId: vi.fn(),
    getWarehouseStructure: vi.fn(),
    getWarehouses: vi.fn(),
    logInGetToken: vi.fn(),
    saveReport: vi.fn(),
  },
}));

vi.mock("@/router", () => ({
  default: {
    currentRoute: {
      path: "/login",
      query: {},
    },
    push: vi.fn(),
  },
}));

Vue.use(Vuex);

function createMainState(overrides: Partial<MainState> = {}): MainState {
  return {
    activeWarehouseId: null,
    explorerExpandOnHover: true,
    explorerMiniDrawer: true,
    explorerReportProgress: null,
    explorerReportState: "",
    explorerResultLayout: "wide",
    explorerShowDrawer: true,
    explorerShowLoadingOverlay: false,
    explorerShowSettingsDrawer: false,
    isLoggedIn: null,
    logInError: false,
    notifications: [],
    reportCancelToken: null,
    reportRequest: null,
    reportResult: null,
    unsupportedGrainMetrics: {},
    token: "",
    userProfile: null,
    warehouses: {},
    warehouseStructures: {},
    ...overrides,
  };
}

function createStore(overrides: Partial<MainState> = {}) {
  return new Vuex.Store({
    modules: {
      main: {
        actions,
        getters,
        mutations,
        state: createMainState(overrides),
      },
    },
  });
}

function response<T>(data: T) {
  return {
    config: {},
    data,
    headers: {},
    status: 200,
    statusText: "OK",
  } as any;
}

describe("main store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(router.push).mockResolvedValue(undefined as any);
    router.currentRoute.path = "/login";
    router.currentRoute.query = {};
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("logs in, stores the token, hydrates the profile, and routes to explorer", async () => {
    const store = createStore();
    vi.mocked(api.logInGetToken).mockResolvedValue(response({ access_token: "token-1" }));
    vi.mocked(api.getMe).mockResolvedValue(
      response({
        email: "admin@example.com",
        full_name: "Admin",
        id: 1,
        is_active: true,
        is_superuser: false,
      })
    );

    await store.dispatch("actionLogIn", { username: "admin@example.com", password: "secret" });

    expect(localStorage.getItem("token")).toBe("token-1");
    expect(store.state.main.token).toBe("token-1");
    expect(store.state.main.isLoggedIn).toBe(true);
    expect(store.state.main.logInError).toBe(false);
    expect(store.state.main.userProfile).toMatchObject({ email: "admin@example.com", is_active: true });
    expect(router.push).toHaveBeenCalledWith("/main/explorer");
  });

  it("only honors safe internal redirect paths after login", async () => {
    const store = createStore();

    router.currentRoute.query = { redirect: "/main/profile" };
    await store.dispatch("actionRouteLoggedIn");
    expect(router.push).toHaveBeenCalledWith("/main/profile");

    vi.clearAllMocks();
    router.currentRoute.path = "/login";
    router.currentRoute.query = { redirect: "https://evil.example/phish" };
    await store.dispatch("actionRouteLoggedIn");
    expect(router.push).toHaveBeenCalledWith("/main/explorer");

    vi.clearAllMocks();
    router.currentRoute.path = "/login";
    router.currentRoute.query = { redirect: "//evil.example/phish" };
    await store.dispatch("actionRouteLoggedIn");
    expect(router.push).toHaveBeenCalledWith("/main/explorer");
  });

  it("removes login state when stored token validation fails", async () => {
    localStorage.setItem("token", "bad-token");
    const store = createStore();
    vi.mocked(api.getMe).mockRejectedValue(new Error("unauthorized"));

    await store.dispatch("actionCheckLoggedIn");

    expect(localStorage.getItem("token")).toBeNull();
    expect(store.state.main.token).toBe("");
    expect(store.state.main.isLoggedIn).toBe(false);
  });

  it("turns API errors into user notifications and logs out on 401 responses", async () => {
    const store = createStore({ isLoggedIn: true, token: "token-1" });

    await store.dispatch("actionCheckApiError", { response: { data: { detail: "boom" }, status: 500 } });
    expect(store.state.main.notifications[0]).toEqual({
      color: "error",
      content: 'Error: {\n  "detail": "boom"\n}',
    });

    router.currentRoute.path = "/main/explorer";
    await store.dispatch("actionCheckApiError", { response: { data: "expired", status: 401 } });
    expect(store.state.main.token).toBe("");
    expect(store.state.main.isLoggedIn).toBe(false);
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("hydrates warehouses and missing structures", async () => {
    const store = createStore({ token: "token-1" });
    vi.mocked(api.getWarehouses).mockResolvedValue(response({ 1: { id: 1 }, 2: { id: 2 } }));
    vi.mocked(api.getWarehouseStructure)
      .mockResolvedValueOnce(response({ id: 1, warehouse: { dimensions: {}, metrics: {}, datasources: [] } }))
      .mockResolvedValueOnce(response({ id: 2, warehouse: { dimensions: {}, metrics: {}, datasources: [] } }));

    await store.dispatch("hydrateWarehouseStore");

    expect(api.getWarehouses).toHaveBeenCalledWith("token-1");
    expect(api.getWarehouseStructure).toHaveBeenCalledWith("token-1", 1);
    expect(api.getWarehouseStructure).toHaveBeenCalledWith("token-1", 2);
    expect(Object.keys(store.state.main.warehouseStructures)).toEqual(["1", "2"]);
  });

  it("rejects activating a warehouse the user cannot access", async () => {
    const store = createStore({ token: "token-1", warehouses: { 1: { id: 1, name: "One" } } });

    const result = await store.dispatch("setActiveWarehouseId", 2);

    expect(result).toBe(false);
    expect(api.getWarehouseStructure).not.toHaveBeenCalled();
    expect(store.state.main.activeWarehouseId).toBeNull();
    expect(store.state.main.notifications[0]).toEqual({
      color: "error",
      content: "Warehouse 2 is unavailable or you do not have access to it",
    });
  });

  it("returns false when warehouse structure hydration fails", async () => {
    const store = createStore({ token: "token-1", warehouses: { 3: { id: 3, name: "Three" } } });
    vi.mocked(api.getWarehouseStructure).mockRejectedValue({
      response: { data: { detail: "forbidden" }, status: 403 },
    });

    const result = await store.dispatch("setActiveWarehouseId", 3);

    expect(result).toBe(false);
    expect(store.state.main.activeWarehouseId).toBeNull();
    expect(store.state.main.notifications[0]).toEqual({
      color: "error",
      content: 'Error: {\n  "detail": "forbidden"\n}',
    });
  });

  it("awaits default warehouse activation before resolving", async () => {
    const store = createStore({
      token: "token-1",
      warehouses: { 7: { id: 7, name: "Seven" } },
    });

    let activeWarehouseWhilePending = store.state.main.activeWarehouseId;
    vi.mocked(api.getWarehouseStructure).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            activeWarehouseWhilePending = store.state.main.activeWarehouseId;
            resolve(response({ id: 7, warehouse: { dimensions: {}, metrics: {}, datasources: [] } }));
          }, 0);
        }) as any
    );

    await store.dispatch("setDefaultWarehouseId");

    expect(activeWarehouseWhilePending).toBeNull();
    expect(store.state.main.activeWarehouseId).toBe(7);
  });

  it("executes reports with cancel token handling and stores successful results", async () => {
    vi.useFakeTimers();
    const previousCancel = vi.fn();
    const nextCancelSource = { cancel: vi.fn(), token: "new-token" };
    vi.spyOn(axios.CancelToken, "source").mockReturnValue(nextCancelSource as any);
    const store = createStore({
      activeWarehouseId: 5,
      reportCancelToken: { cancel: previousCancel },
      token: "token-1",
    });
    const reportRequest = { dimensions: ["year"] };
    const reportResult = {
      columns: ["year"],
      data: [{ year: 2024 }],
      display_name_map: {},
      duration: 1,
      is_partial: true,
      query_summaries: [],
      rollup_marker: null,
      unsupported_grain_metrics: ["batting_average"],
    };
    vi.mocked(api.executeReport).mockResolvedValue(response(reportResult));

    const result = await store.dispatch("executeReport", reportRequest);

    expect(result).toBe(true);
    expect(previousCancel).toHaveBeenCalled();
    expect(api.executeReport).toHaveBeenCalledWith("token-1", 5, reportRequest, nextCancelSource);
    expect(store.state.main.explorerReportState).toBe("Processing response...");
    expect(store.state.main.reportCancelToken).toBeNull();
    expect(store.state.main.notifications[0]).toMatchObject({ color: "warning", timeout: -1 });

    vi.runAllTimers();
    await Vue.nextTick();

    expect(store.state.main.reportRequest).toEqual(reportRequest);
    expect(store.state.main.reportResult).toEqual(reportResult);
    expect(store.state.main.explorerShowSettingsDrawer).toBe(false);
  });

  it("stores chunked report wall time instead of backend durations", async () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValue(1357.5);
    const nextCancelSource = { cancel: vi.fn(), token: "chunk-token" };
    vi.spyOn(axios.CancelToken, "source").mockReturnValue(nextCancelSource as any);
    const store = createStore({
      activeWarehouseId: 5,
      token: "token-1",
      warehouseStructures: {
        5: {
          datasources: [],
          dimensions: {
            debut_date: { display_name: "Debut Date", name: "debut_date", type: "date" },
            franchise_name: { display_name: "Franchise Name", name: "franchise_name", type: "varchar" },
          },
          metrics: {
            hits: { aggregation: "sum", display_name: "H", name: "hits", type: "integer" },
          },
        },
      },
    });
    const reportRequest = {
      criteria: [["debut_date", "between", ["2024-01-01", "2024-01-02"]]],
      dimensions: ["franchise_name"],
      limit: 100,
      limit_first: false,
      meta: { windowing: { size: 1 } },
      metrics: ["hits"],
      order_by: [],
      rollup: null,
      row_filters: [],
    };
    vi.mocked(api.executeReport)
      .mockResolvedValueOnce(
        response({
          columns: ["Franchise Name", "H"],
          data: [["Boston Red Sox", 3]],
          display_name_map: { debut_date: "Debut Date", franchise_name: "Franchise Name", hits: "H" },
          duration: 999,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-01"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        })
      )
      .mockResolvedValueOnce(
        response({
          columns: ["Franchise Name", "H"],
          data: [["Boston Red Sox", 2]],
          display_name_map: { debut_date: "Debut Date", franchise_name: "Franchise Name", hits: "H" },
          duration: 888,
          is_partial: false,
          query_summaries: ["Backend window 2024-01-02"],
          rollup_marker: "__ROLLUP__",
          unsupported_grain_metrics: {},
        })
      );

    const result = await store.dispatch("executeReport", reportRequest);

    expect(result).toBe(true);
    expect(api.executeReport).toHaveBeenNthCalledWith(
      1,
      "token-1",
      5,
      {
        criteria: [["debut_date", "between", ["2024-01-01", "2024-01-01"]]],
        dimensions: ["franchise_name"],
        metrics: ["hits"],
      },
      nextCancelSource
    );
    expect(api.executeReport).toHaveBeenNthCalledWith(
      2,
      "token-1",
      5,
      {
        criteria: [["debut_date", "between", ["2024-01-02", "2024-01-02"]]],
        dimensions: ["franchise_name"],
        metrics: ["hits"],
      },
      nextCancelSource
    );

    vi.runAllTimers();
    await Vue.nextTick();

    expect(store.state.main.reportResult).toMatchObject({
      columns: ["Franchise Name", "H"],
      data: [["Boston Red Sox", 5]],
      duration: 0.3575,
    });
  });

  it("returns structured unsupported-grain save failures and highlights the bad metrics", async () => {
    const store = createStore({ activeWarehouseId: 5, token: "token-1" });
    vi.mocked(api.saveReport).mockRejectedValue({
      response: {
        data: {
          detail: "metric hits can not meet grain month due to unsupported dimensions: minute",
          error_type: "unsupported_grain",
        },
        status: 400,
      },
    });

    const result = await store.dispatch("saveReport", { dimensions: ["month", "minute"], metrics: ["hits"] });

    expect(api.saveReport).toHaveBeenCalledWith("token-1", 5, {
      dimensions: ["month", "minute"],
      metrics: ["hits"],
    });
    expect(result).toEqual({
      detail: "metric hits can not meet grain month due to unsupported dimensions: minute",
      error_type: "unsupported_grain",
      unsupported_grain_metrics: {
        hits: {
          requested_grain: "month",
          unsupported_dimensions: "minute",
        },
      },
    });
    expect(store.state.main.unsupportedGrainMetrics).toEqual({
      hits: {
        requested_grain: "month",
        unsupported_dimensions: "minute",
      },
    });
    expect(store.state.main.notifications).toEqual([]);
  });

  it("cancels an in-flight report", () => {
    const cancel = vi.fn();
    const store = createStore({ reportCancelToken: { cancel } });

    store.dispatch("cancelReport");

    expect(cancel).toHaveBeenCalled();
    expect(store.state.main.reportCancelToken).toBeNull();
  });
});
