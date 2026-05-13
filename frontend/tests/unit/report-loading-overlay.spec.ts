import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReportLoadingOverlay from "@/components/ReportLoadingOverlay.vue";
import { dispatchCancelReport, dispatchExplorerCloseLoadingOverlay } from "@/store/main/actions";
import {
  readExplorerReportProgress,
  readExplorerReportState,
  readExplorerShowLoadingOverlay,
} from "@/store/main/getters";

vi.mock("@/store/main/actions", () => ({
  dispatchCancelReport: vi.fn(),
  dispatchExplorerCloseLoadingOverlay: vi.fn(),
}));

vi.mock("@/store/main/getters", () => ({
  readExplorerReportProgress: vi.fn(),
  readExplorerReportState: vi.fn(),
  readExplorerShowLoadingOverlay: vi.fn(),
}));

function mountOverlay() {
  return shallowMount(ReportLoadingOverlay, {
    mocks: {
      $store: { id: "store" },
    },
    stubs: ["v-btn", "v-icon", "v-overlay", "v-progress-circular"],
  });
}

describe("ReportLoadingOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readExplorerShowLoadingOverlay).mockReturnValue(true);
    vi.mocked(readExplorerReportProgress).mockReturnValue(42);
  });

  it("renders pulling-window status in a separate detail line", () => {
    vi.mocked(readExplorerReportState).mockReturnValue("Pulling window 1/6: 2021-05-01 to 2022-04-30");

    const wrapper = mountOverlay();

    expect(wrapper.find(".report-loading-overlay__status-label").text()).toBe("Status: Pulling window 1/6");
    expect(wrapper.find(".report-loading-overlay__status-detail").text()).toBe("2021-05-01 to 2022-04-30");
  });

  it("cancels the report and closes the overlay", () => {
    vi.mocked(readExplorerReportState).mockReturnValue("Combining windows...");
    const wrapper = mountOverlay();

    (wrapper.vm as any).closeLoadingOverlay();

    expect(dispatchCancelReport).toHaveBeenCalledWith({ id: "store" });
    expect(dispatchExplorerCloseLoadingOverlay).toHaveBeenCalledWith({ id: "store" });
  });
});
