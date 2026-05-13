import { shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ReportResultGraph.vue", () => ({
  default: {
    name: "ReportResultGraph",
    props: ["graphOptions", "resultLayout", "seriesSearchTerm", "tab"],
    template: '<div class="report-result-graph-stub"></div>',
  },
}));

import ReportResultGraphCard from "@/components/ReportResultGraphCard.vue";

function mountCard(propsData = {}) {
  return shallowMount(ReportResultGraphCard, {
    propsData: {
      graphOptions: { graphType: null, logYScale: false, multiAxis: false },
      resultLayout: null,
      showTitle: true,
      tab: null,
      ...propsData,
    },
    stubs: ["v-card", "v-card-text"],
  });
}

describe("ReportResultGraphCard", () => {
  it("hides the chart filter when there are four or fewer legend labels", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 4);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="graphLegendSearch"]').exists()).toBe(false);
  });

  it("renders the chart filter when there are more than four legend labels", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="graphLegendSearch"]').exists()).toBe(true);
  });

  it("passes the header filter term through to the graph component", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-cy="graphLegendSearch"]').setValue("ctr");

    expect(graph.props("seriesSearchTerm")).toBe("ctr");
  });

  it("clears the filter when legend labels drop back to four or fewer", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-cy="graphLegendSearch"]').setValue("ctr");

    graph.vm.$emit("legend-label-count-change", 4);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="graphLegendSearch"]').exists()).toBe(false);
    expect(graph.props("seriesSearchTerm")).toBe("");
  });

  it("hides the chart filter when legend labels drop to two", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();

    graph.vm.$emit("legend-label-count-change", 2);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-cy="graphLegendSearch"]').exists()).toBe(false);
  });
});
