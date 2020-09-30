<template>
  <date-picker
    :value="syncedValue"
    value-type="YYYY-MM-DD"
    format="YYYY-MM-DD"
    type="date"
    placeholder="Select Date"
    :shortcuts="nonRangeShortcuts"
    @input="onInput"
  ></date-picker>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import BaseDateCriteriaValueSelect from './BaseDateCriteriaValueSelect.vue';

@Component
export default class DateCriteriaValueSelect extends BaseDateCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof (value) === 'string') {
      return value;
    }
    return null;
  }
}
</script>
