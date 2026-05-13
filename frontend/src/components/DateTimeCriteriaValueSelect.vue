<template>
  <date-picker
    v-model="dateValue"
    value-type="YYYY-MM-DD HH:mm:ss"
    format="YYYY-MM-DD HH:mm:ss"
    :type="dateType"
    :editable="false"
    :input-attr="{ readonly: true, inputmode: 'none' }"
    popup-class="criteria-date-picker-popup"
    placeholder="Select Date/Time"
    :show-time-panel="timeRangePanelVisible"
    :shortcuts="nonRangeShortcuts.concat(nonRangeDateTimeShortcuts)"
    @close="handleRangeClose"
  >
    <template v-slot:footer>
      <button class="mx-btn mx-btn-text" @click="toggleTimeRangePanel">
        {{ timeRangePanelVisible ? "select date" : "select time" }}
      </button>
    </template>
  </date-picker>
</template>

<script lang="ts">
import { Component } from "vue-property-decorator";
import BaseDateCriteriaValueSelect from "./BaseDateCriteriaValueSelect.vue";

@Component
export default class DateTimeCriteriaValueSelect extends BaseDateCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof value === "string") {
      return value;
    }
    return null;
  }

  dateType: string = "datetime";

  get timeRangePanelVisible() {
    return this.showTimeRangePanel;
  }

  getShortCuts() {
    return this.nonRangeShortcuts.concat(this.nonRangeDateTimeShortcuts);
  }
}
</script>
