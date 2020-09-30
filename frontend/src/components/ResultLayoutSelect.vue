<template>
  <v-btn-toggle :value="value" @change="onChange" mandatory>
    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="wide">
          <v-icon>horizontal_split</v-icon>
        </v-btn>
      </template>
      <span>Wide layout</span>
    </v-tooltip>

    <!-- This needs more work, commenting out for now -->
    <!-- <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="tall">
          <v-icon>vertical_split</v-icon>
        </v-btn>
      </template>
      <span>Tall layout</span>
    </v-tooltip>-->

    <v-tooltip bottom>
      <template v-slot:activator="{ on, attrs }">
        <v-btn v-bind="attrs" v-on="on" value="tabs" :disabled="$vuetify.breakpoint.mobile">
          <v-icon>tab</v-icon>
        </v-btn>
      </template>
      <span>Tab layout</span>
    </v-tooltip>
  </v-btn-toggle>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class ResultLayoutSelect extends Vue {
  @Prop() value: any;

  onChange(newValue) {
    this.$emit('input', newValue);
  }
}
</script>
