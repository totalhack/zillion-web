<template>
  <v-textarea
    :value="syncedValue"
    @input="onInput"
    :label="label"
    :rules="getRules()"
    ref="input"
    rows="1"
    hide-details="auto"
    auto-grow
    dense
    solo
    flat
    outlined
  ></v-textarea>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import BaseCriteriaValueSelect from './BaseCriteriaValueSelect.vue';

@Component
export default class TextAreaCriteriaValueSelect extends BaseCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof (value) === 'string') {
      return value;
    }
    return null;
  }

  label = 'Enter Text';
  inputRefs = ['input'];
}
</script>
