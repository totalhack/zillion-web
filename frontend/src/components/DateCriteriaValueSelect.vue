<template>
  <date-picker
    v-model="dateValue"
    value-type="YYYY-MM-DD"
    format="YYYY-MM-DD"
    :type="dateType"
    :editable="false"
    :input-attr="{ readonly: true, inputmode: 'none' }"
    popup-class="criteria-date-picker-popup"
    placeholder="Select Date"
    :shortcuts="nonRangeShortcuts"
  ></date-picker>
</template>

<script lang="ts">
import { Component } from "vue-property-decorator";
import BaseDateCriteriaValueSelect from "./BaseDateCriteriaValueSelect.vue";

@Component
export default class DateCriteriaValueSelect extends BaseDateCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof value === "string") {
      return value;
    }
    return null;
  }

  dateType: string = "date";

  getShortCuts() {
    return this.nonRangeShortcuts;
  }
}
</script>
