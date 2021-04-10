<template>
  <v-data-table
    dense
    multi-sort
    class="datatable mx-3"
    fixed-header
    :height="parentHeight"
    :headers="reportHeaders"
    :items="reportData"
    :item-class="getRowClass"
    :items-per-page="100"
    :footer-props="{
      itemsPerPageText: 'Per page:',
      itemsPerPageOptions: [25, 100, 500, -1],
    }"
    item-key="_id"
    :mobile-breakpoint="null"
    ref="datatable"
  >
    <template v-slot:body.prepend>
      <tr>
        <td
          v-for="(column, index) of reportColumns"
          :key="index"
          style="border-right: thin solid rgba(0, 0, 0, 0.12)"
        >
          <v-text-field
            :value="filters[column]"
            @input="handleFilterInput(column, $event)"
            @change="filters[column] = $event"
            @click:clear="filters[column] = ''"
            type="text"
            dense
            single-line
            hide-details
            placeholder="Filter"
            color="grey darken-3"
          ></v-text-field>
        </td>
      </tr>
    </template>
    <template
      v-for="(column, index) of reportColumns"
      v-slot:[`item.${column}`]="{ item }"
    >
      <td :key="index" :style="getCellStyle(column, item[column])">
        {{ item[column] }}
      </td>
    </template>
  </v-data-table>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Vue } from 'vue-property-decorator';
import { pick } from 'lodash';
import * as Papa from 'papaparse';
import ReportManagerMixin from '@/components/mixins/ReportManagerMixin.vue';

@Component
export default class ReportResultTable extends Mixins(ReportManagerMixin) {
  filters = {};

  get parentHeight() {
    if (this.$vuetify.breakpoint.mobile) {
      return window.innerHeight * 0.72;
    } else {
      return window.innerHeight * 0.78;
    }
  }

  handleFilterInput(column, value) {
    // We normally handle filters on enter key, but we also clear
    // the filters any time its an empty string.
    if (value === '') {
      this.filters[column] = '';
    }
  }

  applyFilter(filter, value, converter) {
    filter = filter.trim();
    if (filter.startsWith('=')) {
      return converter(filter.slice(1)) === value;
    } else if (filter.startsWith('>=')) {
      return value >= converter(filter.slice(2));
    } else if (filter.startsWith('>')) {
      return value > converter(filter.slice(1));
    } else if (filter.startsWith('<=')) {
      return value <= converter(filter.slice(2));
    } else if (filter.startsWith('<')) {
      return value < converter(filter.slice(1));
    } else if (filter.startsWith('!=')) {
      return converter(filter.slice(2)) !== value;
    } else if (filter.startsWith('!')) {
      return !this.parseString(value).includes(filter.slice(1));
    } else {
      return this.parseString(value).includes(filter);
    }
  }

  parseString(val) {
    return val + '';
  }

  parseInteger(val) {
    return parseInt(val, 10);
  }

  intFilter(filter, cell) {
    return this.applyFilter(filter, cell, this.parseInteger);
  }

  floatFilter(filter, cell) {
    return this.applyFilter(filter, cell, parseFloat);
  }

  stringFilter(filter, cell) {
    return this.applyFilter(filter, cell, this.parseString);
  }

  dateFilter(filter, cell) {
    return this.applyFilter(filter, cell, this.parseString);
  }

  getFilter(column) {
    const columnRaw = this.reportReverseDisplayNameMap[column];
    const field = this.fieldDefFromName(columnRaw);
    if (field === null) {
      // HACK: Assume its an AdHoc Metric
      return this.floatFilter;
    }

    const type = this.fieldType(field);

    let filterFunc: any;
    switch (type) {
      case 'integer':
      case 'smallinteger':
      case 'biginteger':
        filterFunc = this.intFilter;
        break;
      case 'float':
      case 'numeric':
        filterFunc = this.floatFilter;
        break;
      case 'date':
      case 'datetime':
        filterFunc = this.dateFilter;
        break;
      case 'string':
      case 'varchar':
      case 'text':
      default:
        filterFunc = this.stringFilter;
    }
    return filterFunc;
  }

  getRowClass(item) {
    if (item._isRollup) {
      return ['rollup-row'];
    }
    return [];
  }

  getCellStyle(column, value) {
    const fName = this.reportReverseDisplayNameMap[column];
    const fDef = this.fieldDefFromName(fName);
    if (!fDef || !(fDef.meta && fDef.meta.display_colors)) {
      return '';
    }

    const conf = fDef.meta.display_colors;
    for (const color of Object.keys(conf)) {
      const hasMin = !isNaN(conf[color].min);
      const hasMax = !isNaN(conf[color].max);
      const useColor = (
        (hasMin || hasMax) &&
        (
          (hasMax && value <= conf[color].max && !(hasMin && value < conf[color].min)) ||
          (hasMin && value >= conf[color].min && !(hasMax && value > conf[color].max))
        )
      );
      if (useColor) {
        return 'color: ' + color;
      }
    }

    return '';
  }

  get reportHeaders() {
    const result: any[] = [];
    for (const column of this.reportColumns) {
      this.$set(this.filters, column, '');
      const filterFunc = this.getFilter(column);
      result.push({
        text: column,
        value: column,
        divider: true,
        filter: (value, search, item) => {
          if (!this.filters[column]) {
            return true;
          }
          return filterFunc(this.filters[column], value);
        }
      });
    }
    return result;
  }

  get reportData() {
    const result: any[] = [];

    if (this.reportResult != null) {
      const dimensions = this.reportDimensionsDisplay;
      const columns = this.reportResult.columns;
      const reportData = this.reportResult.data;

      for (let i = 0; i < reportData.length; i++) {
        const row: any = {};
        let isRollup: boolean = false;

        for (let j = 0; j < columns.length; j++) {
          const columnName = columns[j];
          const columnVal = reportData[i][j];
          if (dimensions.includes(columnName) && (columnVal === this.rollupMarker)) {
            isRollup = true;
          }
          row[columnName] = columnVal;
        }

        row._id = i;
        row._isRollup = isRollup;
        result.push(row);
      }
    }

    return result;
  }

  getActiveData() {
    if (this.reportResult === null) {
      return [];
    }
    // Hack until this is supported officially. This maintains filter
    // and sort settings.
    // https://github.com/vuetifyjs/vuetify/issues/8731
    const rawData = (this.$refs.datatable as any).$children[0].filteredItems;
    const data: any[] = [];
    for (const row of rawData) {
      // Eliminate extra columns
      data.push(pick(row, this.reportResult.columns));
    }
    return data;
  }

  get quotesMask() {
    const result: boolean[] = [];
    for (const column of this.reportColumns) {
      const columnRaw = this.reportReverseDisplayNameMap[column];
      const field = this.fieldDefFromName(columnRaw);
      if (field === null) {
        // HACK: Assume its an AdHoc Metric
        result.push(false);
        continue;
      }
      const type = this.fieldType(field);
      let quote: boolean;
      switch (type) {
        case 'integer':
        case 'smallinteger':
        case 'biginteger':
        case 'float':
        case 'numeric':
          quote = false;
          break;
        case 'date':
        case 'datetime':
        case 'string':
        case 'varchar':
        case 'text':
        default:
          quote = true;
      }
      result.push(quote);
    }
    return result;
  }

  getActiveDataString() {
    const data = this.getActiveData();
    if (!data || data.length === 0) {
      return null;
    }
    return Papa.unparse(data, { escapeFormulae: true, quotes: this.quotesMask });
  }
}
</script>

