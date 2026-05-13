<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <v-form ref="form" v-model="valid">
        <v-card>
          <v-card-title>
            <span class="headline">Create Ad Hoc Metric</span>
          </v-card-title>
          <v-card-text>
            <v-container>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    @keydown.space.prevent
                    v-model="name"
                    label="Metric Name*"
                    placeholder="my_metric"
                    hint="allowed: a-zA-Z0-9_"
                    persistent-hint
                    :rules="[rules.required, rules.noSpaces]"
                    required
                    @input="errorMessages = ''"
                  >
                  </v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="displayName"
                    label="Display Name*"
                    placeholder="My Metric"
                    :rules="[rules.required]"
                    required
                    @input="errorMessages = ''"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="formula"
                    label="Metric Formula*"
                    placeholder="{field_x}/{field_y}"
                    hint="A formula in the SQL dialect of the combined layer DB"
                    persistent-hint
                    :rules="[rules.required]"
                    @input="errorMessages = ''"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="aggregation"
                    label="Aggregation*"
                    placeholder="mean"
                    :items="['mean', 'sum', 'min', 'max']"
                    :rules="[rules.required]"
                    hint="Metric rollup method"
                    persistent-hint
                    @input="errorMessages = ''"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="rounding"
                    label="Rounding"
                    placeholder="0"
                    hint="Integer metric precision"
                    persistent-hint
                    @input="errorMessages = ''"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="technical"
                    label="Technical"
                    placeholder="mean(5)"
                    hint="Technical string. See Zillion docs."
                    persistent-hint
                    @input="errorMessages = ''"
                  >
                  </v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="12">
                  <v-select
                    v-model="weightingMetric"
                    label="Weighting Metric"
                    placeholder="sessions"
                    :items="weightingMetricItems"
                    item-text="text"
                    item-value="value"
                    clearable
                    hint="Optional metric used to weight this ad hoc metric"
                    persistent-hint
                    @input="errorMessages = ''"
                  ></v-select>
                </v-col>
              </v-row>
              <small>* Indicates required field</small>
              <v-alert dense text outlined type="error" :value="!!errorMessages">{{ errorMessages }}</v-alert>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="grey darken-3"
              text
              @click="
                dialog = false;
                errorMessages = '';
              "
              >Cancel</v-btn
            >
            <v-btn color="grey darken-3" text @click="addAdHocMetric">Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
  </v-row>
</template>

<script lang="ts">
import { Component, Mixins, Vue } from "vue-property-decorator";
import RulesMixin from "@/components/mixins/RulesMixin.vue";
import { dispatchCheckMetricFormula } from "@/store/main/actions";
import { readMetrics } from "@/store/main/getters";

@Component
export default class AdHocMetricDialog extends Mixins(RulesMixin) {
  private dialog: boolean = false;
  private name: string | null = null;
  private displayName: string | null = null;
  private description: string | null = null;
  private formula: string | null = null;
  private aggregation: string | null = "sum";
  private rounding: number | string | null = null;
  private technical: string | null = null;
  private weightingMetric: string | null = null;

  private valid: boolean = false;
  private errorMessages = "";

  get weightingMetricItems() {
    const items = Object.values(readMetrics(this.$store) || {}).map((metric: any) => ({
      text: metric.display_name,
      value: metric.name,
    }));

    if (this.weightingMetric && !items.find((item) => item.value === this.weightingMetric)) {
      items.push({ text: this.weightingMetric, value: this.weightingMetric });
    }

    return items.sort((left, right) => left.text.localeCompare(right.text));
  }

  clear() {
    this.name = null;
    this.displayName = null;
    this.description = null;
    this.formula = null;
    this.aggregation = "sum";
    this.rounding = null;
    this.technical = null;
    this.weightingMetric = null;
  }

  read() {
    return {
      name: this.name,
      display_name: this.displayName,
      description: this.formula,
      formula: this.formula,
      aggregation: this.aggregation,
      rounding: this.normalizeRounding(),
      technical: this.technical,
      weighting_metric: this.weightingMetric,
      // Not currently configurable by the user
      required_grain: null,
      group: null,
      active: true,
    };
  }

  normalizeRounding() {
    if (this.rounding === null) {
      return null;
    }

    if (typeof this.rounding === "string" && this.rounding.trim() === "") {
      return null;
    }

    const rounding = Number(this.rounding);
    return Number.isFinite(rounding) ? rounding : null;
  }

  buildCheckFormulaPayload() {
    const payload: Record<string, any> = {
      name: this.name,
      formula: this.formula,
      aggregation: this.aggregation,
      display_name: this.displayName,
    };

    const rounding = this.normalizeRounding();
    if (rounding !== null) {
      payload.rounding = rounding;
    }
    if (this.technical) {
      payload.technical = this.technical;
    }
    if (this.weightingMetric) {
      payload.weighting_metric = this.weightingMetric;
    }

    return payload;
  }

  open({
    name,
    display_name,
    description,
    formula,
    aggregation,
    rounding,
    technical,
    weighting_metric,
  }: {
    name?: string | null;
    display_name?: string | null;
    description?: string | null;
    formula?: string | null;
    aggregation?: string | null;
    rounding?: number | string | null;
    technical?: string | null;
    weighting_metric?: string | null;
  }) {
    this.clear();
    if (name) {
      this.name = name;
      this.displayName = name; // Use this as a backup/default
      this.formula = "{" + name + "}";
    }
    if (display_name) {
      this.displayName = display_name;
    }
    if (description) {
      this.description = description;
    }
    if (formula) {
      this.formula = formula;
    }
    if (aggregation) {
      this.aggregation = aggregation;
    }
    if (rounding !== null && rounding !== undefined) {
      if (typeof rounding !== "string" || rounding.trim() !== "") {
        this.rounding = rounding;
      }
    }
    if (technical) {
      this.technical = technical;
    }
    if (weighting_metric) {
      this.weightingMetric = weighting_metric;
    }
    this.dialog = true;
  }

  async addAdHocMetric() {
    (this.$refs.form as any).validate();
    if (!this.valid) {
      return;
    }
    const result = await dispatchCheckMetricFormula(this.$store, this.buildCheckFormulaPayload());
    if (!(result as any).success) {
      const reason = (result as any).reason;
      if (reason) {
        this.errorMessages = reason;
      } else {
        this.errorMessages = "Invalid formula";
      }
      return;
    }
    this.$emit("input", this.read());
    this.dialog = false;
  }
}
</script>
