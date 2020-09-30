<template>
  <v-btn-toggle :value="value" @change="onChange" class="d-flex flex-wrap">
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="line">
          <v-icon>timeline</v-icon>
        </v-btn>
      </template>
      <span>Line Chart</span>
    </v-tooltip>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="bar">
          <v-icon>bar_chart</v-icon>
        </v-btn>
      </template>
      <span>Bar Chart</span>
    </v-tooltip>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="stackedBar">
          <v-icon>horizontal_split</v-icon>
        </v-btn>
      </template>
      <span>Stacked Bar</span>
    </v-tooltip>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="normalized">
          <v-icon>view_week</v-icon>
        </v-btn>
      </template>
      <span>Normalized</span>
    </v-tooltip>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="area">
          <v-icon>crop_original</v-icon>
        </v-btn>
      </template>
      <span>Area</span>
    </v-tooltip>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="stackedArea">
          <v-icon>stacked_line_chart</v-icon>
        </v-btn>
      </template>
      <span>Stacked Area</span>
    </v-tooltip>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="scatter">
          <v-icon>scatter_plot</v-icon>
        </v-btn>
      </template>
      <span>Scatter</span>
    </v-tooltip>
  </v-btn-toggle>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class GraphSelect extends Vue {
  @Prop({ default: null }) value!: string | null;

  onChange(newValue) {
    this.$emit('input', newValue);
  }
}
</script>
