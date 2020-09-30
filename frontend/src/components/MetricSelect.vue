<template>
  <div>
    <draggable-multi-select
      ref="multiselect"
      :raw-options-map="rawOptionsMap"
      default-group="Metrics"
      placeholder="Select Metrics"
      created-options-group="Ad Hoc Metrics"
      tag-placeholder="Press enter to create a metric"
      :taggable="true"
      @tag="openAdHocMetricDialog"
    ></draggable-multi-select>
    <ad-hoc-metric-dialog @input="addAdHocMetric($event)" ref="adHocMetricDialog"></ad-hoc-metric-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { readMetrics } from '@/store/main/getters';
import DraggableMultiSelect from './DraggableMultiSelect.vue';
import AdHocMetricDialog from './AdHocMetricDialog.vue';

@Component({
  components: {
    DraggableMultiSelect,
    AdHocMetricDialog,
  },
})
export default class MetricSelect extends Vue {
  get rawOptionsMap() {
    return readMetrics(this.$store);
  }

  get selected() {
    return (this.$refs.multiselect as any).selected;
  }

  set selected(selectedList) {
    (this.$refs.multiselect as any).selected = selectedList;
  }

  openAdHocMetricDialog(adHocMetricName) {
    const ms = this.$refs.multiselect as any;
    if (ms.hasCreatedOption(adHocMetricName)) {
      return;
    }
    (this.$refs.adHocMetricDialog as any).open(adHocMetricName);
  }

  addAdHocMetric(metric) {
    (this.$refs.multiselect as any).addCreatedOption(metric);
  }
}
</script>
