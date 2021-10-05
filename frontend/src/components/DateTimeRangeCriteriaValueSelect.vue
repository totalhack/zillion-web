<template>
  <date-picker
    v-model="dateValue"
    value-type="YYYY-MM-DD HH:mm:ss"
    format="YYYY-MM-DD HH:mm:ss"
    :type="dateType"
    placeholder="Select Date/Time Range"
    :show-time-panel="showTimeRangePanel"
    :shortcuts="rangeShortcuts.concat(rangeDateTimeShortcuts)"
    range
    @close="handleRangeClose"
  >
    <template v-slot:footer>
      <button class="mx-btn mx-btn-text" @click="toggleTimeRangePanel">
        {{ showTimeRangePanel ? "select date" : "select time" }}
      </button>
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
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && value.length === 2) {
      return [value[0], value[1]];
    }
    return null;
  }

  validate() {
    if (typeof this.syncedValue === 'string') {
      // Assume its a shortcut string
      return { valid: true, error: '' };
    }
    if (!this.syncedValue || (!this.syncedValue[0] || !this.syncedValue[1])) {
      return { valid: false, error: 'Please select a valid date range' };
    }
    return { valid: true, error: '' };
  }

  get criteriaValue() {
    if (typeof this.syncedValue === 'string') {
      return this.syncedValue;
    }
    return [
      this.formatDate(this.syncedValue[0]),
      this.formatDate(this.syncedValue[1]),
    ];
  }

  getShortCuts() {
    return this.rangeShortcuts.concat(this.rangeDateTimeShortcuts);
  }
}
</script>
