<template>
  <v-row class>
    <v-col cols="6" class="py-0 my-0 pl-0">
      <v-text-field
        :value="syncedValue1"
        :rules="getRules()"
        @input="onInput1"
        label="Start"
        hide-details="auto"
        dense
        solo
        flat
        outlined
        ref="input1"
      ></v-text-field>
    </v-col>
    <v-col cols="6" class="py-0 my-0 pl-1 pr-0">
      <v-text-field
        :value="syncedValue2"
        :rules="getRules()"
        @input="onInput2"
        label="End"
        hide-details="auto"
        dense
        solo
        flat
        outlined
        ref="input2"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import BaseCriteriaValueSelect from './BaseCriteriaValueSelect.vue';

@Component
export default class TextBetweenCriteriaValueSelect extends BaseCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (Array.isArray(value) && value.length === 2) {
      return value;
    }
    return null;
  }

  inputRefs = ['input1', 'input2'];

  get syncedValue1() {
    if (this.syncedValue === null) {
      return null;
    }
    return this.syncedValue[0];
  }

  set syncedValue1(val) {
    this.onInput([val, this.syncedValue2]);
  }

  get syncedValue2() {
    if (this.syncedValue === null) {
      return null;
    }
    return this.syncedValue[1];
  }

  set syncedValue2(val) {
    this.onInput([this.syncedValue1, val]);
  }

  onInput1(newValue) {
    this.syncedValue1 = newValue;
  }

  onInput2(newValue) {
    this.syncedValue2 = newValue;
  }

  mounted() {
    if (this.syncedValue === null) {
      this.syncedValue = [];
    }
  }

}
</script>
