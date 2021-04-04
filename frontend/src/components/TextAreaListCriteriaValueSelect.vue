<template>
  <v-textarea
    :value="syncedValue"
    @input="onInput"
    :rules="getRules()"
    :label="label"
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
import TextAreaCriteriaValueSelect from './TextAreaCriteriaValueSelect.vue';

@Component
export default class TextAreaListCriteriaValueSelect extends TextAreaCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    if (Array.isArray(criteria)) {
      return criteria.join(', ');
    }
    return null;
  }

  static ensureOptionValue(value) {
    // The format of criteria output differs from the option type in
    // this case, so the handling is different.
    if (typeof (value) === 'string') {
      return value;
    }
    return null;
  }

  get criteriaValue() {
    if (!this.syncedValue) {
      return [];
    }
    // Replace commas with newlines
    const value = this.syncedValue.split(',').join('\n');
    // Ensure newline separation and no whitespace around values
    const result = value.split('\n').map((item) => {
      return item.trim();
    });

    return result;
  }

  label = 'Enter Text';
  inputRefs = ['input'];
}
</script>
