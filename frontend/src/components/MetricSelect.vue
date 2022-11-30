<template>
  <div>
    <draggable-multi-select ref="multiselect" :raw-options-map="rawOptionsMap" default-group="Metrics"
      placeholder="Select Metrics" :created-options-group="createdOptionsGroup"
      tag-placeholder="Press enter to create a metric" :taggable="true" @tag="openAdHocMetricDialog"
      @tagDblClick="handleTagDblClick"></draggable-multi-select>
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
  createdOptionsGroup: string = 'Ad Hoc Metrics';

  get rawOptionsMap() {
    return readMetrics(this.$store);
  }

  get selected() {
    return (this.$refs.multiselect as any).selected;
  }

  set selected(selectedList) {
    (this.$refs.multiselect as any).selected = selectedList;
  }

  ensureMetricSelected(metric) {
    let isSelected = false;
    let metricName;

    if (typeof metric === 'string') {
      metricName = metric;
    } else {
      metricName = metric.name;
    }
    for (const selectedMetric of this.selected) {
      if (typeof selectedMetric === 'string' && selectedMetric === metricName) {
        isSelected = true;
        break;
      }
      if (typeof selectedMetric !== 'string' && selectedMetric.name === metricName) {
        isSelected = true;
        break;
      }
    }
    if (!isSelected) {
      const selected = this.selected;
      selected.push(metric);
      this.selected = selected;
    }
  }

  openAdHocMetricDialog(adHocMetricName) {
    const ms = this.$refs.multiselect as any;
    if (ms.hasCreatedOption(adHocMetricName)) {
      return;
    }
    (this.$refs.adHocMetricDialog as any).open({ name: adHocMetricName });
  }

  addAdHocMetric(metric) {
    const ms = this.$refs.multiselect as any;
    if (ms.hasCreatedOption(metric.name)) {
      ms.updateCreatedOption(metric);
    } else {
      ms.addCreatedOption(metric);
    }
    this.ensureMetricSelected(metric);
  }

  handleTagDblClick({ option, event }) {
    (this.$refs.adHocMetricDialog as any).open(option);
  }
}
</script>
