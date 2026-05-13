<template>
  <date-picker
    :value="syncedValue"
    value-type="YYYY-MM-DD HH:mm:ss"
    format="YYYY-MM-DD HH:mm:ss"
    :type="dateType"
    :editable="false"
    :input-attr="{ readonly: true, inputmode: 'none' }"
    popup-class="criteria-date-picker-popup"
    placeholder="Select Date/Time"
    :show-time-panel="showTimeRangePanel"
    :shortcuts="nonRangeShortcuts"
    @close="handleRangeClose"
    @input="onInput"
  >
    <template v-slot:footer>
      <button class="mx-btn mx-btn-text" @click="toggleTimeRangePanel">
        {{ showTimeRangePanel ? "select date" : "select time" }}
      </button>
    </template>
  </date-picker>
</template>

<script lang="ts">
import { Component } from "vue-property-decorator";
import {
  getNDaysAgo,
  getNDaysAgoEnd,
  getNHoursAgo,
  getNMinutesAgo,
  getDateStartOf,
  getDateEndOf,
  getToday,
  getTomorrow,
  getLastMonthStart,
  getLastMonthEnd,
  getThisHour,
} from "@/utils";
import BaseCriteriaValueSelect from "./BaseCriteriaValueSelect.vue";

@Component
export default class BaseDateCriteriaValueSelect extends BaseCriteriaValueSelect {
  dateType: string = "datetime";
  now: any = Date.now();
  intervalId: any = null;

  nonRangeDateTimeShortcuts: any[] = [
    {
      text: "Last 10 Minutes",
      getValue(type) {
        return getNMinutesAgo(10, type);
      },
      onClick: () => this.handleShortcutInput("Last 10 Minutes"),
    },
    {
      text: "This Hour",
      getValue(type) {
        return getThisHour(type);
      },
      onClick: () => this.handleShortcutInput("This Hour"),
    },
    {
      text: "Last Hour",
      getValue(type) {
        return getNHoursAgo(1, type);
      },
      onClick: () => this.handleShortcutInput("Last Hour"),
    },
  ];

  nonRangeShortcuts: any[] = [
    {
      text: "Today",
      getValue(type) {
        return getToday(type);
      },
      onClick: () => this.handleShortcutInput("Today"),
    },
    {
      text: "Yesterday",
      getValue(type) {
        return getNDaysAgo(1, type);
      },
      onClick: () => this.handleShortcutInput("Yesterday"),
    },
    {
      text: "Start of Week",
      getValue(type) {
        return getDateStartOf("isoWeek", type);
      },
      onClick: () => this.handleShortcutInput("Start of Week"),
    },
    {
      text: "Start of Month",
      getValue(type) {
        return getDateStartOf("month", type);
      },
      onClick: () => this.handleShortcutInput("Start of Month"),
    },
    {
      text: "Start of Last Month",
      getValue(type) {
        return getLastMonthStart(type);
      },
      onClick: () => this.handleShortcutInput("Start of Last Month"),
    },
    {
      text: "Start of Year",
      getValue(type) {
        return getDateStartOf("year", type);
      },
      onClick: () => this.handleShortcutInput("Start of Year"),
    },
  ];

  rangeDateTimeShortcuts: any[] = [
    {
      text: "Last 10 Minutes",
      getValue(type) {
        return [getNMinutesAgo(10, type), getNMinutesAgo(0, type)];
      },
      onClick: () => this.handleShortcutInput("Last 10 Minutes"),
    },
    {
      text: "This Hour",
      getValue(type) {
        return [getThisHour(type), getNMinutesAgo(0, type)];
      },
      onClick: () => this.handleShortcutInput("This Hour"),
    },
    {
      text: "Last Hour",
      getValue(type) {
        return [getNHoursAgo(1, type), getThisHour(type)];
      },
      onClick: () => this.handleShortcutInput("Last Hour"),
    },
  ];

  rangeShortcuts: any[] = [
    {
      text: "Today",
      getValue(type) {
        return [getToday(type), getDateEndOf("day", type)];
      },
      onClick: () => this.handleShortcutInput("Today"),
    },
    {
      text: "Yesterday",
      getValue(type) {
        return [getNDaysAgo(1, type), getNDaysAgoEnd(1, type)];
      },
      onClick: () => this.handleShortcutInput("Yesterday"),
    },
    {
      text: "Last 7 Days",
      getValue(type) {
        return [getNDaysAgo(7, type), getNDaysAgoEnd(1, type)];
      },
      onClick: () => this.handleShortcutInput("Last 7 Days"),
    },
    {
      text: "Last 30 Days",
      getValue(type) {
        return [getNDaysAgo(30, type), getNDaysAgoEnd(1, type)];
      },
      onClick: () => this.handleShortcutInput("Last 30 Days"),
    },
    {
      text: "This Week",
      getValue(type) {
        return [getDateStartOf("isoWeek", type), getDateEndOf("day", type)];
      },
      onClick: () => this.handleShortcutInput("This Week"),
    },
    {
      text: "This Month",
      getValue(type) {
        return [getDateStartOf("month", type), getDateEndOf("day", type)];
      },
      onClick: () => this.handleShortcutInput("This Month"),
    },
    {
      text: "Last Month",
      getValue(type) {
        return [getLastMonthStart(type), getLastMonthEnd(type)];
      },
      onClick: () => this.handleShortcutInput("Last Month"),
    },
    {
      text: "This Year",
      getValue(type) {
        return [getDateStartOf("year", type), getDateEndOf("day", type)];
      },
      onClick: () => this.handleShortcutInput("This Year"),
    },
  ];

  showTimePanel: boolean = false;
  showTimeRangePanel: boolean = false;

  created() {
    const self = this;
    this.intervalId = setInterval(() => {
      self.now = Date.now();
    }, 30000);
  }

  deactivated() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  handleShortcutInput(newValue) {
    this.onInput(newValue);
  }

  toggleTimePanel() {
    this.showTimePanel = !this.showTimePanel;
  }

  toggleTimeRangePanel() {
    this.showTimeRangePanel = !this.showTimeRangePanel;
  }

  handleOpenChange() {
    this.showTimePanel = false;
  }

  handleRangeClose() {
    this.showTimeRangePanel = false;
  }

  validate() {
    if (!this.syncedValue) {
      return { valid: false, error: "Please select a valid date" };
    }
    return { valid: true, error: "" };
  }

  formatDate(value) {
    return value;
  }

  getShortCuts() {
    return this.rangeShortcuts;
  }

  get criteriaValue() {
    if (typeof this.syncedValue === "string") {
      return this.syncedValue;
    }
    return this.formatDate(this.syncedValue);
  }

  get dateValue() {
    const x = this.now; // HACK: trigger reactivity, please
    const shortcut = this.getShortCuts().find((v) => v.text === this.syncedValue);
    if (shortcut) {
      const value = shortcut.getValue(this.dateType);
      return value;
    }
    return this.syncedValue;
  }

  set dateValue(value) {
    this.onInput(value);
  }
}
</script>

<style>
@media (max-width: 600px) {
  .criteria-date-picker-popup {
    position: fixed !important;
    top: 24px !important;
    left: 50% !important;
    right: auto !important;
    bottom: auto !important;
    transform: translateX(-50%);
    width: min(calc(100vw - 16px), 320px) !important;
    max-width: calc(100vw - 16px) !important;
    max-height: calc(100dvh - 40px) !important;
    overflow-x: hidden;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .criteria-date-picker-popup .mx-datepicker-sidebar {
    float: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    width: auto;
    padding: 8px;
    border-bottom: 1px solid #e8e8e8;
  }

  .criteria-date-picker-popup .mx-datepicker-content {
    width: auto !important;
  }

  .criteria-date-picker-popup .mx-datepicker-sidebar + .mx-datepicker-content {
    margin-left: 0 !important;
    border-left: 0 !important;
  }

  .criteria-date-picker-popup .mx-btn-shortcut {
    display: inline-block;
    padding: 0 8px;
    border: 1px solid #e8e8e8;
    border-radius: 999px;
    white-space: nowrap;
  }

  .criteria-date-picker-popup .mx-range-wrapper {
    width: auto !important;
  }

  .criteria-date-picker-popup .mx-calendar {
    width: 100%;
    max-width: 100%;
  }
}
</style>
