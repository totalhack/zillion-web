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

  it("does not apply the header filter term until Enter is pressed", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-cy="graphLegendSearch"]').setValue("ctr");

    expect(graph.props("seriesSearchTerm")).toBe("");
  });

  it("passes the header filter term through to the graph component on Enter", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();

    const searchInput = wrapper.find('[data-cy="graphLegendSearch"]');
    await searchInput.setValue("ctr");
    await searchInput.trigger("keydown.enter");

    expect(graph.props("seriesSearchTerm")).toBe("ctr");
  });

  it("clears the applied filter immediately when the input is emptied", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();

    const searchInput = wrapper.find('[data-cy="graphLegendSearch"]');
    await searchInput.setValue("ctr");
    await searchInput.trigger("keydown.enter");
    expect(graph.props("seriesSearchTerm")).toBe("ctr");

    await searchInput.setValue("");

    expect(graph.props("seriesSearchTerm")).toBe("");
  });

  it("clears the filter when legend labels drop back to four or fewer", async () => {
    const wrapper = mountCard();
    const graph = wrapper.findComponent({ name: "ReportResultGraph" });

    graph.vm.$emit("legend-label-count-change", 5);
    await wrapper.vm.$nextTick();
    const searchInput = wrapper.find('[data-cy="graphLegendSearch"]');
    await searchInput.setValue("ctr");
    await searchInput.trigger("keydown.enter");

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
