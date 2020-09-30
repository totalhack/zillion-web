<template>
  <v-text-field
    :value="syncedValue"
    :rules="getRules()"
    @input="onInput"
    :label="label"
    ref="input"
    hide-details="auto"
    dense
    solo
    flat
    outlined
  ></v-text-field>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import BaseCriteriaValueSelect from './BaseCriteriaValueSelect.vue';

@Component
export default class TextCriteriaValueSelect extends BaseCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof (value) === 'string') {
      return value as any;
    }
    return null;
  }

  label = 'Enter Text';
  inputRefs = ['input'];
}
</script>
