<template>
  <v-btn-toggle v-model="rollup" dense>
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
        <v-btn v-bind="attrs" v-on="on" value="all">
          <span>All</span>
        </v-btn>
      </template>
      <span>Rollup all dimension levels</span>
    </v-tooltip>
  </v-btn-toggle>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class RollupSelect extends Vue {
  private rollup: string | null = null;

  private rollupTypes: object[] = [
    { text: 'None', value: null },
    { text: 'Totals', value: 'totals' },
    { text: 'All', value: 'all' },
  ];

  get selected() {
    return this.rollup;
  }

  set selected(rollup: any) {
    if (!isNaN(rollup) && parseInt(rollup, 10)) {
      // HACK: all gets converted and saved as a number on the back end
      rollup = 'all';
    }
    this.rollup = rollup;
  }
}
</script>
