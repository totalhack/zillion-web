<template>
  <v-card class="report-result-graph-card">
    <div
      v-if="showTitle || showSeriesSearchInput"
      class="report-result-graph-card__header"
      :class="{ 'report-result-graph-card__header--titleless': !showTitle }"
    >
      <span v-if="showTitle" class="text-subtitle-2">Report Graph</span>
      <input
        v-if="showSeriesSearchInput"
        v-model="draftSeriesSearchTerm"
        class="report-result-graph-card__search"
        data-cy="graphLegendSearch"
        placeholder="Filter Chart"
        type="search"
        @input="handleSeriesSearchInput"
        @keydown.enter="applySeriesSearchTerm"
      />
    </div>
    <v-card-text class="px-0 pb-4 report-result-graph-card__body">
      <report-result-graph
        ref="reportResultGraph"
        :graph-options="graphOptions"
        :result-layout="resultLayout"
        :series-search-term="appliedSeriesSearchTerm"
        :tab="tab"
        @update:seriesSearchTerm="handleSeriesSearchTermUpdate"
        v-on:legend-label-count-change="updateLegendLabelCount"
        v-on:complete="emitComplete"
      ></report-result-graph>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import ReportResultGraph from "@/components/ReportResultGraph.vue";

@Component({
  components: { ReportResultGraph },
})
export default class ReportResultGrapheCard extends Vue {
  @Prop({ type: Object, default: { graphType: null, multiAxis: false, logYScale: false } }) graphOptions!: object;
  @Prop({ default: null }) resultLayout!: string | null;
  @Prop({ default: null }) tab!: string | null;
  @Prop({ default: true }) showTitle!: boolean;

  private appliedSeriesSearchTerm: string = "";
  private draftSeriesSearchTerm: string = "";
  private legendLabelCount: number = 0;

  get reportResultGraph() {
    return (this.$refs.reportResultGraph as any) || null;
  }

  get showSeriesSearchInput() {
    return this.legendLabelCount > 4;
  }

  updateLegendLabelCount(count: number) {
    const showSeriesSearchInput = this.showSeriesSearchInput;
    this.legendLabelCount = Number.isFinite(count) ? count : 0;

    if (!this.showSeriesSearchInput) {
      this.handleSeriesSearchTermUpdate("");
    }

    if (showSeriesSearchInput !== this.showSeriesSearchInput) {
      this.$nextTick(() => {
        this.reportResultGraph?.resize?.();
      });
    }
  }

  applySeriesSearchTerm() {
    this.appliedSeriesSearchTerm = this.draftSeriesSearchTerm;
  }

  handleSeriesSearchInput() {
    if (this.draftSeriesSearchTerm === "") {
      this.appliedSeriesSearchTerm = "";
    }
  }

  handleSeriesSearchTermUpdate(value: string) {
    this.appliedSeriesSearchTerm = value;
    this.draftSeriesSearchTerm = value;
  }

  emitComplete(e) {
    this.$emit("complete");
  }
}
</script>

<style scoped>
.report-result-graph-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.report-result-graph-card__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 12px 16px 8px;
}

.report-result-graph-card__header--titleless {
  justify-content: flex-end;
  padding-top: 8px;
}

.report-result-graph-card__search {
  border: 1px solid rgba(39, 39, 39, 0.18);
  border-radius: 6px;
  box-sizing: border-box;
  color: #272727;
  font: 500 13px Helvetica;
  height: 34px;
  max-width: 100%;
  min-width: 0;
  padding: 0 12px;
  width: 220px;
}

.report-result-graph-card__search:focus {
  outline: 1px solid rgba(39, 39, 39, 0.35);
}

.report-result-graph-card__body {
  flex: 1 1 auto;
  min-height: 0;
}

@media (min-width: 960px) {
  .report-result-graph-card__header {
    flex-wrap: nowrap;
  }
}

@media (max-width: 959px) {
  .report-result-graph-card__header {
    align-items: stretch;
  }

  .report-result-graph-card__search {
    margin-left: 0;
    width: 100%;
  }
}
</style>
