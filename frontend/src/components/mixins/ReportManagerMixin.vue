<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import WarehouseManagerMixin from '@/components/mixins/WarehouseManagerMixin.vue';
import {
  readReportRequest,
  readReportResult
} from '@/store/main/getters';

@Component
export default class ReportManagerMixin extends WarehouseManagerMixin {
  get reportResult() {
    return readReportResult(this.$store);
  }

  get reportRequest() {
    return readReportRequest(this.$store);
  }

  get reportIsPartial() {
    return this.reportResult?.is_partial || false;
  }

  get reportUnsupportedGrainMetrics() {
    return this.reportResult?.unsupported_grain_metrics || {};
  }

  get reportDisplayNameMap() {
    return this.reportResult?.display_name_map || {};
  }

  get reportReverseDisplayNameMap() {
    return Object.assign({}, ...Object.entries(this.reportDisplayNameMap).map(([a, b]) => ({ [b]: a })));
  }

  get reportColumns() {
    if (this.reportResult != null) {
      return this.reportResult.columns;
    }
    return [];
  }

  get rollupMarker() {
    return this.reportResult?.rollup_marker;
  }

  get reportMetrics() {
    let metrics: string[] = [];
    if (this.reportRequest != null) {
      metrics = this.reportRequest?.metrics || [];
    }
    return metrics;
  }

  get reportMetricsDisplay() {
    let metrics: string[] = [];
    if (this.reportRequest != null) {
      metrics = this.getFieldsDisplay(
        this.reportRequest?.metrics || [], this.reportDisplayNameMap
      );
    }
    return metrics;
  }

  get reportResultMetrics() {
    let metrics: string[] = [];
    if (this.reportRequest != null) {
      if (this.reportIsPartial) {
        for (const metric of (this.reportRequest?.metrics || [])) {
          if (metric in this.reportUnsupportedGrainMetrics) {
            continue;
          }
          metrics.push(metric);
        }
      } else {
        metrics = this.reportRequest?.metrics || [];
      }
    }
    return metrics;
  }

  get reportResultMetricsDisplay() {
    const metrics = this.reportResultMetrics;
    return this.getFieldsDisplay(metrics, this.reportDisplayNameMap);
  }

  get reportDimensions() {
    let dims: string[] = [];
    if (this.reportRequest != null) {
      dims = this.reportRequest?.dimensions || [];
    }
    return dims;
  }

  get reportDimensionsDisplay() {
    let dims: string[] = [];
    if (this.reportRequest != null) {
      dims = this.getFieldsDisplay(
        this.reportRequest?.dimensions || [], this.reportDisplayNameMap
      );
    }
    return dims;
  }

  hasReportData() {
    if (this.reportResult && this.reportResult.data && this.reportResult.data.length) {
      return true;
    }
    return false;
  }

  isRollupRow(row) {
    const dimCount = this.reportDimensions.length;
    for (let j = 0; j < dimCount; j++) {
      if (row[j] === this.rollupMarker) {
        return true;
      }
    }
    return false;
  }

  getFieldsDisplay(fields, nameMap) {
    const result: string[] = [];
    for (const field of fields) {
      let fieldName: string;
      if (typeof field === 'string') {
        fieldName = field;
      } else {
        // Assume it's an object field def
        fieldName = field.name;
      }
      result.push(nameMap[fieldName]);
    }
    return result;
  }

}
</script>