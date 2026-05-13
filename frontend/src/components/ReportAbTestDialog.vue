<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent scrollable :max-width="breakpointSmOrLess ? '96%' : '760px'">
      <v-card class="report-ab-test-dialog__card">
        <v-card-title class="pb-2">
          <span class="headline">AB Analysis</span>
        </v-card-title>
        <v-card-text class="report-ab-test-dialog__body">
          <v-container class="pa-0">
            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="config.armDimension"
                  :items="dimensionOptions"
                  item-text="display_name"
                  item-value="name"
                  label="Arm Dimension"
                  @change="handleArmDimensionChange"
                ></v-select>
              </v-col>
              <v-col cols="12" md="4">
                <v-autocomplete
                  v-model="config.controlValue"
                  :items="armValueOptions"
                  item-text="display_name"
                  item-value="value"
                  label="Control Value"
                  clearable
                  @change="clearResult"
                ></v-autocomplete>
              </v-col>
              <v-col cols="12" md="4">
                <v-autocomplete
                  v-model="config.variantValue"
                  :items="armValueOptions"
                  item-text="display_name"
                  item-value="value"
                  label="Variant Value"
                  clearable
                  @change="clearResult"
                ></v-autocomplete>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="config.trialsMetric"
                  :items="metricOptions"
                  item-text="display_name"
                  item-value="name"
                  label="Trials Metric"
                  @change="clearResult"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="config.successMetric"
                  :items="metricOptions"
                  item-text="display_name"
                  item-value="name"
                  label="Successes Metric"
                  @change="clearResult"
                ></v-select>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="config.targetProbability"
                  label="Target Posterior"
                  type="number"
                  min="0.5"
                  max="0.999"
                  step="0.01"
                  hint="Probability threshold for the variant to be considered ahead"
                  persistent-hint
                  @change="clearResult"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="config.step"
                  label="Extra Trial Step"
                  type="number"
                  min="1"
                  hint="Granularity when projecting additional trials per arm"
                  persistent-hint
                  @change="clearResult"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="config.draws"
                  label="Posterior Draws"
                  type="number"
                  min="1000"
                  step="1000"
                  hint="Monte Carlo samples used for the posterior estimate"
                  persistent-hint
                  @change="clearResult"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>

          <v-alert v-if="configMessage" dense outlined type="warning" class="mt-2 mb-0">
            {{ configMessage }}
          </v-alert>

          <v-alert v-if="errorMessage" dense outlined type="error" class="mt-4 mb-0">
            {{ errorMessage }}
          </v-alert>

          <v-card v-if="result" ref="resultsCard" outlined class="mt-4 pa-4 report-ab-test-dialog__results">
            <v-row>
              <v-col cols="12" md="4">
                <div class="text-overline">P(variant &gt; control)</div>
                <div class="text-subtitle-1 font-weight-bold">{{ formatPercent(result.probabilityVariantBetter) }}</div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-overline">Observed Lift</div>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ formatSignedPercent(result.observedAbsoluteLift) }}
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-overline">95% Credible Interval</div>
                <div class="text-subtitle-1">
                  {{ formatSignedPercent(result.credibleIntervalLower) }} to
                  {{ formatSignedPercent(result.credibleIntervalUpper) }}
                </div>
              </v-col>
            </v-row>

            <v-simple-table dense class="mt-4">
              <thead>
                <tr>
                  <th>Arm</th>
                  <th>Rows</th>
                  <th>Trials</th>
                  <th>Successes</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Control ({{ formatValue(result.control.value) }})</td>
                  <td>{{ formatInteger(result.control.matchedRows) }}</td>
                  <td>{{ formatInteger(result.control.trials) }}</td>
                  <td>{{ formatInteger(result.control.successes) }}</td>
                  <td>{{ formatPercent(result.control.rate) }}</td>
                </tr>
                <tr>
                  <td>Variant ({{ formatValue(result.variant.value) }})</td>
                  <td>{{ formatInteger(result.variant.matchedRows) }}</td>
                  <td>{{ formatInteger(result.variant.trials) }}</td>
                  <td>{{ formatInteger(result.variant.successes) }}</td>
                  <td>{{ formatPercent(result.variant.rate) }}</td>
                </tr>
              </tbody>
            </v-simple-table>

            <div class="mt-4 text-subtitle-2">Additional Trials</div>
            <div v-if="result.additionalTrialsPerArm === 0" class="mt-1">
              Already above the {{ formatPercent(result.targetProbability) }} posterior target.
            </div>
            <div v-else-if="result.additionalTrialsPerArm !== null" class="mt-1">
              {{ formatInteger(result.additionalTrialsPerArm) }} extra trials per arm projected to reach
              {{ formatPercent(result.targetProbability) }} with posterior
              {{ formatPercent(result.additionalTrialsProbability || 0) }}.
            </div>
            <div v-else class="mt-1">
              {{ result.additionalTrialsReason }}
              <template v-if="result.additionalTrialsProbability !== null">
                Final projected posterior: {{ formatPercent(result.additionalTrialsProbability) }}.
              </template>
            </div>

            <div class="mt-4 text-caption grey--text text--darken-1">
              {{ formatInteger(result.rowsMatched) }} matched rows used from
              {{ formatInteger(result.rowsConsidered) }} visible rows.
              <template v-if="result.skippedRollupRows">
                {{ formatInteger(result.skippedRollupRows) }} rollup rows ignored.
              </template>
              <template v-if="result.skippedInvalidRows">
                {{ formatInteger(result.skippedInvalidRows) }} rows skipped for non-numeric metrics.
              </template>
              {{ formatInteger(result.draws) }} posterior draws.
            </div>
          </v-card>
        </v-card-text>
        <v-card-actions class="report-ab-test-dialog__actions">
          <v-spacer></v-spacer>
          <v-btn color="grey darken-3" text @click="dialog = false">Close</v-btn>
          <v-btn color="grey darken-3" text :loading="isAnalyzing" :disabled="!!configMessage" @click="requestAnalysis">
            Analyze
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import ReportManagerMixin from "@/components/mixins/ReportManagerMixin.vue";
import {
  ReportAbTestConfig,
  ReportAbTestResult,
  analyzeReportAbTestRows,
  defaultReportAbTestConfig,
  normalizeReportAbTestConfig,
  serializeReportAbTestConfig,
} from "@/abTest";

@Component
export default class ReportAbTestDialog extends Mixins(ReportManagerMixin) {
  private dialog: boolean = false;
  private isAnalyzing: boolean = false;
  private errorMessage: string = "";
  private availableRows: any[] = [];
  private config: ReportAbTestConfig = defaultReportAbTestConfig();
  private result: ReportAbTestResult | null = null;

  @Watch("dialog")
  onDialogChanged(value: boolean) {
    this.$emit("visibility-change", value);
  }

  open(prefill = {}, rows = []) {
    this.availableRows = cloneRows(rows);
    this.loadConfig(Object.assign({}, this.readConfig() || {}, prefill || {}));
    this.dialog = true;
  }

  close() {
    this.dialog = false;
  }

  loadConfig(config) {
    this.config = normalizeReportAbTestConfig(config || {});
    this.syncSelectedArmValues();
    this.clearResult();
  }

  readConfig() {
    return serializeReportAbTestConfig(this.config);
  }

  hasCompleteConfig() {
    return !this.configMessage;
  }

  requestAnalysis() {
    this.$emit("analyze");
  }

  async runAnalysis(rows = []) {
    this.availableRows = cloneRows(rows);
    this.syncSelectedArmValues();
    this.errorMessage = "";
    this.result = null;

    if (this.configMessage) {
      this.errorMessage = this.configMessage;
      return;
    }

    this.isAnalyzing = true;
    await this.$nextTick();

    try {
      this.config = normalizeReportAbTestConfig(this.config);
      this.result = analyzeReportAbTestRows(
        this.availableRows,
        this.config,
        this.reportDisplayNameMap as Record<string, string>,
        this.rollupMarker
      );
      await this.$nextTick();
      this.scrollResultsIntoView();
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = String(error);
      }
    } finally {
      this.isAnalyzing = false;
    }
  }

  clearResult() {
    this.errorMessage = "";
    this.result = null;
  }

  scrollResultsIntoView() {
    const resultsCard = this.$refs.resultsCard as any;
    const element = resultsCard?.$el || resultsCard;
    if (!element || typeof element.scrollIntoView !== "function") {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  handleArmDimensionChange() {
    this.config.controlValue = null;
    this.config.variantValue = null;
    this.clearResult();
  }

  syncSelectedArmValues() {
    const validValues = new Set(this.armValueOptions.map((option) => option.key));
    if (this.config.controlValue !== null && !validValues.has(getValueKey(this.config.controlValue))) {
      this.config.controlValue = null;
    }
    if (this.config.variantValue !== null && !validValues.has(getValueKey(this.config.variantValue))) {
      this.config.variantValue = null;
    }
  }

  get breakpointSmOrLess() {
    return this.$vuetify.breakpoint.xs || this.$vuetify.breakpoint.sm;
  }

  get configMessage() {
    if (!this.hasReportData()) {
      return "Run a report first, then analyze the current visible table rows.";
    }
    if (!this.config.armDimension) {
      return "Choose the dimension that identifies the control and variant arms.";
    }
    if (!this.armValueOptions.length) {
      return "No visible arm values were found for the selected dimension.";
    }
    if (this.config.controlValue === null || this.config.variantValue === null) {
      return "Choose both the control value and the variant value.";
    }
    if (this.config.controlValue === this.config.variantValue) {
      return "Control and variant values must be different.";
    }
    if (!this.config.trialsMetric || !this.config.successMetric) {
      return "Choose the trials metric and the successes metric.";
    }
    const normalized = normalizeReportAbTestConfig(this.config);
    if (normalized.targetProbability <= 0 || normalized.targetProbability >= 1) {
      return "Target posterior must be between 0 and 1.";
    }
    return null;
  }

  get dimensionOptions() {
    return this.reportDimensions.map((name, index) => ({
      name,
      display_name: this.reportDimensionsDisplay[index] || (this.fieldDefFromName(name) || {}).display_name || name,
    }));
  }

  get metricOptions() {
    return this.reportResultMetrics.map((name, index) => ({
      name,
      display_name: this.reportResultMetricsDisplay[index] || (this.fieldDefFromName(name) || {}).display_name || name,
    }));
  }

  get armValueOptions() {
    if (!this.config.armDimension) {
      return [];
    }

    const displayName =
      (this.reportDisplayNameMap as Record<string, string>)[this.config.armDimension] || this.config.armDimension;
    const uniqueValues = new Map<string, any>();

    for (const row of this.availableRows) {
      if (!row || row._isRollup) {
        continue;
      }
      const value = row[displayName];
      if (value === this.rollupMarker) {
        continue;
      }
      const key = getValueKey(value);
      if (!uniqueValues.has(key)) {
        uniqueValues.set(key, {
          key,
          value,
          display_name: this.formatValue(value),
        });
      }
    }

    this.addSelectedArmValueOption(uniqueValues, this.config.controlValue);
    this.addSelectedArmValueOption(uniqueValues, this.config.variantValue);

    return Array.from(uniqueValues.values()).sort((left, right) =>
      left.display_name.localeCompare(right.display_name, undefined, { numeric: true, sensitivity: "base" })
    );
  }

  addSelectedArmValueOption(uniqueValues, value) {
    if (value === null || value === undefined) {
      return;
    }

    const key = getValueKey(value);
    if (uniqueValues.has(key)) {
      return;
    }

    uniqueValues.set(key, {
      key,
      value,
      display_name: this.formatValue(value),
    });
  }

  formatValue(value) {
    if (value === null || value === undefined || value === "") {
      return "(blank)";
    }
    return String(value);
  }

  formatPercent(value) {
    return `${(value * 100).toFixed(2)}%`;
  }

  formatSignedPercent(value) {
    const percent = value * 100;
    if (percent > 0) {
      return `+${percent.toFixed(2)}%`;
    }
    return `${percent.toFixed(2)}%`;
  }

  formatInteger(value) {
    return Number(value || 0).toLocaleString();
  }
}

function cloneRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => Object.assign({}, row));
}

function getValueKey(value) {
  if (value === undefined) {
    return "__undefined__";
  }
  return JSON.stringify(value);
}
</script>

<style>
.report-ab-test-dialog__card {
  display: flex;
  flex-direction: column;
  width: min(760px, calc(100vw - 24px));
  max-width: 100%;
  max-height: calc(100dvh - 24px);
}

.report-ab-test-dialog__body {
  overflow-y: auto;
}

.report-ab-test-dialog__actions {
  flex-shrink: 0;
  background: white;
}

.report-ab-test-dialog__results {
  border-color: rgba(0, 0, 0, 0.12) !important;
}

@media (max-width: 600px) {
  .report-ab-test-dialog__card {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }
}
</style>
