<template>
  <v-overlay :value="showLoadingOverlay">
    <div class="d-flex justify-center mt-5">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </div>
    <div class="d-flex justify-center mt-5">
      <v-btn icon @click="closeLoadingOverlay">
        <v-icon x-large>close</v-icon>
      </v-btn>
    </div>
    <div class="d-flex justify-center mt-5">Status: {{ reportState }}</div>
  </v-overlay>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';
import { readExplorerShowLoadingOverlay, readExplorerReportState } from '@/store/main/getters';
import { dispatchExplorerCloseLoadingOverlay, dispatchCancelReport } from '@/store/main/actions';

@Component
export default class ReportLoadingOverlay extends Vue {
  get showLoadingOverlay() {
    return readExplorerShowLoadingOverlay(this.$store);
  }

  get reportState() {
    return readExplorerReportState(this.$store);
  }

  closeLoadingOverlay() {
    dispatchCancelReport(this.$store);
    dispatchExplorerCloseLoadingOverlay(this.$store);
  }
}
</script>
