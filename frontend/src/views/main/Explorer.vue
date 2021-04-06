<template>
  <v-container container--fluid class="content-container">
    <v-navigation-drawer
      right
      absolute
      clipped
      width="breakpointMdOrLess ? '100%' : '45%'"
      v-show="showSettingsDrawer"
      :value="showSettingsDrawer"
      :class="breakpointMdOrLess ? 'settings-drawer-mobile' : 'settings-drawer'"
    >
      <v-list-item>
        <v-list-item-content>
          <v-row class="my-0 py-0" justify="center">
            <v-col class="my-0 py-0" cols="12" md="6" data-cy="warehouseSelect">
              <v-select
                :items="warehouses"
                :value="activeWarehouseId"
                item-text="name"
                item-value="id"
                color="grey darken-3"
                item-color="grey darken-3"
                dense
                hide-details
                return-object
                prepend-icon="account_tree"
                @change="changeWarehouse"
                ref="warehouseSelect"
              ></v-select>
            </v-col>
          </v-row>
        </v-list-item-content>
        <v-icon @click.stop="closeSettingsDrawer">close</v-icon>
      </v-list-item>
      <v-card class="mx-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-1">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <span v-bind="attrs" v-on="on">Metrics</span>
            </template>
            <span>Fields to measure and aggregate</span>
          </v-tooltip>
        </v-card-subtitle>
        <v-card-text class="py-0 my-0">
          <metric-select ref="metrics" data-cy="metrics"></metric-select>
        </v-card-text>
      </v-card>

      <v-card class="ma-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-1">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <span v-bind="attrs" v-on="on">Dimensions</span>
            </template>
            <span>Fields controlling the grouping of rows</span>
          </v-tooltip>
        </v-card-subtitle>
        <v-card-text class="py-0 my-0">
          <dimension-select
            ref="dimensions"
            data-cy="dimensions"
          ></dimension-select>
        </v-card-text>
      </v-card>

      <v-card class="ma-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-1">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <span v-bind="attrs" v-on="on">Criteria</span>
            </template>
            <span>Dimension value filters applied in datasource queries</span>
          </v-tooltip>
        </v-card-subtitle>
        <v-card-text class="py-0 pb-1 my-0">
          <criteria-select
            v-if="isHydrated"
            ref="criteria"
            data-cy="criteria"
            :raw-options-map="warehouseDimensions"
            default-group="Dimensions"
          ></criteria-select>
        </v-card-text>
      </v-card>

      <v-card class="ma-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-0">Options</v-card-subtitle>
        <v-container class="py-0">
          <v-row>
            <v-col class="py-1" cols="12" sm="4">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <p class="text-subtitle-2 option-select-title">Rollup Type</p>
                <rollup-select
                  class="mt-1 pt-1 mb-0 pb-0"
                  ref="rollup"
                  data-cy="rollup"
                ></rollup-select>
              </div>
            </v-col>

            <v-col class="py-1" cols="12" sm="8">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <p class="text-subtitle-2 option-select-title">Order By</p>
                <order-by-select
                  :order-by-options="selectedFields"
                  ref="order_by"
                  data-cy="order_by"
                ></order-by-select>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="py-1" cols="12" sm="2">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <p class="text-subtitle-2 option-select-title">Row Limit</p>
                <limit-select
                  class="my-1 py-1"
                  ref="limit"
                  data-cy="limit"
                ></limit-select>
              </div>
            </v-col>

            <v-col class="py-1" cols="12" sm="2">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <p
                      v-bind="attrs"
                      v-on="on"
                      class="text-subtitle-2 option-select-title"
                    >
                      Limit First
                    </p>
                  </template>
                  <span
                    >Apply limits and row filters before rollups/ordering</span
                  >
                </v-tooltip>
                <v-switch
                  class="mt-1 pt-1 mb-0 pb-0"
                  v-model="limitFirst"
                  ref="limit_first"
                  data-cy="limit_first"
                  hide-details="auto"
                  color="grey darken-3"
                ></v-switch>
              </div>
            </v-col>

            <v-col class="py-1" cols="12" sm="8">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <p
                      v-bind="attrs"
                      v-on="on"
                      class="text-subtitle-2 option-select-title"
                    >
                      Row Filters
                    </p>
                  </template>
                  <span>Metric value filters applied on the final result</span>
                </v-tooltip>
                <row-filter-select
                  v-if="isHydrated"
                  :row-filter-options="selectedMetrics"
                  :raw-options-map="warehouseMetrics"
                  ref="row_filters"
                  data-cy="row_filters"
                ></row-filter-select>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-card>

      <v-card class="ma-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-0"
          >Vizualization</v-card-subtitle
        >
        <v-container class="py-0">
          <v-row>
            <v-col class="py-1">
              <div class="ma-1 pa-1">
                <p class="text-subtitle-2 option-select-title">Graph Type</p>
                <graph-select
                  class="mt-1 pt-1 mb-0 pb-0"
                  v-model="graphOptions.graphType"
                  ref="graphSelect"
                  data-cy="graphSelect"
                ></graph-select>
              </div>
            </v-col>
          </v-row>

          <v-row>
            <v-col class="py-1">
              <div class="mx-1 px-1 my-0 py-0">
                <p class="text-subtitle-2 option-select-title">Result Layout</p>
                <result-layout-select
                  class="mt-1 pt-1 mb-0 pb-0"
                  v-model="resultLayout"
                  ref="resultLayoutSelect"
                  data-cy="resultLayoutSelect"
                ></result-layout-select>
              </div>
            </v-col>
            <v-col class="py-1">
              <div class="mx-1 px-1 my-0 py-0">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <p
                      v-bind="attrs"
                      v-on="on"
                      class="text-subtitle-2 option-select-title"
                    >
                      Multi-axis
                    </p>
                  </template>
                  <span
                    >Graph right half of metrics list on a secondary Y
                    axis</span
                  >
                </v-tooltip>
                <v-switch
                  class="mt-1 pt-1 mb-0 pb-0"
                  v-model="graphOptions.multiAxis"
                  ref="multiAxisGraph"
                  data-cy="multiAxisGraph"
                  color="grey darken-3"
                ></v-switch>
              </div>
            </v-col>
            <v-col class="py-1">
              <div class="mx-1 px-1 my-0 py-0">
                <p class="text-subtitle-2 option-select-title">Log Y Scale</p>
                <v-switch
                  class="mt-1 pt-1 mb-0 pb-0"
                  v-model="graphOptions.logYScale"
                  ref="logYScaleGraph"
                  data-cy="logYScaleGraph"
                  color="grey darken-3"
                ></v-switch>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-card>

      <!-- Spacer div -->
      <div style="height: 200px"></div>
    </v-navigation-drawer>

    <div
      :style="
        showSettingsDrawer
          ? { opacity: 0.46, height: '100%' }
          : { height: '100%' }
      "
    >
      <div v-if="hasReportData()" style="height: 100%; margin-bottom: 20px">
        <template v-if="this.resultLayout !== 'tabs'">
          <v-row>
            <v-col v-show="showGraph" class="pt-0 mt-0" cols="12">
              <report-result-graph-card
                ref="reportResultGraphCard"
                data-cy="reportResultGraphCard"
                :graph-options="graphOptions"
                v-on:complete="graphComplete = true"
              ></report-result-graph-card>
            </v-col>
            <v-col class="pt-0 mt-0" cols="12">
              <report-result-table-card
                ref="reportResultTableCard"
                data-cy="reportResultTableCard"
              ></report-result-table-card>
            </v-col>
          </v-row>
        </template>
        <template v-else>
          <div style="height: 100%">
            <v-tabs v-model="tab" centered class="pt-0 mt-0">
              <v-tabs-slider color="grey darken-3"></v-tabs-slider>
              <v-tab href="#graphTab" :disabled="!showGraph">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon v-bind="attrs" v-on="on" color="grey darken-3"
                      >analytics</v-icon
                    >
                  </template>
                  <span>Graph</span>
                </v-tooltip>
              </v-tab>
              <v-tab href="#tableTab">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon v-bind="attrs" v-on="on" color="grey darken-3"
                      >table_view</v-icon
                    >
                  </template>
                  <span>Table</span>
                </v-tooltip>
              </v-tab>
            </v-tabs>

            <v-tabs-items style="height: 97%" v-model="tab">
              <v-tab-item
                style="height: 100%"
                :value="'graphTab'"
                :reverse-transition="false"
                :transition="false"
              >
                <report-result-graph-card
                  style="max-height: 84vh; height: 84vh"
                  ref="reportResultGraphCard"
                  data-cy="reportResultGraphCard"
                  :graph-options="graphOptions"
                  :result-layout="resultLayout"
                  :show-title="false"
                  :tab="tab"
                  v-on:complete="graphComplete = true"
                ></report-result-graph-card>
              </v-tab-item>
              <v-tab-item
                eager
                :value="'tableTab'"
                :reverse-transition="false"
                :transition="false"
              >
                <report-result-table-card
                  ref="reportResultTableCard"
                  data-cy="reportResultTableCard"
                  :show-title="false"
                ></report-result-table-card>
              </v-tab-item>
            </v-tabs-items>
          </div>
        </template>
      </div>

      <span
        v-else
        class="d-flex mt-5 ml-5 justify-start align-start text-subtitle-1"
        style="height: 100%"
        >No Data. Awaiting instructions...</span
      >
    </div>

    <report-loading-overlay></report-loading-overlay>

    <report-save-dialog
      @input="save($event)"
      ref="reportSaveDialog"
      data-cy="reportSaveDialog"
    ></report-save-dialog>

    <v-bottom-navigation fixed dark height="auto" min-height="30">
      <query-summaries
        style="flex: 1"
        ref="querySummaries"
        data-cy="querySummaries"
      ></query-summaries>
      <div
        style="
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        "
      >
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              :disabled="!isMounted"
              @click="toggleSettingsDrawer"
              data-cy="settingsButton"
            >
              <v-icon color="white">settings</v-icon>
            </v-btn>
          </template>
          <span>Report Settings (ctrl+z)</span>
        </v-tooltip>
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              :disabled="!isMounted"
              @click="run"
              data-cy="runButton"
            >
              <v-icon color="white">play_arrow</v-icon>
            </v-btn>
          </template>
          <span>Run Report (ctrl+x)</span>
        </v-tooltip>
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              :disabled="!isMounted"
              @click="openReportSaveDialog"
              data-cy="saveButton"
            >
              <v-icon color="white">save</v-icon>
            </v-btn>
          </template>
          <span>Save Report (ctrl+s)</span>
        </v-tooltip>
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              :disabled="!isMounted"
              @click="downloadReport"
              data-cy="downloadButton"
            >
              <v-icon color="white">get_app</v-icon>
            </v-btn>
          </template>
          <span>Download Data (ctrl+shft+d)</span>
        </v-tooltip>
      </div>
      <div
        style="display: flex; justify-content: end; align-items: right; flex: 1"
      ></div>
    </v-bottom-navigation>
  </v-container>
</template>

<script lang="ts">
import { Component, Mixins, Watch, Vue } from 'vue-property-decorator';
import FileSaver from 'file-saver';
import {
  getSessionReportRequest,
  saveSessionReportRequest,
  getSessionWarehouseId,
  saveSessionWarehouseId,
  ValidationError
} from '@/utils';
import {
  readExplorerShowSettingsDrawer,
  readExplorerResultLayout
} from '@/store/main/getters';
import {
  dispatchAddNotification,
  dispatchClearNotifications,
  dispatchAddWarning,
  dispatchExecuteReport,
  dispatchSaveReport,
  dispatchHydrateExplorerStore,
  dispatchGetReportFromId,
  dispatchExplorerToggleSettingsDrawer,
  dispatchExplorerOpenSettingsDrawer,
  dispatchExplorerCloseSettingsDrawer,
  dispatchExplorerSetResultLayout,
  dispatchExplorerCloseLoadingOverlay,
  dispatchExplorerSetReportState,
  dispatchSetReportRequest,
  dispatchSetReportResult,
  dispatchSetActiveWarehouseId,
  dispatchSetDefaultWarehouseId,
} from '@/store/main/actions';
import ReportManagerMixin from '@/components/mixins/ReportManagerMixin.vue';
import MetricSelect from '@/components/MetricSelect.vue';
import DimensionSelect from '@/components/DimensionSelect.vue';
import CriteriaSelect from '@/components/CriteriaSelect.vue';
import RowFilterSelect from '@/components/RowFilterSelect.vue';
import RollupSelect from '@/components/RollupSelect.vue';
import LimitSelect from '@/components/LimitSelect.vue';
import OrderBySelect from '@/components/OrderBySelect.vue';
import GraphSelect from '@/components/GraphSelect.vue';
import ResultLayoutSelect from '@/components/ResultLayoutSelect.vue';

let headScripts: any[] = [];
if (process.env.NODE_ENV !== 'production') {
  headScripts = [
    { type: 'text/javascript', src: 'http://localhost:8098', async: true },
  ];
}

@Component({
  components: {
    MetricSelect,
    DimensionSelect,
    CriteriaSelect,
    RowFilterSelect,
    RollupSelect,
    LimitSelect,
    OrderBySelect,
    GraphSelect,
    ResultLayoutSelect,
    ReportResultTableCard: () => import('@/components/ReportResultTableCard.vue'),
    ReportResultGraphCard: () => import('@/components/ReportResultGraphCard.vue'),
    ReportSaveDialog: () => import('@/components/ReportSaveDialog.vue'),
    ReportLoadingOverlay: () => import('@/components/ReportLoadingOverlay.vue'),
    QuerySummaries: () => import('@/components/QuerySummaries.vue'),
  },
  head: {
    script: headScripts,
  },
})
export default class Explorer extends Mixins(ReportManagerMixin) {
  // https://stackoverflow.com/questions/43531755/using-refs-in-a-computed-property
  private isHydrated: boolean = false;
  private isMounted: boolean = false;
  private _keyListener: any;
  private reportSelectors: string[] = [
    'metrics', 'dimensions', 'criteria', 'row_filters', 'rollup', 'order_by', 'limit'
  ];
  private limitFirst = false;
  private graphOptions = {
    graphType: null,
    multiAxis: false,
    logYScale: false,
  };
  private graphComplete: boolean = false;
  private reportTitle: string = '';
  private tab: string | null = null;

  get showSettingsDrawer() {
    return readExplorerShowSettingsDrawer(this.$store);
  }

  closeSettingsDrawer() {
    dispatchExplorerCloseSettingsDrawer(this.$store);
  }

  toggleSettingsDrawer() {
    dispatchExplorerToggleSettingsDrawer(this.$store);
  }

  get breakpointMdOrLess() {
    return (this.$vuetify.breakpoint.name === 'xs' ||
      this.$vuetify.breakpoint.name === 'sm' ||
      this.$vuetify.breakpoint.name === 'md');
  }

  get showGraph() {
    return this.graphOptions.graphType;
  }

  get resultLayout() {
    return readExplorerResultLayout(this.$store);
  }

  set resultLayout(value) {
    dispatchExplorerSetResultLayout(this.$store, value);
  }

  get selectedMetrics() {
    const fields: string[] = [];
    if (!this.isMounted) {
      return fields;
    }
    const metrics = (this.$refs.metrics as any).selected;
    if (!metrics) {
      return fields;
    }
    for (const metric of metrics) {
      if (typeof metric !== 'string') {
        // Assume its an Ad Hoc metric and skip.
        continue;
      }
      fields.push(metric);
    }
    return fields;
  }

  get selectedFields() {
    const fields: string[] = [];
    if (!this.isMounted) {
      return fields;
    }
    const dimensions = (this.$refs.dimensions as any).selected;
    const metrics = this.selectedMetrics;
    return fields.concat(dimensions, metrics);
  }

  get reportSelections() {
    const report = {};
    for (const selector of this.reportSelectors) {
      report[selector] = (this.$refs[selector] as any).selected;
    }
    report['limit_first'] = this.limitFirst;

    const rollup = (report as any).rollup;
    const dimensions = (report as any).dimensions;
    if (rollup && !(dimensions && dimensions.length > 0)) {
      dispatchAddNotification(
        this.$store,
        { content: 'No Dimensions specified, ignoring Rollup', color: 'warning' }
      );
      (report as any).rollup = null;
    }

    return report;
  }

  get selections() {
    const selections = Object.assign({}, this.reportSelections);
    const meta = {};
    meta['graphOptions'] = this.graphOptions;
    meta['resultLayout'] = readExplorerResultLayout(this.$store);
    selections['meta'] = meta;
    return selections;
  }

  validate() {
    try {
      const selections = this.selections;
    } catch (err) {
      if (err instanceof ValidationError) {
        return { valid: false, error: err };
      } else {
        throw err;
      }
    }
    return { valid: true, error: null };
  }

  addValidationErrorNotification(msg = 'Please fix validation errors') {
    dispatchAddNotification(
      this.$store,
      { content: msg, color: 'error' }
    );
  }

  setPageTitle(title) {
    document.title = 'Report: ' + title;
  }

  openReportSaveDialog() {
    const vresult = this.validate();
    if (!vresult.valid) {
      this.addValidationErrorNotification();
      return;
    }
    (this.$refs.reportSaveDialog as any).open(this.reportTitle);
  }

  downloadReport() {
    if (!this.hasReportData()) {
      dispatchAddWarning(this.$store, 'No report data found for download');
      return;
    }
    const dataString = (this.$refs.reportResultTableCard as any).getActiveDataString();
    const blob = new Blob([dataString], { type: 'text/csv;charset=utf-8' });
    let fName = 'report.csv';
    if (this.reportTitle && this.reportTitle.length) {
      fName = this.reportTitle + '.csv';
    }
    FileSaver.saveAs(blob, fName);
  }

  async run() {
    if (!this.isMounted) {
      return;
    }

    dispatchClearNotifications(this.$store);

    if (!this.warehouseActive) {
      dispatchAddWarning(this.$store, 'Please activate a warehouse to run reports');
      return;
    }

    const vresult = this.validate();
    if (!vresult.valid) {
      this.addValidationErrorNotification(vresult.error?.message);
      return;
    }

    // TODO: we use this to help manage the loading overlay. This may be
    // better off in vuex, or the loading overlay state brought out of vuex.
    this.graphComplete = false;
    const success = await dispatchExecuteReport(this.$store, this.reportSelections);
    if (success) {
      saveSessionWarehouseId(this.activeWarehouseId!);
      saveSessionReportRequest(this.selections);
    }
    if (this.resultLayout === 'tabs' && this.tab === 'tableTab') {
      // Not rendering graph yet, can close overlay immediately
      dispatchExplorerCloseLoadingOverlay(this.$store);
      dispatchExplorerSetReportState(this.$store, '');
    }
  }

  async save(options) {
    if (!this.warehouseActive) {
      dispatchAddWarning(this.$store, 'Please activate a warehouse to save reports');
      return;
    }
    const vresult = this.validate();
    if (!vresult.valid) {
      this.addValidationErrorNotification();
      return;
    }

    const selections = this.selections;

    if (options) {
      if (options.title) {
        selections['meta']['title'] = options.title;
      }
      if (options.update) {
        const urlParams = new URLSearchParams(window.location.search);
        const report = urlParams.get('report');
        selections['report_id'] = report;
      }
    }

    console.log('Save:', selections);
    const result = await dispatchSaveReport(this.$store, selections);
    saveSessionWarehouseId(this.activeWarehouseId!);
    saveSessionReportRequest(selections);

    if (result?.spec_id) {
      const urlParams = new URLSearchParams();
      urlParams.append('warehouse', this.activeWarehouseId as any);
      urlParams.append('report', result.spec_id as any);
      if (options && options.autorun) {
        urlParams.append('autorun', options.autorun as any);
      }
      window.history.pushState({}, '', '?' + urlParams.toString());
      if (options) {
        if (options.title) {
          this.reportTitle = options.title;
          this.setPageTitle(this.reportTitle);
        } else {
          this.setPageTitle(result.spec_id);
        }
      } else {
        this.setPageTitle(result.spec_id);
      }
    }
  }

  load(report, autorun = false) {
    console.log('Load:', report);
    for (const selector of this.reportSelectors) {
      (this.$refs[selector] as any).selected = report[selector];
    }
    this.limitFirst = report['limit_first'];

    if (report.meta) {
      if (report.meta.graphOptions) {
        Object.assign(this.graphOptions, report.meta.graphOptions);
      }
      if (report.meta.resultLayout) {
        dispatchExplorerSetResultLayout(this.$store, report.meta.resultLayout);
      }
      if (report.meta.title) {
        this.reportTitle = report.meta.title;
      }
    }

    if (autorun) {
      this.$nextTick(function () {
        this.run();
      });
    }
  }

  async loadReportSpecId(specId, autorun = false) {
    if (!this.warehouseActive) {
      dispatchAddWarning(this.$store, 'Please activate a warehouse to load reports');
      return;
    }
    const report = await dispatchGetReportFromId(this.$store, specId);
    this.load(report, autorun);
    this.setPageTitle((report?.meta as any).title || specId);
  }

  async mounted() {
    await dispatchHydrateExplorerStore(this.$store);
    this.isHydrated = true;

    if (this.$route.query.warehouse) {
      const warehouseId = parseInt(this.$route.query.warehouse as any, 10);
      // TODO: what if it's invalid? actions.hydrateWarehouseStructure probably
      // should error out if so.
      await dispatchSetActiveWarehouseId(this.$store, warehouseId);

      if (this.$route.query.report) {
        let autorun = false;
        if (this.$route.query.autorun) {
          const val = this.$route.query.autorun;
          // Probably a better way to do this
          if (val !== 'false' && val !== '0') {
            autorun = true;
          }
        }
        this.loadReportSpecId(this.$route.query.report, autorun);
      }
    } else {
      if (this.$route.query.report) {
        dispatchAddWarning(this.$store, 'Ignoring report url param as no warehouse url param is specified');
      }
      const request = getSessionReportRequest();
      const whId = getSessionWarehouseId();
      if (request && whId !== null) {
        await dispatchSetActiveWarehouseId(this.$store, whId as number);
        this.load(request);
      }
    }

    if (!this.activeWarehouseId) {
      await dispatchSetDefaultWarehouseId(this.$store);
    }

    this.addKeyListener();
    if (!this.hasReportData()) {
      // Open the settings drawer on initial load
      dispatchExplorerOpenSettingsDrawer(this.$store);
    }

    if (this.$vuetify.breakpoint.mobile) {
      this.resultLayout = 'wide';
    }

    this.isMounted = true;
  }

  beforeDestroy() {
    document.removeEventListener('keydown', this._keyListener);
  }

  beforeRouteLeave(to, from, next) {
    const vresult = this.validate();
    if (vresult.valid) {
      const selections = this.selections;
      if (selections) {
        saveSessionReportRequest(selections);
      }
    }
    next();
  }

  @Watch('showGraph')
  onShowGraphChanged(val: object, oldVal: object) {
    if (!val) {
      if (this.tab === 'graphTab') {
        this.tab = 'tableTab';
      }
    } else {
      if (this.resultLayout === 'tabs') {
        this.tab = 'graphTab';
      }
    }
  }

  @Watch('graphComplete')
  onGraphCompleteChanged(val: object, oldVal: object) {
    if (val) {
      dispatchExplorerCloseLoadingOverlay(this.$store);
      dispatchExplorerSetReportState(this.$store, '');
    }
  }

  @Watch('reportResult')
  onReportResultChanged(val: object, oldVal: object) {
    if (!this.showGraph) {
      dispatchExplorerCloseLoadingOverlay(this.$store);
      dispatchExplorerSetReportState(this.$store, '');
    }
  }

  private keyListenerHandler(e) {
    if (e.key === 's' && e.ctrlKey) {
      e.preventDefault();
      this.openReportSaveDialog();
    } else if (e.key === 'x' && e.ctrlKey) {
      e.preventDefault();
      this.run();
    } else if (e.key === 'z' && e.ctrlKey) {
      e.preventDefault();
      dispatchExplorerToggleSettingsDrawer(this.$store);
    } else if (e.key === 'D' && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      this.downloadReport();
    }
  }

  private addKeyListener() {
    this._keyListener = this.keyListenerHandler.bind(this);
    document.addEventListener('keydown', this._keyListener);
  }
}
</script>
