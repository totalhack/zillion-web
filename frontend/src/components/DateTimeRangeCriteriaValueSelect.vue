<template>
  <date-picker
    :value="syncedValue"
    value-type="YYYY-MM-DD HH:mm:ss"
    format="YYYY-MM-DD HH:mm:ss"
    type="datetime"
    placeholder="Select Date/Time Range"
    :show-time-panel="showTimeRangePanel"
    :shortcuts="rangeShortcuts"
    range
    @close="handleRangeClose"
    @input="onInput"
  >
    <template v-slot:footer>
      <button
        class="mx-btn mx-btn-text"
        @click="toggleTimeRangePanel"
      >{{ showTimeRangePanel ? 'select date' : 'select time' }}</button>
    </template>
  </date-picker>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator';
import BaseDateCriteriaValueSelect from './BaseDateCriteriaValueSelect.vue';

@Component
export default class DateTimeRangeCriteriaValueSelect extends BaseDateCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (Array.isArray(value) && value.length === 2) {
      return [value[0], value[1]];
    }
    return null;
  }

  get criteriaValue() {
    return [
      this.formatDate(this.syncedValue[0]),
      this.formatDate(this.syncedValue[1]),
    ];
  }
}
</script>
