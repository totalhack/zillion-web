<template>
  <date-picker
    :value="syncedValue"
    value-type="YYYY-MM-DD HH:mm:ss"
    format="YYYY-MM-DD HH:mm:ss"
    type="datetime"
    placeholder="Select Date/Time"
    :show-time-panel="showTimeRangePanel"
    :shortcuts="nonRangeShortcuts"
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
import {
  getNDaysAgo,
  getDateStartOf,
  getToday,
  getTomorrow,
  getLastMonthStart,
  getLastMonthEnd
} from '@/utils';
import BaseCriteriaValueSelect from './BaseCriteriaValueSelect.vue';

@Component
export default class BaseDateCriteriaValueSelect extends BaseCriteriaValueSelect {
  nonRangeShortcuts: object[] = [
    {
      text: 'Today',
      onClick() {
        return getToday();
      },
    },
    {
      text: 'Yesterday',
      onClick() {
        return getNDaysAgo(1);
      },
    },
    {
      text: 'Start of Week',
      onClick() {
        return getDateStartOf('isoWeek');
      },
    },
    {
      text: 'Start of Month',
      onClick() {
        return getDateStartOf('month');
      },
    },
    {
      text: 'Start of Last Month',
      onClick() {
        return getLastMonthEnd();
      },
    },
    {
      text: 'Start of Year',
      onClick() {
        return getDateStartOf('year');
      },
    },
  ];

  rangeShortcuts: object[] = [
    {
      text: 'Today',
      onClick() {
        return [getToday(), getToday()];
      },
    },
    {
      text: 'Yesterday',
      onClick() {
        return [getNDaysAgo(1), getNDaysAgo(1)];
      },
    },
    {
      text: 'Last 7 Days',
      onClick() {
        return [getNDaysAgo(7), getNDaysAgo(1)];
      },
    },
    {
      text: 'Last 30 Days',
      onClick() {
        return [getNDaysAgo(30), getNDaysAgo(1)];
      },
    },
    {
      text: 'This Week',
      onClick() {
        return [getDateStartOf('isoWeek'), getToday()];
      },
    },
    {
      text: 'This Month',
      onClick() {
        return [getDateStartOf('month'), getToday()];
      },
    },
    {
      text: 'Last Month',
      onClick() {
        return [getLastMonthStart(), getLastMonthEnd()];
      },
    },
    {
      text: 'This Year',
      onClick() {
        return [getDateStartOf('year'), getToday()];
      },
    },
  ];

  private showTimePanel: boolean = false;
  private showTimeRangePanel: boolean = false;

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
      return { valid: false, error: 'Please select a valid date' };
    }
    return { valid: true, error: '' };
  }

  formatDate(value) {
    return value;
  }

  get criteriaValue() {
    return this.formatDate(this.syncedValue);
  }
}
</script>
