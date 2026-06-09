<template>
  <v-overlay :value="showLoadingOverlay">
    <div class="report-loading-overlay pa-4">
      <div class="d-flex justify-center mt-5">
        <v-progress-circular :indeterminate="reportProgress === null" :value="reportProgress || 0" size="64" width="6">
          <span v-if="reportProgress !== null" class="report-loading-overlay__progress">{{ reportProgress }}%</span>
        </v-progress-circular>
      </div>
      <div class="d-flex justify-center mt-5">
        <v-btn icon @click="closeLoadingOverlay">
          <v-icon x-large>close</v-icon>
        </v-btn>
      </div>
      <div class="d-flex justify-center mt-5 report-loading-overlay__status">
        <div>
          <div class="report-loading-overlay__status-label">Status: {{ reportStatusLabel }}</div>
          <div v-if="reportStatusDetail" class="report-loading-overlay__status-detail">{{ reportStatusDetail }}</div>
        </div>
      </div>
    </div>
  </v-overlay>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import {
  readExplorerShowLoadingOverlay,
  readExplorerReportProgress,
  readExplorerReportState,
} from "@/store/main/getters";
import { dispatchExplorerCloseLoadingOverlay, dispatchCancelReport } from "@/store/main/actions";

@Component
export default class ReportLoadingOverlay extends Vue {
  get showLoadingOverlay() {
    return readExplorerShowLoadingOverlay(this.$store);
  }

  get reportState() {
    return readExplorerReportState(this.$store);
  }

  get reportProgress() {
    return readExplorerReportProgress(this.$store);
  }

  get reportStatusParts() {
    const match = this.reportState.match(/^(Pulling (?:window|historical period)\s+\d+\/\d+):\s*(.+)$/);
    if (!match) {
      return { detail: null, label: this.reportState };
    }

    return {
      detail: match[2],
      label: match[1],
    };
  }

  get reportStatusLabel() {
    return this.reportStatusParts.label;
  }

  get reportStatusDetail() {
    return this.reportStatusParts.detail;
  }

  closeLoadingOverlay() {
    dispatchCancelReport(this.$store);
    dispatchExplorerCloseLoadingOverlay(this.$store);
  }
}
</script>

<style scoped>
.report-loading-overlay {
  width: min(320px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
}

.report-loading-overlay__status {
  text-align: center;
}

.report-loading-overlay__status-label,
.report-loading-overlay__status-detail {
  display: block;
}

.report-loading-overlay__status-detail {
  margin-top: 0.25rem;
  overflow-wrap: anywhere;
}

.report-loading-overlay__progress {
  font-size: 0.875rem;
}
</style>
