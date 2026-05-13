<template>
  <div v-if="reportQueryCount" class="query-summaries">
    <span class="mx-2 text-subtitle-2 hidden-sm-and-down">{{ reportRowCount }} rows in {{ reportDuration }}s</span>
    <v-dialog v-model="dialog" scrollable :max-width="breakpointSmOrLess ? '96%' : '70%'">
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          :class="
            breakpointSmOrLess ? 'query-summaries__mobile-btn' : 'query-summaries__desktop-btn hidden-sm-and-down'
          "
          :small="breakpointSmOrLess"
          :text="breakpointSmOrLess"
          v-bind="attrs"
          v-on="on"
        >
          <span v-if="breakpointSmOrLess" class="query-summaries__mobile-label">SQL</span>
          <span v-else style="line-height: 1.375rem; color: white" class="text-subtitle-2">
            SQL
            <v-icon right>keyboard_arrow_up</v-icon>
          </span>
        </v-btn>
      </template>
      <v-card class="pa-2">
        <v-card-title
          >Query Details
          <v-spacer></v-spacer>
          <v-card-actions class="mt-4">
            <v-icon @click="dialog = false">close</v-icon>
          </v-card-actions>
        </v-card-title>
        <v-card-text>
          <v-container>
            <pre
              style="font-size: 0.95em"
              class="mx-5"
              :key="index"
              v-for="(summary, index) in querySummaries"
            ><br>{{ summary }}</pre>
          </v-container>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
  <div v-else></div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { readReportResult } from "@/store/main/getters";

@Component
export default class QuerySummaries extends Vue {
  private dialog: boolean = false;

  @Watch("dialog")
  onDialogChanged(value: boolean) {
    this.$emit("visibility-change", value);
  }

  close() {
    this.dialog = false;
  }

  get breakpointSmOrLess() {
    return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm;
  }

  get querySummaries() {
    const reportResult = readReportResult(this.$store);
    return reportResult?.query_summaries;
  }

  get reportRowCount() {
    const reportResult = readReportResult(this.$store);
    return reportResult?.data.length || 0;
  }

  get reportQueryCount() {
    const reportResult = readReportResult(this.$store);
    return reportResult?.query_summaries.length || 0;
  }

  get reportDuration() {
    const reportResult = readReportResult(this.$store);
    return reportResult?.duration || 0;
  }
}
</script>

<style scoped>
.query-summaries {
  display: flex;
  align-items: center;
  min-width: 0;
}

.query-summaries__mobile-btn {
  min-width: 36px !important;
  padding: 0 6px !important;
}

.query-summaries__mobile-label {
  color: white;
  font-size: 12px;
  line-height: 1;
}
</style>
