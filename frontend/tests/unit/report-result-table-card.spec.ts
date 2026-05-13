import { shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ReportResultTable.vue", () => ({
  default: {
    name: "ReportResultTable",
    props: ["showNormalizedValues"],
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
    stubs: ["v-card", "v-card-subtitle", "v-switch"],
  });
}

describe("ReportResultTableCard", () => {
  it("shows the normalize toggle in the header when the table can normalize", async () => {
    const wrapper = mountCard();
    const table = wrapper.findComponent({ name: "ReportResultTable" });

    table.vm.$emit("normalize-availability-change", true);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="normalizeToggle"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Report Data");
  });

  it("hides the normalize toggle when the table cannot normalize", async () => {
    const wrapper = mountCard();
    const table = wrapper.findComponent({ name: "ReportResultTable" });

    table.vm.$emit("normalize-availability-change", true);
    await wrapper.vm.$nextTick();
    table.vm.$emit("normalize-availability-change", false);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="normalizeToggle"]').exists()).toBe(false);
  });
});
