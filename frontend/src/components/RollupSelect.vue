<template>
  <div>
    <v-btn-toggle v-model="rollupMode" dense>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" value="totals">
            <span>Totals</span>
          </v-btn>
        </template>
        <span>A single totals rollup</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" value="numeric" :disabled="!numericOptions.length">
            <span>Levels</span>
          </v-btn>
        </template>
        <span>Roll up a specific number of dimension levels</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn v-bind="attrs" v-on="on" value="all" :disabled="!maxDepth">
            <span>All</span>
          </v-btn>
        </template>
        <span>Rollup all dimension levels</span>
      </v-tooltip>
    </v-btn-toggle>

    <v-select
      v-if="rollupMode === 'numeric'"
      v-model="numericRollup"
      class="mt-2 rollup-level-select"
      dense
      hide-details
      solo
      :items="numericOptions"
      label="Depth"
    ></v-select>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

@Component
export default class RollupSelect extends Vue {
  @Prop({ default: 0 }) maxDepth!: number;

  private rollupMode: string | null = null;
  private numericRollup: number | null = null;

  get numericOptions() {
    const result: number[] = [];
    for (let idx = 1; idx <= this.maxDepth; idx += 1) {
      result.push(idx);
    }
    return result;
  }

  get selected() {
    if (this.rollupMode === "numeric") {
      return this.numericRollup;
    }
    return this.rollupMode;
  }

  set selected(rollup: any) {
    if (rollup === null || rollup === undefined || rollup === "") {
      this.rollupMode = null;
      this.numericRollup = null;
      return;
    }

    const parsed = typeof rollup === "number" ? rollup : parseInt(rollup, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (this.maxDepth && parsed === this.maxDepth) {
        this.rollupMode = "all";
        this.numericRollup = this.maxDepth;
      } else {
        this.rollupMode = "numeric";
        this.numericRollup = parsed;
      }
      return;
    }

    this.rollupMode = rollup;
    if (rollup === "all") {
      this.numericRollup = this.maxDepth || null;
    }
  }

  @Watch("maxDepth")
  onMaxDepthChanged() {
    if (!this.maxDepth) {
      this.rollupMode = null;
      this.numericRollup = null;
      return;
    }

    if (this.rollupMode === "numeric") {
      if (!this.numericRollup || this.numericRollup > this.maxDepth) {
        this.numericRollup = this.maxDepth;
      }
      return;
    }

    if (this.rollupMode === "all") {
      this.numericRollup = this.maxDepth;
    }
  }

  @Watch("rollupMode")
  onRollupModeChanged() {
    if (this.rollupMode === "numeric" && !this.numericRollup && this.numericOptions.length) {
      this.numericRollup = 1;
    }

    if (this.rollupMode === "all") {
      this.numericRollup = this.maxDepth || null;
    }
  }
}
</script>

<style scoped>
.rollup-level-select {
  max-width: 88px;
}
</style>
