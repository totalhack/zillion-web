import { describe, expect, it } from "vitest";

import { getters } from "@/store/main/getters";
import { mutations } from "@/store/main/mutations";
import { MainState } from "@/store/main/state";

function state(overrides: Partial<MainState> = {}): MainState {
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

describe("main getters and mutations", () => {
  it("detects admin access only for active superusers", () => {
    expect(getters.hasAdminAccess(state())).toBeNull();
    expect(getters.hasAdminAccess(state({ userProfile: { is_active: true, is_superuser: true } as any }))).toBe(true);
    expect(getters.hasAdminAccess(state({ userProfile: { is_active: false, is_superuser: true } as any }))).toBe(false);
  });

  it("returns the first queued notification", () => {
    expect(getters.firstNotification(state())).toBe(false);
    expect(getters.firstNotification(state({ notifications: [{ content: "hello" }] }))).toEqual({ content: "hello" });
  });

  it("merges warehouse and datasource dimensions and metrics", () => {
    const warehouse = {
      datasources: [
        { dimensions: { franchise_name: { name: "franchise_name" } }, metrics: { hits: { name: "hits" } } },
        { dimensions: { team_id: { name: "team_id" } }, metrics: undefined },
      ],
      dimensions: { player_id: { name: "player_id" } },
      metrics: { runs: { name: "runs" } },
    };
    const mainState = state({
      activeWarehouseId: 10,
      warehouseStructures: { 10: warehouse },
    });

    expect(getters.dimensions(mainState)).toEqual({
      franchise_name: { name: "franchise_name" },
      player_id: { name: "player_id" },
      team_id: { name: "team_id" },
    });
    expect(getters.metrics(mainState)).toEqual({
      hits: { name: "hits" },
      runs: { name: "runs" },
    });
  });

  it("sets warehouse structures by id and freezes report payloads", () => {
    const mainState = state();
    const warehouse = { dimensions: {}, metrics: {}, datasources: [] };
    const reportResult = { data: [{ hits: 1 }] };
    const reportRequest = { metrics: ["hits"] };

    mutations.setWarehouseStructure(mainState, { id: 3, warehouse });
    mutations.setReportResult(mainState, reportResult as any);
    mutations.setReportRequest(mainState, reportRequest as any);

    expect(mainState.warehouseStructures).toEqual({ 3: warehouse });
    expect(Object.isFrozen(mainState.reportResult)).toBe(true);
    expect(Object.isFrozen(mainState.reportRequest)).toBe(true);
  });
});
