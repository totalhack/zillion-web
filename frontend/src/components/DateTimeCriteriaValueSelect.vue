<template>
  <date-picker
    v-model="dateValue"
    value-type="YYYY-MM-DD HH:mm:ss"
    format="YYYY-MM-DD HH:mm:ss"
    :type="dateType"
    placeholder="Select Date/Time"
    :show-time-panel="showTimeRangePanel"
    :shortcuts="nonRangeShortcuts"
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
export default class DateTimeCriteriaValueSelect extends BaseDateCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof (value) === 'string') {
      return value;
    }
    return null;
  }

  dateType: string = 'datetime';

  getShortCuts() {
    return this.nonRangeShortcuts;
  }
}
</script>
