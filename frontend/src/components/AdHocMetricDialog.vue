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
                    v-model="name"
                    label="Metric Name*"
                    placeholder="my_metric"
                    hint="allowed: a-zA-Z0-9_"
                    persistent-hint
                    :rules="[rules.required, rules.noSpaces]"
                    required
                    @input="errorMessages = ''"
                  ></v-text-field>
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
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="rounding"
                    label="Rounding"
                    placeholder="0"
                    hint="Integer metric precision"
                    persistent-hint
                    @input="errorMessages = ''"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="technical"
                    label="Technical"
                    placeholder="mean(5)"
                    hint="Technical string. See Zillion docs."
                    persistent-hint
                    @input="errorMessages = ''"
                  ></v-text-field>
                </v-col>
              </v-row>
              <small>* Indicates required field</small>
              <v-alert
                dense
                text
                outlined
                type="error"
                :value="!!errorMessages"
                >{{ errorMessages }}</v-alert
              >
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
            <v-btn color="grey darken-3" text @click="addAdHocMetric"
              >Add</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
  </v-row>
</template>

<script lang="ts">
import { Component, Mixins, Vue } from 'vue-property-decorator';
import RulesMixin from '@/components/mixins/RulesMixin.vue';
import { dispatchCheckFormula } from '@/store/main/actions';

@Component
export default class AdHocMetricDialog extends Mixins(RulesMixin) {
  private dialog: boolean = false;
  private name: string | null = null;
  private displayName: string | null = null;
  private description: string | null = null;
  private formula: string | null = null;
  private rounding: number | null = null;
  private technical: string | null = null;

  private valid: boolean = false;
  private errorMessages = '';

  clear() {
    this.name = null;
    this.displayName = null;
    this.description = null;
    this.formula = null;
    this.rounding = null;
    this.technical = null;
  }

  read() {
    return {
      name: this.name,
      display_name: this.displayName,
      description: this.formula,
      formula: this.formula,
      rounding: this.rounding,
      technical: this.technical,
      // Not currently configurable by the user
      required_grain: null,
      group: null,
      active: true,
    };
  }

  open({ name, display_name, description, formula, rounding, technical }) {
    this.clear();
    if (name) {
      this.name = name;
      this.displayName = name; // Use this as a backup/default
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
    if (rounding) {
      this.rounding = rounding;
    }
    if (technical) {
      this.technical = technical;
    }
    this.dialog = true;
  }

  async addAdHocMetric() {
    (this.$refs.form as any).validate();
    if (!this.valid) {
      return;
    }
    const checkFormula = {
      name: this.name,
      formula: this.formula,
      rounding: this.rounding,
      technical: this.technical,
      display_name: this.displayName
    };
    const result = await dispatchCheckFormula(this.$store, checkFormula);
    if (!(result as any).success) {
      const reason = (result as any).reason;
      if (reason) {
        this.errorMessages = reason;
      } else {
        this.errorMessages = 'Invalid formula';
      }
      return;
    }
    this.$emit('input', this.read());
    this.dialog = false;
  }
}
</script>
