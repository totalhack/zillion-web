<template>
  <date-picker
    :value="syncedValue"
    value-type="YYYY-MM-DD"
    format="YYYY-MM-DD"
    type="date"
    placeholder="Select Date Range"
    :shortcuts="rangeShortcuts"
    @input="onInput"
    range
  ></date-picker>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import BaseDateCriteriaValueSelect from './BaseDateCriteriaValueSelect.vue';

@Component
export default class DateRangeCriteriaValueSelect extends BaseDateCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (Array.isArray(value) && value.length === 2) {
      return [value[0], value[1]];
    }
    return null;
  }

  validate() {
    if (!this.syncedValue || (!this.syncedValue[0] || !this.syncedValue[1])) {
      return { valid: false, error: 'Please select a valid date range' };
    }
    return { valid: true, error: '' };
  }

  get criteriaValue() {
    return [
      this.formatDate(this.syncedValue[0]),
      this.formatDate(this.syncedValue[1]),
    ];
  }
}
</script>
