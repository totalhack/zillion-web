import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdHocMetricDialog from "@/components/AdHocMetricDialog.vue";
import { dispatchCheckMetricFormula } from "@/store/main/actions";
import { readMetrics } from "@/store/main/getters";

vi.mock("@/store/main/actions", () => ({
  dispatchCheckMetricFormula: vi.fn(),
}));

vi.mock("@/store/main/getters", () => ({
  readMetrics: vi.fn(),
}));

const stubs = [
  "v-alert",
  "v-btn",
  "v-card",
  "v-card-actions",
  "v-card-text",
  "v-card-title",
  "v-col",
  "v-container",
  "v-dialog",
  "v-form",
  "v-row",
  "v-select",
  "v-spacer",
  "v-text-field",
];

function mountDialog() {
  return shallowMount(AdHocMetricDialog, {
    mocks: {
      $store: { id: "store" },
    },
    stubs,
  });
}

describe("AdHocMetricDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readMetrics).mockReturnValue({
      at_bats: { display_name: "AB", name: "at_bats" },
      hits: { display_name: "H", name: "hits" },
    } as any);
    vi.mocked(dispatchCheckMetricFormula).mockResolvedValue({ success: true, reason: null } as any);
  });

  it("loads and retains the weighting metric when opening an existing metric", () => {
    const wrapper = mountDialog();

    (wrapper.vm as any).open({
      aggregation: "mean",
      display_name: "Weighted Batting Average",
      formula: "1.0*{hits}/{at_bats}",
      name: "weighted_batting_average",
      technical: "mean(5)",
      weighting_metric: "at_bats",
    });

    expect((wrapper.vm as any).weightingMetric).toBe("at_bats");
    expect((wrapper.vm as any).weightingMetricItems).toEqual([
      { text: "AB", value: "at_bats" },
      { text: "H", value: "hits" },
    ]);
  });

  it("includes the weighting metric in formula validation and emitted metric config", async () => {
    const wrapper = mountDialog();
    (wrapper.vm.$refs as any).form = {
      validate: vi.fn(() => {
        (wrapper.vm as any).valid = true;
      }),
    };

    (wrapper.vm as any).name = "weighted_batting_average";
    (wrapper.vm as any).displayName = "Weighted Batting Average";
    (wrapper.vm as any).formula = "1.0*{hits}/{at_bats}";
    (wrapper.vm as any).aggregation = "mean";
    (wrapper.vm as any).rounding = "3";
    (wrapper.vm as any).weightingMetric = "at_bats";

    await (wrapper.vm as any).addAdHocMetric();

    expect(dispatchCheckMetricFormula).toHaveBeenCalledWith(
      { id: "store" },
      expect.objectContaining({
        aggregation: "mean",
        display_name: "Weighted Batting Average",
        formula: "1.0*{hits}/{at_bats}",
        name: "weighted_batting_average",
        rounding: 3,
        weighting_metric: "at_bats",
      })
    );
    expect(wrapper.emitted("input")?.[0]).toEqual([
      expect.objectContaining({
        aggregation: "mean",
        display_name: "Weighted Batting Average",
        formula: "1.0*{hits}/{at_bats}",
        name: "weighted_batting_average",
        rounding: 3,
        weighting_metric: "at_bats",
      }),
    ]);
    expect((wrapper.vm as any).dialog).toBe(false);
  });

  it("omits blank optional fields from formula validation", async () => {
    const wrapper = mountDialog();
    (wrapper.vm.$refs as any).form = {
      validate: vi.fn(() => {
        (wrapper.vm as any).valid = true;
      }),
    };

    (wrapper.vm as any).name = "home_runs_per_game";
    (wrapper.vm as any).displayName = "Home Runs Per Game";
    (wrapper.vm as any).formula = "1.0*IFNULL({home_runs},0)/{games}";
    (wrapper.vm as any).aggregation = "mean";
    (wrapper.vm as any).technical = null;
    (wrapper.vm as any).rounding = null;
    (wrapper.vm as any).weightingMetric = null;

    await (wrapper.vm as any).addAdHocMetric();

    const payload = vi.mocked(dispatchCheckMetricFormula).mock.calls[0][1] as Record<string, unknown>;

    expect(payload).toEqual({
      aggregation: "mean",
      display_name: "Home Runs Per Game",
      formula: "1.0*IFNULL({home_runs},0)/{games}",
      name: "home_runs_per_game",
    });
    expect(payload).not.toHaveProperty("technical");
    expect(payload).not.toHaveProperty("rounding");
    expect(payload).not.toHaveProperty("weighting_metric");
  });
});
