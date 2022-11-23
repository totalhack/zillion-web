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
      return;
    }
    ms.addCreatedOption(metric);
  }

  handleTagDblClick({ option, event }) {
    if (option.group && option.group === this.createdOptionsGroup) {
      (this.$refs.adHocMetricDialog as any).open(option);
    } else {
      (this.$refs.adHocMetricDialog as any).open(option);
    }
  }
}
</script>
