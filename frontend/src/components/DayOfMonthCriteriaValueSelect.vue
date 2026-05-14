<script lang="ts">
import { Component } from "vue-property-decorator";

import { getTodayDayOfMonth, isTodayShortcutValue } from "@/utils";
import IntegerCriteriaValueSelect from "./IntegerCriteriaValueSelect.vue";

@Component
export default class DayOfMonthCriteriaValueSelect extends IntegerCriteriaValueSelect {
  now: number = Date.now();
  intervalId: ReturnType<typeof setInterval> | null = null;

  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
    return null;
  }

  label = "Enter Day Of Month";

  created() {
    this.intervalId = setInterval(() => {
      this.now = Date.now();
    }, 30000);
  }

  beforeDestroy() {
    this.clearNowInterval();
  }

  deactivated() {
    this.clearNowInterval();
  }

  private clearNowInterval() {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  getRules(): any {
    return [
      this.rules.required,
      (value) => {
        if (isTodayShortcutValue(value)) {
          return true;
        }

        const integerResult = this.rules.isInteger(value);
        if (integerResult === true) {
          return true;
        }

        return "Must be an integer or 'today'";
      },
    ];
  }

  get criteriaValue() {
    const _now = this.now;
    if (isTodayShortcutValue(this.syncedValue)) {
      return getTodayDayOfMonth();
    }
    return parseInt(this.syncedValue, 10);
  }

  get uiCriteriaValue() {
    if (isTodayShortcutValue(this.syncedValue)) {
      return this.syncedValue;
    }
    return this.criteriaValue;
  }
}
</script>
