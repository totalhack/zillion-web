<template>
  <div>
    <v-data-table
      @contextmenu:row="handleRowRightClick"
      dense
      multi-sort
      class="datatable mx-3"
      fixed-header
      :height="parentHeight"
      :headers="reportHeaders"
      :items="displayReportData"
      :item-class="getRowClass"
      :items-per-page="500"
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
      <template v-for="(column, index) of reportColumns" v-slot:[`item.${column}`]="{ item }">
        <span :key="index" :style="getCellStyle(column, item[column])">{{
          getCellDisplayValue(column, item[column], item)
        }}</span>
      </template>
    </v-data-table>
    <context-menu :options="contextMenuOptions" :handler="handleContextMenuOption" ref="contextMenu"></context-menu>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from "vue-property-decorator";
import { pick } from "lodash";
import * as Papa from "papaparse";
import ReportManagerMixin from "@/components/mixins/ReportManagerMixin.vue";
import ContextMenu from "./ContextMenu.vue";

@Component({
  components: {
    ContextMenu,
  },
})
export default class ReportResultTable extends Mixins(ReportManagerMixin) {
  @Prop({ default: false }) showNormalizedValues!: boolean;
  @Prop({ default: null }) normalizeMode!: string | null;

  filters = {};

  private contextMenuOptions = ["Add Partition", "Add Criteria", "Set AB Control", "Set AB Variant"];

  @Watch("reportResult")
  onReportResultChanged() {
    if (this.activeNormalizeMode) {
      this.resetNormalization();
    }
  }

  @Watch("normalizationAvailabilityKey", { immediate: true })
  onNormalizationAvailabilityChanged() {
    this.$emit("normalize-availability-change", this.normalizationAvailability);

    if (this.activeNormalizeMode && !this.isNormalizeModeAvailable(this.activeNormalizeMode)) {
      this.resetNormalization();
    }
  }

  resetNormalization() {
    if (this.showNormalizedValues) {
      this.$emit("update:showNormalizedValues", false);
    }
    if (this.normalizeMode) {
      this.$emit("update:normalizeMode", null);
    }
  }

  handleContextMenuOption(item, context) {
    if (item === "Add Partition") {
      this.$emit("addPartitionFromDimension", context);
    } else if (item === "Add Criteria") {
      this.$emit("addCriteriaFromDimension", context);
    } else if (item === "Set AB Control") {
      this.$emit("setAbControlFromDimension", context);
    } else if (item === "Set AB Variant") {
      this.$emit("setAbVariantFromDimension", context);
    }
  }

  handleRowRightClick(event, item) {
    const target = event.originalTarget || event.target;
    const cell = target?.closest?.("td");
    const row = cell?.closest?.("tr");
    if (!cell || !row) {
      return;
    }

    const columns = Array.from(row.children);
    const columnIndex = columns.indexOf(cell);
    if (columnIndex < 0) {
      return;
    }

    const displayName = this.reportColumns[columnIndex];

    if (!this.reportDimensionsDisplay.includes(displayName)) {
      // Only open menu for dimensions
      return;
    }

    const name = this.reportReverseDisplayNameMap[displayName];
    const value = item.item[displayName];
    if (value === this.rollupMarker) {
      return;
    }
    const context = { name, display_name: displayName, value };
    (this.$refs.contextMenu as any).open(event, context);
  }

  handleFilterInput(column, value) {
    // We normally handle filters on enter key, but we also clear
    // the filters any time its an empty string.
    if (value === "") {
      this.filters[column] = "";
    }
  }

  applyFilter(filter, value, converter) {
    if (value === null || value === undefined || value === "") {
      return false;
    }
    filter = filter.trim();
    if (filter.startsWith("=")) {
      return converter(filter.slice(1)) === value;
    } else if (filter.startsWith(">=")) {
      return value >= converter(filter.slice(2));
    } else if (filter.startsWith(">")) {
      return value > converter(filter.slice(1));
    } else if (filter.startsWith("<=")) {
      return value <= converter(filter.slice(2));
    } else if (filter.startsWith("<")) {
      return value < converter(filter.slice(1));
    } else if (filter.startsWith("!=")) {
      return converter(filter.slice(2)) !== value;
    } else if (filter.startsWith("!")) {
      return !this.parseString(value).includes(filter.slice(1));
    } else {
      return this.parseString(value).includes(filter);
    }
  }

  parseString(val) {
    return val + "";
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
      case "integer":
      case "smallinteger":
      case "biginteger":
        filterFunc = this.intFilter;
        break;
      case "float":
      case "numeric":
        filterFunc = this.floatFilter;
        break;
      case "date":
      case "datetime":
        filterFunc = this.dateFilter;
        break;
      case "string":
      case "varchar":
      case "text":
      default:
        filterFunc = this.stringFilter;
    }
    return filterFunc;
  }

  getRowClass(item) {
    if (item._isRollup) {
      return ["rollup-row"];
    }
    return [];
  }

  get metricNormalizationModeByDisplayName() {
    const result = {};
    const requestMetrics = this.reportRequest?.metrics || [];
    const reportColumns = new Set(this.reportColumns);

    for (const metric of requestMetrics) {
      const metricName = this.getMetricName(metric);
      if (!metricName) {
        continue;
      }

      const displayName = this.reportDisplayNameMap[metricName] || (metric as any)?.display_name || metricName;
      if (!reportColumns.has(displayName)) {
        continue;
      }

      const aggregation = this.getMetricAggregation(metric);
      if (aggregation === "mean") {
        result[displayName] = "mean";
      } else if (this.isSummableAggregation(aggregation)) {
        result[displayName] = "sum";
      }
    }

    return result;
  }

  get totalsRollupRow() {
    if (!this.reportDimensionsDisplay.length) {
      return null;
    }

    for (let index = this.reportData.length - 1; index >= 0; index--) {
      const row = this.reportData[index];
      if (this.reportDimensionsDisplay.every((column) => row[column] === this.rollupMarker)) {
        return row;
      }
    }

    return null;
  }

  get hasNormalizationMetrics() {
    return !!this.reportRequest?.rollup && Object.keys(this.metricNormalizationModeByDisplayName).length > 0;
  }

  get canNormalize() {
    return this.canNormalizeTotal || this.canNormalizeByGroup;
  }

  get canNormalizeTotal() {
    return this.hasNormalizationMetrics && !!this.totalsRollupRow;
  }

  get rollupRowsByDimensionKey() {
    const result = new Map();

    for (const row of this.reportData) {
      if (!row._isRollup) {
        continue;
      }
      result.set(this.getDimensionKey(row), row);
    }

    return result;
  }

  get canNormalizeByGroup() {
    if (!this.hasNormalizationMetrics || this.reportDimensionsDisplay.length < 2) {
      return false;
    }

    return this.reportData.some((row) => {
      if (this.isTotalsRollupRow(row)) {
        return false;
      }

      return !!this.getGroupNormalizationRow(row);
    });
  }

  get activeNormalizeMode() {
    const requestedMode = this.normalizeMode || (this.showNormalizedValues ? "total" : null);
    if (!requestedMode) {
      return null;
    }

    return this.isNormalizeModeAvailable(requestedMode) ? requestedMode : null;
  }

  get normalizationAvailability() {
    return {
      total: this.canNormalizeTotal,
      group: this.canNormalizeByGroup,
    };
  }

  get normalizationAvailabilityKey() {
    return JSON.stringify(this.normalizationAvailability);
  }

  isNormalizeModeAvailable(mode) {
    if (mode === "group") {
      return this.canNormalizeByGroup;
    }
    if (mode === "total") {
      return this.canNormalizeTotal;
    }
    return false;
  }

  get displayReportData() {
    if (!this.activeNormalizeMode) {
      return this.reportData;
    }
    return this.reportData.map((row) => this.getNormalizedRow(row));
  }

  getCellStyle(column, value) {
    if (this.isColumnNormalized(column)) {
      return "";
    }

    const fName = this.reportReverseDisplayNameMap[column];
    const fDef = this.fieldDefFromName(fName);
    if (!fDef || !(fDef.meta && fDef.meta.display_colors)) {
      return "";
    }

    const conf = fDef.meta.display_colors;
    for (const color of Object.keys(conf)) {
      const hasMin = !isNaN(conf[color].min);
      const hasMax = !isNaN(conf[color].max);
      const useColor =
        (hasMin || hasMax) &&
        ((hasMax && value <= conf[color].max && !(hasMin && value < conf[color].min)) ||
          (hasMin && value >= conf[color].min && !(hasMax && value > conf[color].max)));
      if (useColor) {
        return "color: " + color;
      }
    }

    return "";
  }

  getCellDisplayValue(column, value, row = null) {
    if (!this.shouldFormatNormalizedValue(column, row)) {
      return value;
    }
    return this.formatNormalizedValue(value);
  }

  get parentHeight() {
    if (this.$vuetify.breakpoint.mobile) {
      return window.innerHeight * 0.72;
    } else {
      return window.innerHeight * 0.78;
    }
  }

  get reportHeaders() {
    const result: any[] = [];
    for (const column of this.reportColumns) {
      this.$set(this.filters, column, "");
      const filterFunc = this.getFilter(column);
      result.push({
        text: column,
        value: column,
        divider: true,
        filter: (value, search, item) => {
          if (!this.filters[column]) {
            return true;
          }
          return filterFunc(this.filters[column], this.getFilterValue(column, value));
        },
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
          if (dimensions.includes(columnName) && columnVal === this.rollupMarker) {
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
    const data: any[] = [];
    for (const row of this.getActiveRows()) {
      // Eliminate extra columns
      data.push(pick(row, this.reportResult.columns));
    }
    return data;
  }

  getActiveDisplayData() {
    if (this.reportResult === null) {
      return [];
    }

    const data: any[] = [];
    for (const row of this.getActiveDisplayRows()) {
      data.push(this.getExportRow(pick(row, this.reportResult.columns)));
    }
    return data;
  }

  getActiveRows() {
    if (this.reportResult === null) {
      return [];
    }
    const datatable = this.$refs.datatable as any;
    const tableBody = datatable?.$children?.[0];
    const filteredItems = tableBody?.filteredItems || [];
    const rawRowsById = new Map(this.reportData.map((row) => [row._id, row]));
    return filteredItems.map((row) => Object.assign({}, rawRowsById.get(row._id) || row));
  }

  getActiveDisplayRows() {
    if (this.reportResult === null) {
      return [];
    }

    const datatable = this.$refs.datatable as any;
    const tableBody = datatable?.$children?.[0];
    const filteredItems = tableBody?.filteredItems || [];
    return filteredItems.map((row) => Object.assign({}, row));
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
        case "integer":
        case "smallinteger":
        case "biginteger":
        case "float":
        case "numeric":
          quote = false;
          break;
        case "date":
        case "datetime":
        case "string":
        case "varchar":
        case "text":
        default:
          quote = true;
      }
      result.push(quote);
    }
    return result;
  }

  getActiveDataString() {
    const data = this.getActiveDisplayData();
    if (!data || data.length === 0) {
      return null;
    }
    return Papa.unparse(data, { escapeFormulae: true, quotes: this.quotesMask });
  }

  getMetricName(metric) {
    if (typeof metric === "string") {
      return metric;
    }
    return metric?.name || null;
  }

  getMetricAggregation(metric) {
    if (typeof metric !== "string" && typeof metric?.aggregation === "string") {
      return metric.aggregation.toLowerCase();
    }

    const metricName = this.getMetricName(metric);
    const metricDef = metricName ? this.fieldDefFromName(metricName) : null;
    if (typeof metricDef?.aggregation === "string") {
      return metricDef.aggregation.toLowerCase();
    }

    return null;
  }

  isSummableAggregation(aggregation) {
    return !!aggregation && aggregation !== "mean" && aggregation !== "min" && aggregation !== "max";
  }

  isColumnNormalized(column) {
    return !!this.activeNormalizeMode && column in this.metricNormalizationModeByDisplayName;
  }

  getFilterValue(column, value) {
    if (!this.isColumnNormalized(column)) {
      return value;
    }
    return value;
  }

  getNormalizedRow(row) {
    if (!this.hasNormalizationDenominator(row)) {
      return Object.assign({}, row);
    }

    const normalizedRow = Object.assign({}, row);
    for (const column of Object.keys(this.metricNormalizationModeByDisplayName)) {
      normalizedRow[column] = this.normalizeMetricPercent(column, row[column], row);
    }
    return normalizedRow;
  }

  normalizeMetricPercent(column, value, row) {
    const denominatorRow = this.getNormalizationDenominatorRow(row);
    if (!denominatorRow) {
      return value;
    }

    const numerator = Number(value);
    const denominator = Number(denominatorRow[column]);

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }

    return (numerator / denominator) * 100;
  }

  formatNormalizedValue(value) {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return "";
    }

    return `${numericValue.toFixed(2)}%`;
  }

  getExportRow(row) {
    if (!this.activeNormalizeMode) {
      return row;
    }

    const exportRow = Object.assign({}, row);
    for (const column of Object.keys(this.metricNormalizationModeByDisplayName)) {
      if (this.shouldFormatNormalizedValue(column, row)) {
        exportRow[column] = this.formatNormalizedValue(exportRow[column]);
      }
    }
    return exportRow;
  }

  shouldFormatNormalizedValue(column, row) {
    if (!this.isColumnNormalized(column)) {
      return false;
    }

    if (!row) {
      return true;
    }

    return this.hasNormalizationDenominator(row);
  }

  hasNormalizationDenominator(row) {
    return !!this.getNormalizationDenominatorRow(row);
  }

  getNormalizationDenominatorRow(row) {
    if (!row) {
      return null;
    }

    if (this.activeNormalizeMode === "group") {
      return this.getGroupNormalizationRow(row);
    }

    if (this.activeNormalizeMode === "total" && !this.isTotalsRollupRow(row)) {
      return this.totalsRollupRow;
    }

    return null;
  }

  getGroupNormalizationRow(row) {
    if (!row || this.isTotalsRollupRow(row)) {
      return null;
    }

    for (const parentKey of this.getAncestorRollupDimensionKeys(row)) {
      const parentRow = this.rollupRowsByDimensionKey.get(parentKey);
      if (parentRow) {
        return parentRow;
      }
    }

    return null;
  }

  getAncestorRollupDimensionKeys(row) {
    const dimensions = this.reportDimensionsDisplay;
    let lastConcreteIndex = -1;

    for (let index = dimensions.length - 1; index >= 0; index -= 1) {
      if (row[dimensions[index]] !== this.rollupMarker) {
        lastConcreteIndex = index;
        break;
      }
    }

    if (lastConcreteIndex < 0) {
      return [];
    }

    const ancestorKeys: string[] = [];

    for (let ancestorIndex = lastConcreteIndex; ancestorIndex >= 0; ancestorIndex -= 1) {
      const parentValues = dimensions.map((column, index) => {
        if (index < ancestorIndex) {
          return row[column];
        }
        return this.rollupMarker;
      });

      ancestorKeys.push(JSON.stringify(parentValues));
    }

    return ancestorKeys;
  }

  getDimensionKey(row) {
    return JSON.stringify(this.reportDimensionsDisplay.map((column) => row[column]));
  }

  isTotalsRollupRow(row) {
    if (!row || !this.totalsRollupRow) {
      return false;
    }

    if (row._id !== undefined) {
      return row._id === this.totalsRollupRow._id;
    }

    return this.reportDimensionsDisplay.every((column) => row[column] === this.rollupMarker);
  }
}
</script>

<style scoped>
.normalize-switch {
  max-width: 180px;
}
</style>
