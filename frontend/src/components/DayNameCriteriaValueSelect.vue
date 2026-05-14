<script lang="ts">
import { Component } from "vue-property-decorator";

import { getTodayDayName, isTodayShortcutValue } from "@/utils";
import TextCriteriaValueSelect from "./TextCriteriaValueSelect.vue";

@Component
export default class DayNameCriteriaValueSelect extends TextCriteriaValueSelect {
  now: number = Date.now();
  intervalId: ReturnType<typeof setInterval> | null = null;

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

  get criteriaValue() {
    const _now = this.now;
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
