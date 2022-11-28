<template>
  <v-card>
    <v-card-subtitle v-if="showTitle" class="pt-3 pb-1">
      <span class="text-subtitle-2">Report Data</span>
    </v-card-subtitle>
    <report-result-table @addPartitionFromDimension="addPartitionFromDimension"
      @addCriteriaFromDimension="addCriteriaFromDimension" class="pt-2 px-2" ref="reportResultTable">
    </report-result-table>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import ReportResultTable from '@/components/ReportResultTable.vue';

@Component({
  components: { ReportResultTable }
})
export default class ReportResultTableCard extends Vue {
  @Prop({ default: true }) showTitle!: boolean;

  addCriteriaFromDimension(context) {
    this.$emit('addCriteriaFromDimension', context);
  }

  addPartitionFromDimension(context) {
    this.$emit('addPartitionFromDimension', context);
  }


  getActiveData() {
    return (this.$refs.reportResultTable as any).getActiveData();
  }

  getActiveDataString() {
    return (this.$refs.reportResultTable as any).getActiveDataString();
  }
}
</script>