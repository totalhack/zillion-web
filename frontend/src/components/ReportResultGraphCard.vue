<template>
  <v-card>
    <v-card-subtitle v-if="showTitle" class="pt-3 pb-1">
      <span class="text-subtitle-2">Report Graph</span>
    </v-card-subtitle>
    <v-card-text class="px-0 pb-4" style="height:96%">
      <report-result-graph
        ref="reportResultGraph"
        :graph-options="graphOptions"
        :result-layout="resultLayout"
        :tab="tab"
        v-on:complete="emitComplete"
      ></report-result-graph>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import ReportResultGraph from '@/components/ReportResultGraph.vue';

@Component({
  components: { ReportResultGraph }
})
export default class ReportResultGrapheCard extends Vue {
  @Prop({ type: Object, default: { graphType: null, multiAxis: false, logYScale: false } }) graphOptions!: object;
  @Prop({ default: null }) resultLayout!: string | null;
  @Prop({ default: null }) tab!: string | null;
  @Prop({ default: true }) showTitle!: boolean;

  emitComplete(e) {
    this.$emit('complete');
  }
}
</script>