<script lang="ts">
import { Component } from "vue-property-decorator";

import { getTodayDayOfMonth, isTodayShortcutValue } from "@/utils";
import IntegerCriteriaValueSelect from "./IntegerCriteriaValueSelect.vue";

@Component
export default class DayOfMonthCriteriaValueSelect extends IntegerCriteriaValueSelect {
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
