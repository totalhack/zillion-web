<template>
  <v-card class="report-result-table-card">
    <v-card-subtitle v-if="showTitle || canNormalize" class="pt-3 pb-1 report-result-table-card__header">
      <span v-if="showTitle" class="text-subtitle-2">Report Data</span>
      <v-switch
        v-if="canNormalize"
        v-model="showNormalizedValues"
        class="report-result-table-card__normalize-toggle mt-0 pt-0"
        color="grey darken-3"
        data-cy="normalizeToggle"
        dense
        hide-details
        inset
        label="Normalize"
      ></v-switch>
    </v-card-subtitle>
    <report-result-table
      @addPartitionFromDimension="addPartitionFromDimension"
      @addCriteriaFromDimension="addCriteriaFromDimension"
      @normalize-availability-change="updateNormalizeAvailability"
      @setAbControlFromDimension="setAbControlFromDimension"
      @setAbVariantFromDimension="setAbVariantFromDimension"
      class="pt-2 px-2"
      :show-normalized-values.sync="showNormalizedValues"
      ref="reportResultTable"
    >
    </report-result-table>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import ReportResultTable from "@/components/ReportResultTable.vue";

@Component({
  components: { ReportResultTable },
})
export default class ReportResultTableCard extends Vue {
  @Prop({ default: true }) showTitle!: boolean;

  private canNormalize = false;
  private showNormalizedValues = false;

  updateNormalizeAvailability(value: boolean) {
    this.canNormalize = !!value;

    if (!this.canNormalize) {
      this.showNormalizedValues = false;
    }
  }

  addCriteriaFromDimension(context) {
    this.$emit("addCriteriaFromDimension", context);
  }

  addPartitionFromDimension(context) {
    this.$emit("addPartitionFromDimension", context);
  }

  setAbControlFromDimension(context) {
    this.$emit("setAbControlFromDimension", context);
  }

  setAbVariantFromDimension(context) {
    this.$emit("setAbVariantFromDimension", context);
  }

  getActiveRows() {
    return (this.$refs.reportResultTable as any).getActiveRows();
  }

  getActiveData() {
    return (this.$refs.reportResultTable as any).getActiveData();
  }

  getActiveDataString() {
    return (this.$refs.reportResultTable as any).getActiveDataString();
  }
}
</script>

<style scoped>
.report-result-table-card__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

@media (max-width: 959px) {
  .report-result-table-card__header {
    align-items: flex-start;
    justify-content: flex-start;
  }
}
</style>
