<template>
  <v-btn-toggle :value="value" @change="onChange" class="normalize-mode-select" dense>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" :value="null" small>
          <span>Off</span>
        </v-btn>
      </template>
      <span>Show raw values</span>
    </v-tooltip>

    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="total" :disabled="!allowTotal" small>
          <span>Totals</span>
        </v-btn>
      </template>
      <span>Normalize against the grand total rollup</span>
    </v-tooltip>

    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="group" :disabled="!allowGroup" small>
          <span>Groups</span>
        </v-btn>
      </template>
      <span>Normalize against the nearest parent rollup</span>
    </v-tooltip>
  </v-btn-toggle>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class NormalizeModeSelect extends Vue {
  @Prop({ default: null }) value!: string | null;
  @Prop({ default: true }) allowTotal!: boolean;
  @Prop({ default: false }) allowGroup!: boolean;

  onChange(newValue) {
    this.$emit("input", newValue || null);
  }
}
</script>

<style scoped>
.normalize-mode-select {
  min-height: 28px;
}

.normalize-mode-select :deep(.v-btn) {
  height: 28px !important;
  min-height: 28px !important;
  padding: 0 9px !important;
}

.normalize-mode-select :deep(.v-btn__content) {
  line-height: 1;
}
</style>
