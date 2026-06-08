import { shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ReportResultTable.vue", () => ({
  default: {
    name: "ReportResultTable",
    props: ["normalizeMode"],
    template: '<div class="report-result-table-stub"></div>',
  },
}));

import ReportResultTableCard from "@/components/ReportResultTableCard.vue";

function mountCard(propsData = {}) {
  return shallowMount(ReportResultTableCard, {
    propsData: {
      showTitle: true,
      ...propsData,
    },
    stubs: ["normalize-mode-select", "v-card", "v-card-subtitle"],
  });
}

describe("ReportResultTableCard", () => {
  it("shows the normalize toggle in the header when the table can normalize", async () => {
    const wrapper = mountCard();
    const table = wrapper.findComponent({ name: "ReportResultTable" });

    table.vm.$emit("normalize-availability-change", { total: true, group: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="normalizeModeSelect"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Report Data");
  });

  it("hides the normalize toggle when the table cannot normalize", async () => {
    const wrapper = mountCard();
    const table = wrapper.findComponent({ name: "ReportResultTable" });

    table.vm.$emit("normalize-availability-change", { total: true, group: true });
    await wrapper.vm.$nextTick();
    table.vm.$emit("normalize-availability-change", { total: false, group: false });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="normalizeModeSelect"]').exists()).toBe(false);
  });

  it("falls back to totals mode when group normalization becomes unavailable", async () => {
    const wrapper = mountCard();
    const table = wrapper.findComponent({ name: "ReportResultTable" });

    table.vm.$emit("normalize-availability-change", { total: true, group: true });
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).normalizeMode = "group";

    table.vm.$emit("normalize-availability-change", { total: true, group: false });
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).normalizeMode).toBe("total");
  });
});
