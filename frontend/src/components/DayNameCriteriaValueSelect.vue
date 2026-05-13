<script lang="ts">
import { Component } from "vue-property-decorator";

import { getTodayDayName, isTodayShortcutValue } from "@/utils";
import TextCriteriaValueSelect from "./TextCriteriaValueSelect.vue";

@Component
export default class DayNameCriteriaValueSelect extends TextCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof value === "string") {
      return value;
    }
    return null;
  }

  label = "Enter Day Name";

  get criteriaValue() {
    if (isTodayShortcutValue(this.syncedValue)) {
      return getTodayDayName();
    }
    return this.syncedValue;
  }

  get uiCriteriaValue() {
    if (isTodayShortcutValue(this.syncedValue)) {
      return this.syncedValue;
    }
    return this.criteriaValue;
  }
}
</script>
