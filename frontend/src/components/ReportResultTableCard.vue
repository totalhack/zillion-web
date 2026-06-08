<template>
  <v-card class="report-result-table-card">
    <v-card-subtitle v-if="showTitle || canNormalize" class="pt-3 pb-1 report-result-table-card__header">
      <span v-if="showTitle" class="text-subtitle-2">Report Data</span>
      <div
        v-if="canNormalize"
        class="report-result-table-card__normalize-control mt-0 pt-0"
        data-cy="normalizeModeSelect"
      >
        <span class="text-subtitle-2 report-result-table-card__normalize-label">Normalize</span>
        <normalize-mode-select
          v-model="normalizeMode"
          :allow-total="normalizeAvailability.total"
          :allow-group="normalizeAvailability.group"
        ></normalize-mode-select>
      </div>
    </v-card-subtitle>
    <report-result-table
      @addPartitionFromDimension="addPartitionFromDimension"
      @addCriteriaFromDimension="addCriteriaFromDimension"
      @normalize-availability-change="updateNormalizeAvailability"
      @setAbControlFromDimension="setAbControlFromDimension"
      @setAbVariantFromDimension="setAbVariantFromDimension"
      class="pt-2 px-2"
      :normalize-mode.sync="normalizeMode"
      ref="reportResultTable"
    >
    </report-result-table>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import NormalizeModeSelect from "@/components/NormalizeModeSelect.vue";
import ReportResultTable from "@/components/ReportResultTable.vue";

@Component({
  components: { NormalizeModeSelect, ReportResultTable },
})
export default class ReportResultTableCard extends Vue {
  @Prop({ default: true }) showTitle!: boolean;

  private normalizeAvailability = {
    total: false,
    group: false,
  };
  private normalizeMode: string | null = null;

  get canNormalize() {
    return this.normalizeAvailability.total || this.normalizeAvailability.group;
  }

  updateNormalizeAvailability(value: boolean) {
    const nextAvailability =
      value && typeof value === "object"
        ? {
            total: !!(value as any).total,
            group: !!(value as any).group,
          }
        : {
            total: !!value,
            group: false,
          };

    this.normalizeAvailability = nextAvailability;

    if (!this.canNormalize) {
      this.normalizeMode = null;
      return;
    }

    if (this.normalizeMode === "group" && !this.normalizeAvailability.group) {
      this.normalizeMode = this.normalizeAvailability.total ? "total" : null;
    }

    if (this.normalizeMode === "total" && !this.normalizeAvailability.total) {
      this.normalizeMode = null;
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

.report-result-table-card__normalize-control {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.report-result-table-card__normalize-label {
  margin: 0;
}
</style>
