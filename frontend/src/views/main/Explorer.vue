<template>
  <v-container fluid class="content-container">
    <v-navigation-drawer
      right
      absolute
      clipped
      stateless
      touchless
      :width="breakpointMdOrLess ? '100%' : '45%'"
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
              <v-icon small class="ml-2 mb-1" @click.stop="clearMetrics">delete</v-icon>
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
              <v-icon small class="ml-2 mb-1" @click.stop="clearDimensions">delete</v-icon>
            </template>
            <span>Fields controlling the grouping of rows</span>
          </v-tooltip>
        </v-card-subtitle>
        <v-card-text class="py-0 my-0">
          <dimension-select @addCriteriaFromDimension="addCriteriaFromDimension" ref="dimensions" data-cy="dimensions">
          </dimension-select>
        </v-card-text>
      </v-card>

      <v-card class="ma-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-1">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <span v-bind="attrs" v-on="on">Criteria</span>
              <v-icon small class="ml-2 mb-1" @click.stop="clearCriteria">delete</v-icon>
            </template>
            <span>Dimension value filters applied in datasource queries</span>
          </v-tooltip>
        </v-card-subtitle>
        <v-card-text class="py-0 pb-1 my-0">
          <criteria-select
            v-if="isHydrated"
            ref="criteria"
            data-cy="criteria"
            :raw-options-map="warehouseNonFormulaDimensions"
            default-group="Dimensions"
          ></criteria-select>
        </v-card-text>
      </v-card>

      <v-card class="ma-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-0">Options</v-card-subtitle>
        <v-container class="pt-1 pb-2">
          <v-row>
            <v-col class="py-1" cols="12" sm="4" md="auto">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <p class="text-subtitle-2 option-select-title">Rollup Type</p>
                <rollup-select
                  class="mt-1 pt-1 mb-0 pb-0"
                  ref="rollup"
                  data-cy="rollup"
                  :max-depth="selectedDimensions.length"
                ></rollup-select>
              </div>
            </v-col>

            <v-col class="py-1" cols="12" sm="2">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <p class="text-subtitle-2 option-select-title">Row Limit</p>
                <limit-select class="my-1 py-1" ref="limit" data-cy="limit"></limit-select>
              </div>
            </v-col>

            <v-col class="py-1" cols="12" sm="2">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <p v-bind="attrs" v-on="on" class="text-subtitle-2 option-select-title">
                      Limit First
                    </p>
                  </template>
                  <span>Apply limits and row filters before rollups/ordering</span>
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

            <v-col class="py-1" cols="12" sm="4">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <p v-bind="attrs" v-on="on" class="text-subtitle-2 option-select-title">
                      Window Size
                    </p>
                  </template>
                  <span
                    >Chunk the report execution in windows of this size. Date ranges use day-sized chunks, datetime
                    ranges use minutes.</span
                  >
                </v-tooltip>
                <v-text-field
                  class="my-1 py-1 explorer-window-size-input"
                  v-model="chunkWindowSize"
                  data-cy="chunkWindowSize"
                  type="number"
                  min="1"
                  inputmode="numeric"
                  hide-details="auto"
                  placeholder="Off"
                ></v-text-field>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="py-1" cols="12">
              <div class="mx-1 px-1 mt-1 pt-1 mb-0 pb-0">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <p v-bind="attrs" v-on="on" class="text-subtitle-2 option-select-title">
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
            <v-col class="py-1" cols="12">
              <div class="mx-1 px-1 mt-0 pt-0 mb-0 pb-0">
                <p class="text-subtitle-2 option-select-title">Order By</p>
                <order-by-select :order-by-options="selectedFields" ref="order_by" data-cy="order_by"></order-by-select>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-card>

      <v-card class="ma-3 pa-2">
        <v-card-subtitle class="text-subtitle-2 py-0">Vizualization</v-card-subtitle>
        <v-container class="pt-1 pb-3">
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
                    <p v-bind="attrs" v-on="on" class="text-subtitle-2 option-select-title">
                      Multi-axis
                    </p>
                  </template>
                  <span>Graph right half of metrics list on a secondary Y axis</span>
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

    <div :style="showSettingsDrawer ? { opacity: 0.46, height: '100%' } : { height: '100%' }">
      <div v-if="hasReportData()" class="explorer-report-output">
        <template v-if="this.resultLayout !== 'tabs'">
          <v-row>
            <v-col v-show="showGraph" class="pt-1 mt-0" cols="12">
              <report-result-graph-card
                ref="reportResultGraphCard"
                data-cy="reportResultGraphCard"
                :graph-options="graphOptions"
                :result-layout="resultLayout"
                v-on:complete="graphComplete = true"
              ></report-result-graph-card>
            </v-col>
            <v-col class="pt-0 mt-0 pb-8" cols="12">
              <report-result-table-card
                ref="reportResultTableCard"
                @addPartitionFromDimension="addPartitionFromDimension"
                @addCriteriaFromDimension="addCriteriaFromDimension"
                @setAbControlFromDimension="setAbControlFromDimension"
                @setAbVariantFromDimension="setAbVariantFromDimension"
                data-cy="reportResultTableCard"
              >
              </report-result-table-card>
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
                    <v-icon v-bind="attrs" v-on="on" color="grey darken-3">analytics</v-icon>
                  </template>
                  <span>Graph</span>
                </v-tooltip>
              </v-tab>
              <v-tab href="#tableTab">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon v-bind="attrs" v-on="on" color="grey darken-3">table_view</v-icon>
                  </template>
                  <span>Table</span>
                </v-tooltip>
              </v-tab>
            </v-tabs>

            <v-tabs-items style="height: 97%" v-model="tab">
              <v-tab-item style="height: 100%" :value="'graphTab'" :reverse-transition="false" :transition="false">
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
              <v-tab-item eager :value="'tableTab'" :reverse-transition="false" :transition="false">
                <report-result-table-card
                  ref="reportResultTableCard"
                  @addPartitionFromDimension="addPartitionFromDimension"
                  @addCriteriaFromDimension="addCriteriaFromDimension"
                  @setAbControlFromDimension="setAbControlFromDimension"
                  @setAbVariantFromDimension="setAbVariantFromDimension"
                  data-cy="reportResultTableCard"
                  :show-title="false"
                ></report-result-table-card>
              </v-tab-item>
            </v-tabs-items>
          </div>
        </template>
      </div>

      <span v-else class="d-flex mt-5 ml-5 justify-start align-start text-subtitle-1" style="height: 100%"
        >No Data. Awaiting instructions...</span
      >
    </div>

    <report-loading-overlay></report-loading-overlay>

    <report-save-dialog
      @input="save($event)"
      @visibility-change="handleModalVisibilityChange('reportSaveDialog', $event)"
      ref="reportSaveDialog"
      data-cy="reportSaveDialog"
    ></report-save-dialog>
    <report-ab-test-dialog
      @analyze="analyzeAbTest"
      @visibility-change="handleModalVisibilityChange('reportAbTestDialog', $event)"
      ref="reportAbTestDialog"
      data-cy="reportAbTestDialog"
    >
    </report-ab-test-dialog>
    <!--
    <report-from-text-dialog
      @input="loadFromText($event)"
      ref="reportFromTextDialog"
      data-cy="reportFromTextDialog"
    ></report-from-text-dialog>
    -->

    <v-bottom-navigation class="explorer-bottom-navigation" fixed dark height="auto" min-height="30">
      <query-summaries
        class="explorer-bottom-navigation__summaries"
        @visibility-change="handleModalVisibilityChange('querySummaries', $event)"
        ref="querySummaries"
        data-cy="querySummaries"
      ></query-summaries>
      <div class="explorer-bottom-navigation__actions">
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
        <!--
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              :disabled="!isMounted"
              @click="openReportFromTextDialog"
              data-cy="textButton"
            >
              <v-icon color="white">chat</v-icon>
            </v-btn>
          </template>
          <span>NLP Report (ctrl+/)</span>
        </v-tooltip>
        -->
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn v-bind="attrs" v-on="on" :disabled="!isMounted" @click="run" data-cy="runButton">
              <v-icon color="white">play_arrow</v-icon>
            </v-btn>
          </template>
          <span>Run Report (ctrl+x)</span>
        </v-tooltip>
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn v-bind="attrs" v-on="on" :disabled="!isMounted" @click="openReportSaveDialog" data-cy="saveButton">
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
              :disabled="!isMounted || !hasReportData()"
              @click="openAbTestDialog()"
              data-cy="abTestButton"
            >
              <v-icon color="white">science</v-icon>
            </v-btn>
          </template>
          <span>AB Analysis from current table rows</span>
        </v-tooltip>
        <v-tooltip top>
          <template v-slot:activator="{ on, attrs }">
            <v-btn v-bind="attrs" v-on="on" :disabled="!isMounted" @click="downloadReport" data-cy="downloadButton">
              <v-icon color="white">get_app</v-icon>
            </v-btn>
          </template>
          <span>Download Data (ctrl+shft+d)</span>
        </v-tooltip>
      </div>
      <div class="explorer-bottom-navigation__spacer"></div>
    </v-bottom-navigation>
  </v-container>
</template>

<script lang="ts">
import { Component, Mixins, Watch, Vue } from "vue-property-decorator";
import FileSaver from "file-saver";
import { buildChunkExecutionPlan } from "@/reportWindowing";
import {
  getSessionReportRequest,
  saveSessionReportRequest,
  getSessionWarehouseId,
  saveSessionWarehouseId,
  getToday,
  ValidationError,
} from "@/utils";
import {
  readExplorerShowSettingsDrawer,
  readExplorerResultLayout,
  readMetrics,
  readUnsupportedGrainMetrics,
} from "@/store/main/getters";
import {
  dispatchAddNotification,
  dispatchClearNotifications,
  dispatchAddWarning,
  dispatchExecuteReport,
  // dispatchGetReportFromText,
  dispatchSaveReport,
  dispatchHydrateExplorerStore,
  dispatchGetReportFromId,
  dispatchExplorerToggleSettingsDrawer,
  dispatchExplorerOpenSettingsDrawer,
  dispatchExplorerCloseSettingsDrawer,
  dispatchExplorerSetResultLayout,
  dispatchExplorerOpenLoadingOverlay,
  dispatchExplorerCloseLoadingOverlay,
  dispatchExplorerSetReportState,
  dispatchSetActiveWarehouseId,
  dispatchSetDefaultWarehouseId,
} from "@/store/main/actions";
import ReportManagerMixin from "@/components/mixins/ReportManagerMixin.vue";
import MetricSelect from "@/components/MetricSelect.vue";
import DimensionSelect from "@/components/DimensionSelect.vue";
import CriteriaSelect from "@/components/CriteriaSelect.vue";
import RowFilterSelect from "@/components/RowFilterSelect.vue";
import RollupSelect from "@/components/RollupSelect.vue";
import LimitSelect from "@/components/LimitSelect.vue";
import OrderBySelect from "@/components/OrderBySelect.vue";
import GraphSelect from "@/components/GraphSelect.vue";
import ResultLayoutSelect from "@/components/ResultLayoutSelect.vue";
import ReportAbTestDialog from "@/components/ReportAbTestDialog.vue";

let headScripts: any[] = [];
if (process.env.NODE_ENV !== "production") {
  headScripts = [{ type: "text/javascript", src: "http://localhost:8098", async: true }];
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
    ReportAbTestDialog,
    ReportResultTableCard: () => import("@/components/ReportResultTableCard.vue"),
    ReportResultGraphCard: () => import("@/components/ReportResultGraphCard.vue"),
    ReportSaveDialog: () => import("@/components/ReportSaveDialog.vue"),
    // ReportFromTextDialog: () => import("@/components/ReportFromTextDialog.vue"),
    ReportLoadingOverlay: () => import("@/components/ReportLoadingOverlay.vue"),
    QuerySummaries: () => import("@/components/QuerySummaries.vue"),
  },
  head: {
    script: headScripts,
  },
})
export default class Explorer extends Mixins(ReportManagerMixin) {
  private static readonly reportReadyTitleIndicator = "• ";
  private supportedGraphTypes: string[] = ["line", "bar", "stackedBar", "normalized", "area", "stackedArea"];
  // https://stackoverflow.com/questions/43531755/using-refs-in-a-computed-property
  private isHydrated: boolean = false;
  private isMounted: boolean = false;
  private _keyListener: any;
  private _notificationDismissListener: any;
  private _popStateListener: any;
  private _visibilityChangeListener: any;
  private ignoreSettingsToggleUntil: number = 0;
  private activeMobileModalId: string | null = null;
  private mobileModalHistorySequence: number = 0;
  private reportSelectors: string[] = [
    "metrics",
    "dimensions",
    "criteria",
    "row_filters",
    "rollup",
    "order_by",
    "limit",
  ];
  private limitFirst = false;
  private chunkWindowSize: string | number | null = null;
  private graphOptions = {
    graphType: null,
    multiAxis: false,
    logYScale: false,
  };
  private graphComplete: boolean = false;
  private reportTitle: string = "";
  private pageTitleBase: string = document.title || "Zillion";
  private reportExecutionPendingCompletion: boolean = false;
  private showBackgroundCompletionIndicator: boolean = false;
  private pendingAutorun: boolean = false;
  private tab: string | null = null;

  get showSettingsDrawer() {
    return readExplorerShowSettingsDrawer(this.$store);
  }

  closeSettingsDrawer() {
    dispatchExplorerCloseSettingsDrawer(this.$store);
  }

  toggleSettingsDrawer() {
    if (this.breakpointMdOrLess && Date.now() < this.ignoreSettingsToggleUntil) {
      return;
    }
    dispatchExplorerToggleSettingsDrawer(this.$store);
  }

  async bringSettingsDrawerIntoView() {
    dispatchExplorerCloseSettingsDrawer(this.$store);
    await this.$nextTick();
    dispatchExplorerOpenSettingsDrawer(this.$store);
  }

  clearMetrics() {
    (this.$refs.metrics as any).selected = [];
  }

  clearDimensions() {
    (this.$refs.dimensions as any).selected = [];
  }

  clearCriteria() {
    (this.$refs.criteria as any).selected = [];
  }

  addCriteriaFromDimension(dim) {
    console.log("addCriteriaFromDimension", dim);
    if (dim.formula) {
      dispatchAddWarning(this.$store, "Can not add criteria from formula dimensions");
      return;
    }
    const criteria = (this.$refs.criteria as any).selected;
    const value = dim.value || undefined;
    criteria.push([dim.name, "=", value]);
    (this.$refs.criteria as any).selected = criteria;
  }

  addPartitionFromDimension(dim) {
    console.log("addPartitionFromDimension", dim);

    // Make sure its not based on an existing formula dimension
    if (dim.formula) {
      dispatchAddWarning(this.$store, "Can not add partition from formula dimensions");
      return;
    }

    const dimensions = (this.$refs.dimensions as any).selected;

    const value = dim.value || undefined;
    const partName = dim.name + "_part";
    const displayName = (dim.display_name || dim.name) + " Part";
    let formula;

    if (value === undefined) {
      formula = "{" + dim.name + "} IS NULL";
    } else {
      formula = "{" + dim.name + "} = " + JSON.stringify(value);
    }

    for (const row of dimensions) {
      if (row === partName || row.name === partName) {
        if (row === partName) {
          dispatchAddWarning(this.$store, "Dimension " + partName + " already exists");
        } else if (row.name === partName) {
          dispatchAddWarning(this.$store, "Partition dimension " + partName + " already exists");
        }
        return;
      }
    }

    // Should we instead have func on DimensionSelect for this?
    dimensions.push({
      name: partName,
      display_name: displayName,
      formula,
    });
    (this.$refs.dimensions as any).selected = dimensions;
  }

  get breakpointMdOrLess() {
    return (
      this.$vuetify.breakpoint.name === "xs" ||
      this.$vuetify.breakpoint.name === "sm" ||
      this.$vuetify.breakpoint.name === "md"
    );
  }

  get mobileBackButtonClosesModal() {
    return !!this.$vuetify.breakpoint.mobile;
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
      if (typeof metric !== "string") {
        // Assume its an Ad Hoc metric and skip.
        continue;
      }
      fields.push(metric);
    }
    return fields;
  }

  get selectedDimensions() {
    const fields: string[] = [];
    if (!this.isMounted) {
      return fields;
    }
    const dims = (this.$refs.dimensions as any).selected;
    if (!dims) {
      return fields;
    }
    for (const dim of dims) {
      if (typeof dim !== "string") {
        // Assume its an Ad Hoc dimension and skip.
        continue;
      }
      fields.push(dim);
    }
    return fields;
  }

  get selectedFields() {
    const fields: string[] = [];
    if (!this.isMounted) {
      return fields;
    }
    const dimensions = this.selectedDimensions;
    const metrics = this.selectedMetrics;
    return fields.concat(dimensions, metrics);
  }

  get reportSelections() {
    const report: Record<string, any> = {};
    for (const selector of this.reportSelectors) {
      report[selector] = (this.$refs[selector] as any).selected;
    }
    report["limit_first"] = this.limitFirst;

    const rollup = (report as any).rollup;
    const dimensions = (report as any).dimensions;
    if (rollup && !(dimensions && dimensions.length > 0)) {
      dispatchAddNotification(this.$store, { content: "No Dimensions specified, ignoring Rollup", color: "warning" });
      (report as any).rollup = null;
    }

    return report;
  }

  get hasChunkWindowSizeInput() {
    return (
      this.chunkWindowSize !== null && this.chunkWindowSize !== undefined && String(this.chunkWindowSize).trim() !== ""
    );
  }

  get parsedChunkWindowSize() {
    if (!this.hasChunkWindowSizeInput) {
      return null;
    }

    const parsed =
      typeof this.chunkWindowSize === "number" ? this.chunkWindowSize : parseInt(String(this.chunkWindowSize), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  get uiCriteriaSelections() {
    const criteriaRef = this.$refs.criteria as any;
    if (!criteriaRef) {
      return [];
    }
    if (Array.isArray(criteriaRef.uiSelected)) {
      return criteriaRef.uiSelected;
    }
    return criteriaRef.selected || [];
  }

  get selections() {
    const selections = Object.assign({}, this.reportSelections);
    const meta = {};
    meta["graphOptions"] = this.graphOptions;
    meta["resultLayout"] = readExplorerResultLayout(this.$store);
    const uiCriteriaSelections = this.uiCriteriaSelections;
    if (JSON.stringify(uiCriteriaSelections) !== JSON.stringify(selections["criteria"])) {
      meta["ui_criteria"] = uiCriteriaSelections;
    }
    const abTestConfig = (this.$refs.reportAbTestDialog as any)?.readConfig?.();
    if (abTestConfig) {
      meta["abTest"] = abTestConfig;
    }
    const metricUiSelections = this.metricUiSelections;
    if (metricUiSelections.some((metric) => metric?.active === false)) {
      meta["ui_metrics"] = metricUiSelections;
    }
    if (this.parsedChunkWindowSize !== null) {
      meta["windowing"] = { size: this.parsedChunkWindowSize };
    }
    selections["meta"] = meta;
    return selections;
  }

  validateChunkWindowing() {
    if (!this.hasChunkWindowSizeInput) {
      return { valid: true, error: null };
    }

    if (this.parsedChunkWindowSize === null) {
      return { valid: false, error: new ValidationError("Chunk window size must be a positive integer.") };
    }

    try {
      buildChunkExecutionPlan(
        Object.assign({}, this.reportSelections, { meta: { windowing: { size: this.parsedChunkWindowSize } } }),
        this.warehouseDimensions as Record<string, any>
      );
    } catch (error) {
      return { valid: false, error: new ValidationError((error as Error).message) };
    }

    return { valid: true, error: null };
  }

  get metricUiSelections() {
    const metricsRef = this.$refs.metrics as any;
    if (!metricsRef) {
      return [];
    }
    if (Array.isArray(metricsRef.uiSelected)) {
      return metricsRef.uiSelected;
    }
    return (metricsRef.selected || []).map((metric) => {
      if (typeof metric === "string") {
        return { name: metric, active: true };
      }
      return Object.assign({ active: true }, metric);
    });
  }

  pauseUnsupportedMetricsForSave() {
    const metricsRef = this.$refs.metrics as any;
    if (!metricsRef) {
      return { pausedMetricDisplayNames: [], updatedSelections: [] };
    }

    const unsupportedGrainMetrics = readUnsupportedGrainMetrics(this.$store) || {};
    const unsupportedMetricNames = Array.isArray(unsupportedGrainMetrics)
      ? unsupportedGrainMetrics.filter((metric) => typeof metric === "string")
      : Object.keys(unsupportedGrainMetrics);
    if (!unsupportedMetricNames.length) {
      return { pausedMetricDisplayNames: [], updatedSelections: [] };
    }

    const originalSelections = this.metricUiSelections;
    const unsupportedMetricSet = new Set(unsupportedMetricNames);
    const updatedSelections = originalSelections.map((metric) => {
      if (!metric?.name || !unsupportedMetricSet.has(metric.name) || metric.active === false) {
        return metric;
      }
      return Object.assign({}, metric, { active: false });
    });
    const pausedMetrics = updatedSelections.filter(
      (metric, index) => metric?.active === false && originalSelections[index]?.active !== false
    );

    if (!pausedMetrics.length) {
      return { pausedMetricDisplayNames: [], updatedSelections: [] };
    }

    if ("uiSelected" in metricsRef) {
      metricsRef.uiSelected = updatedSelections;
    } else {
      metricsRef.selected = updatedSelections
        .filter((metric) => metric?.active !== false)
        .map((metric) => (metric?.formula ? metric : metric?.name));
    }

    return {
      pausedMetricDisplayNames: pausedMetrics.map((metric) => metric.display_name || metric.name),
      updatedSelections,
    };
  }

  buildSaveSelections(options, updatedMetricSelections: any[] = []) {
    const selections = this.selections;
    const metricsRef = this.$refs.metrics as any;
    const createdOptionsGroup = metricsRef?.createdOptionsGroup || "Ad Hoc Metrics";
    const rawMetricsMap = metricsRef?.rawOptionsMap || readMetrics(this.$store) || {};
    const selectedMetrics = updatedMetricSelections.length ? updatedMetricSelections : (selections["metrics"] as any[]);

    selections["metrics"] = selectedMetrics
      .filter((metric) => metric?.active !== false)
      .map((metric) => this.serializeMetricForSave(metric, createdOptionsGroup, rawMetricsMap));

    if (updatedMetricSelections.length) {
      selections["meta"]["ui_metrics"] = updatedMetricSelections;
    }

    if (options) {
      if (options.title) {
        selections["meta"]["title"] = options.title;
      }
      if (options.update) {
        const urlParams = new URLSearchParams(window.location.search);
        const report = urlParams.get("report");
        selections["report_id"] = report;
      }
    }

    return selections;
  }

  serializeMetricForSave(metric, createdOptionsGroup, rawMetricsMap) {
    if (!metric || typeof metric === "string") {
      return metric;
    }

    const isCreatedMetric = metric.group === createdOptionsGroup || !(metric.name in rawMetricsMap);
    if (!isCreatedMetric) {
      return metric.name;
    }

    const createdMetric = Object.assign({}, metric);
    delete createdMetric.active;
    delete createdMetric.group;
    return createdMetric;
  }

  buildSavedReportRouteQuery(specId, autorun = false) {
    const query: Record<string, string> = {
      warehouse: String(this.activeWarehouseId),
      report: String(specId),
    };

    if (autorun) {
      query.autorun = "true";
    }

    return query;
  }

  getRouteQueryValue(value) {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  hasSavedReportRouteQuery(query) {
    const routeQuery = (this.$route && this.$route.query) || {};
    return (
      this.getRouteQueryValue(routeQuery.warehouse) === query.warehouse &&
      this.getRouteQueryValue(routeQuery.report) === query.report &&
      this.getRouteQueryValue(routeQuery.autorun) === query.autorun
    );
  }

  buildCurrentBrowserUrl() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  readExplorerModalHistoryState() {
    const state = window.history.state;
    if (!state || state.explorerHistoryOwner !== "explorer") {
      return null;
    }
    return state;
  }

  isCurrentHistoryEntryForModal(modalId) {
    const state = this.readExplorerModalHistoryState();
    return state?.explorerModalId === modalId;
  }

  pushMobileModalHistoryState(modalId) {
    const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    window.history.pushState(
      Object.assign({}, currentState, {
        explorerHistoryOwner: "explorer",
        explorerModalId: modalId,
        explorerModalSequence: ++this.mobileModalHistorySequence,
      }),
      "",
      this.buildCurrentBrowserUrl()
    );
  }

  closeModalById(modalId) {
    (this.$refs[modalId] as any)?.close?.();
  }

  handleModalVisibilityChange(modalId, isVisible) {
    if (!this.mobileBackButtonClosesModal) {
      this.activeMobileModalId = isVisible
        ? modalId
        : this.activeMobileModalId === modalId
        ? null
        : this.activeMobileModalId;
      return;
    }

    if (isVisible) {
      this.activeMobileModalId = modalId;
      if (!this.isCurrentHistoryEntryForModal(modalId)) {
        this.pushMobileModalHistoryState(modalId);
      }
      return;
    }

    if (this.activeMobileModalId === modalId) {
      this.activeMobileModalId = null;
    }

    if (this.isCurrentHistoryEntryForModal(modalId)) {
      window.history.back();
    }
  }

  buildSavedReportUrl(path, query, hash = "") {
    const urlParams = new URLSearchParams(query);
    const search = urlParams.toString();
    return `${path}${search ? `?${search}` : ""}${hash || ""}`;
  }

  async updateSavedReportUrl(specId, autorun = false) {
    const query = this.buildSavedReportRouteQuery(specId, autorun);
    const path = (this.$route && this.$route.path) || window.location.pathname;
    const hash = (this.$route && this.$route.hash) || window.location.hash || "";
    const targetUrl = this.buildSavedReportUrl(path, query, hash);

    if (!this.hasSavedReportRouteQuery(query) && this.$router && typeof this.$router.replace === "function") {
      try {
        await this.$router.replace({ path, query, hash });
      } catch {
        // Fall back to direct history updates if router navigation fails.
      }
    }

    window.history.replaceState(window.history.state ?? {}, "", targetUrl);
  }

  validate() {
    try {
      this.selections;
      const chunkWindowingValidation = this.validateChunkWindowing();
      if (!chunkWindowingValidation.valid) {
        return chunkWindowingValidation;
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        return { valid: false, error: err };
      } else {
        throw err;
      }
    }
    return { valid: true, error: null };
  }

  addValidationErrorNotification(msg = "Please fix validation errors") {
    dispatchAddNotification(this.$store, { content: msg, color: "error" });
  }

  setPageTitle(title) {
    this.pageTitleBase = title || "Zillion";
    this.updateDocumentTitle();
  }

  private updateDocumentTitle() {
    document.title = this.showBackgroundCompletionIndicator
      ? `${Explorer.reportReadyTitleIndicator}${this.pageTitleBase}`
      : this.pageTitleBase;
  }

  private clearBackgroundCompletionIndicator() {
    if (!this.showBackgroundCompletionIndicator) {
      return;
    }

    this.showBackgroundCompletionIndicator = false;
    this.updateDocumentTitle();
  }

  private handleReportExecutionFinished() {
    if (!this.reportExecutionPendingCompletion) {
      return;
    }

    this.reportExecutionPendingCompletion = false;
    this.showBackgroundCompletionIndicator = !!document.hidden;
    this.updateDocumentTitle();
  }

  defaultTitle() {
    const metrics = this.selectedMetrics;
    const dimensions = (this.$refs.dimensions as any).selected;
    const metricParts: any[] = [];
    const dimParts: any[] = [];
    let title = "";

    for (const field of metrics) {
      const def = this.fieldDefFromName(field);
      metricParts.push(def.display_name);
    }

    title = metricParts.join(", ");

    if (metricParts.length && dimensions.length) {
      title += " by ";
    }

    for (const field of dimensions) {
      if (typeof field !== "string") {
        dimParts.push(field.display_name);
      } else {
        const def = this.fieldDefFromName(field);
        dimParts.push(def.display_name);
      }
    }
    title += dimParts.join(", ");

    return title;
  }

  normalizeGraphOptions(graphOptions = {}) {
    const normalizedOptions = Object.assign({}, this.graphOptions, graphOptions);

    if (!normalizedOptions.graphType || !this.supportedGraphTypes.includes(normalizedOptions.graphType)) {
      normalizedOptions.graphType = null;
    }

    return normalizedOptions;
  }

  openReportSaveDialog() {
    const vresult = this.validate();
    if (!vresult.valid) {
      this.addValidationErrorNotification(vresult.error?.message);
      return;
    }

    const openDialog = () => {
      (this.$refs.reportSaveDialog as any).open(this.reportTitle || this.defaultTitle());
    };

    openDialog();
  }

  openReportFromTextDialog() {
    // (this.$refs.reportFromTextDialog as any).open();
    dispatchAddWarning(this.$store, "NLP Report is temporarily disabled");
  }

  getActiveReportRows() {
    if (!this.hasReportData()) {
      return [];
    }
    return (this.$refs.reportResultTableCard as any)?.getActiveRows?.() || [];
  }

  openAbTestDialog(prefill = {}) {
    if (!this.hasReportData()) {
      dispatchAddWarning(this.$store, "Run a report first to analyze AB results");
      return;
    }

    const dialog = this.$refs.reportAbTestDialog as any;
    dialog.open(prefill, this.getActiveReportRows());
    if (dialog.hasCompleteConfig()) {
      this.analyzeAbTest();
    }
  }

  async analyzeAbTest() {
    if (!this.hasReportData()) {
      return;
    }
    await (this.$refs.reportAbTestDialog as any)?.runAnalysis?.(this.getActiveReportRows());
  }

  setAbControlFromDimension(dim) {
    this.openAbTestDialog({
      armDimension: dim.name,
      controlValue: dim.value,
    });
  }

  setAbVariantFromDimension(dim) {
    this.openAbTestDialog({
      armDimension: dim.name,
      variantValue: dim.value,
    });
  }

  downloadReport() {
    if (!this.hasReportData()) {
      dispatchAddWarning(this.$store, "No report data found for download");
      return;
    }
    const dataString = (this.$refs.reportResultTableCard as any).getActiveDataString();
    const blob = new Blob([dataString], { type: "text/csv;charset=utf-8" });
    let fName = "report.csv";
    if (this.reportTitle && this.reportTitle.length) {
      fName = this.reportTitle + ".csv";
    }
    FileSaver.saveAs(blob, fName);
  }

  async run() {
    if (!this.isMounted) {
      return;
    }

    dispatchClearNotifications(this.$store);

    if (!this.warehouseActive) {
      dispatchAddWarning(this.$store, "Please activate a warehouse to run reports");
      return;
    }

    const vresult = this.validate();
    if (!vresult.valid) {
      this.addValidationErrorNotification(vresult.error?.message);
      return;
    }

    const selections = this.selections;
    console.log("Run:", selections);

    // TODO: we use this to help manage the loading overlay. This may be
    // better off in vuex, or the loading overlay state brought out of vuex.
    this.graphComplete = false;
    this.reportExecutionPendingCompletion = true;
    this.clearBackgroundCompletionIndicator();
    const success = await dispatchExecuteReport(this.$store, selections);
    if (!success) {
      this.reportExecutionPendingCompletion = false;
    }
    if (!success && this.breakpointMdOrLess) {
      await this.bringSettingsDrawerIntoView();
    }
    if (success) {
      saveSessionWarehouseId(this.activeWarehouseId!);
      saveSessionReportRequest(selections);
    }
    if (this.resultLayout === "tabs" && this.tab === "tableTab") {
      // Not rendering graph yet, can close overlay immediately
      dispatchExplorerCloseLoadingOverlay(this.$store);
      dispatchExplorerSetReportState(this.$store, "");
      this.handleReportExecutionFinished();
    }
  }

  async save(options) {
    if (!this.warehouseActive) {
      dispatchAddWarning(this.$store, "Please activate a warehouse to save reports");
      return;
    }

    const pausedMetricDisplayNames = new Set<string>();
    let pauseResult = this.pauseUnsupportedMetricsForSave();
    for (const metricName of pauseResult.pausedMetricDisplayNames) {
      pausedMetricDisplayNames.add(metricName);
    }
    if (pauseResult.updatedSelections.length) {
      await this.$nextTick();
    }

    let vresult = this.validate();
    if (!vresult.valid) {
      this.addValidationErrorNotification(vresult.error?.message);
      return;
    }

    let selections = this.buildSaveSelections(options, pauseResult.updatedSelections);
    console.log("Save:", selections);
    let result: any = await dispatchSaveReport(this.$store, selections);

    for (let retry = 0; retry < 2 && result?.error_type === "unsupported_grain"; retry++) {
      pauseResult = this.pauseUnsupportedMetricsForSave();
      if (!pauseResult.updatedSelections.length) {
        break;
      }

      for (const metricName of pauseResult.pausedMetricDisplayNames) {
        pausedMetricDisplayNames.add(metricName);
      }
      await this.$nextTick();

      vresult = this.validate();
      if (!vresult.valid) {
        this.addValidationErrorNotification(vresult.error?.message);
        return;
      }

      selections = this.buildSaveSelections(options, pauseResult.updatedSelections);
      console.log("Save retry:", selections);
      result = await dispatchSaveReport(this.$store, selections);
    }

    if (!result?.spec_id) {
      if (result?.error_type === "unsupported_grain") {
        dispatchAddNotification(this.$store, {
          content:
            "Unable to save report automatically. Review the highlighted metrics and related settings, then try again.",
          color: "error",
        });
      }
      return;
    }

    if (pausedMetricDisplayNames.size) {
      dispatchAddNotification(this.$store, {
        content: `Paused unsupported metrics before saving: ${Array.from(pausedMetricDisplayNames).join(", ")}`,
        color: "warning",
      });
    }

    saveSessionWarehouseId(this.activeWarehouseId!);
    saveSessionReportRequest(selections);

    await this.updateSavedReportUrl(result.spec_id, !!(options && options.autorun));
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

  async load(report, autorun = false) {
    console.log("Load:", report);
    await this.$nextTick();

    for (const selector of this.reportSelectors) {
      const selectorValue =
        selector === "criteria" && report.meta?.ui_criteria !== undefined ? report.meta.ui_criteria : report[selector];
      if (selectorValue === null || selectorValue === undefined) {
        continue;
      }
      (this.$refs[selector] as any).selected = selectorValue;
    }
    this.limitFirst = report["limit_first"];
    this.chunkWindowSize = report.meta?.windowing?.size ?? null;

    if (report.meta) {
      (this.$refs.reportAbTestDialog as any)?.loadConfig?.(report.meta.abTest || null);
      if (report.meta.ui_metrics) {
        (this.$refs.metrics as any).uiSelected = report.meta.ui_metrics;
      }
      if (report.meta.graphOptions) {
        Object.assign(this.graphOptions, this.normalizeGraphOptions(report.meta.graphOptions));
      }
      if (report.meta.resultLayout) {
        dispatchExplorerSetResultLayout(this.$store, report.meta.resultLayout);
      }
      if (report.meta.title) {
        this.reportTitle = report.meta.title;
      }
    } else {
      this.chunkWindowSize = null;
      (this.$refs.reportAbTestDialog as any)?.loadConfig?.(null);
    }

    if (autorun) {
      await this.scheduleAutorun();
    }
  }

  private async scheduleAutorun() {
    if (!this.isMounted) {
      this.pendingAutorun = true;
      return;
    }

    this.pendingAutorun = false;
    await this.$nextTick();
    await this.run();
  }

  async loadReportSpecId(specId, autorun = false) {
    if (!this.warehouseActive) {
      dispatchAddWarning(this.$store, "Please activate a warehouse to load reports");
      return;
    }
    const report = await dispatchGetReportFromId(this.$store, specId);
    if (!report) {
      return;
    }
    await this.load(report, autorun);
    this.setPageTitle((report?.meta as any).title || specId);
  }

  async loadFromText({ text, autorun }) {
    // if (!this.warehouseActive) {
    //   dispatchAddWarning(this.$store, "Please activate a warehouse to load reports");
    //   return;
    // }

    // dispatchExplorerSetReportState(this.$store, "Doing the AIs...");
    // dispatchExplorerOpenLoadingOverlay(this.$store);
    // try {
    //   const report = await dispatchGetReportFromText(this.$store, text);
    //   if (!report) {
    //     return;
    //   }
    //   console.log("Load from text:", report);
    //   this.load(report, autorun);
    //   dispatchExplorerOpenSettingsDrawer(this.$store);
    //   this.setPageTitle((report?.meta as any).title || text);
    // } finally {
    //   dispatchExplorerCloseLoadingOverlay(this.$store);
    //   dispatchExplorerSetReportState(this.$store, "");
    // }
    dispatchAddWarning(this.$store, "NLP Report is temporarily disabled");
  }

  private hasInitialSelections() {
    const metrics = (this.$refs.metrics as any)?.selected || [];
    const dimensions = (this.$refs.dimensions as any)?.selected || [];
    const criteria = (this.$refs.criteria as any)?.selected || [];
    const rowFilters = (this.$refs.row_filters as any)?.selected || [];
    const orderBy = (this.$refs.order_by as any)?.selected || [];
    const rollup = (this.$refs.rollup as any)?.selected;

    return !!(metrics.length || dimensions.length || criteria.length || rowFilters.length || orderBy.length || rollup);
  }

  private applyDefaultDateCriteriaIfEmpty() {
    if (!this.warehouseActive || this.hasReportData() || this.hasInitialSelections()) {
      return;
    }

    const criteriaRef = this.$refs.criteria as any;
    if (!criteriaRef || !("selected" in criteriaRef)) {
      return;
    }

    const dateField = (this.warehouseNonFormulaDimensions as Record<string, any>)?.date;
    if (!dateField || this.fieldType(dateField) !== "date") {
      return;
    }

    const today = getToday("date");
    criteriaRef.selected = [[dateField.name, "between", [today, today]]];
  }

  async mounted() {
    await dispatchHydrateExplorerStore(this.$store);
    this.isHydrated = true;
    await this.$nextTick();

    if (this.$route.query.warehouse) {
      const warehouseId = parseInt(this.$route.query.warehouse as any, 10);
      const activated = await dispatchSetActiveWarehouseId(this.$store, warehouseId);

      if (activated && this.$route.query.report) {
        let autorun = false;
        if (this.$route.query.autorun) {
          const val = this.$route.query.autorun;
          // Probably a better way to do this
          if (val !== "false" && val !== "0") {
            autorun = true;
          }
        }
        await this.loadReportSpecId(this.$route.query.report, autorun);
      }
    } else {
      if (this.$route.query.report) {
        dispatchAddWarning(this.$store, "Ignoring report url param as no warehouse url param is specified");
      }
      const request = getSessionReportRequest();
      const whId = getSessionWarehouseId();
      if (request && whId !== null) {
        const activated = await dispatchSetActiveWarehouseId(this.$store, whId as number);
        if (activated) {
          await this.load(request);
        }
      }
    }

    if (!this.activeWarehouseId) {
      await dispatchSetDefaultWarehouseId(this.$store);
    }

    this.applyDefaultDateCriteriaIfEmpty();

    this.addKeyListener();
    this.addNotificationDismissListener();
    this.addPopStateListener();
    this.addVisibilityChangeListener();
    if (!this.hasReportData()) {
      // Open the settings drawer on initial load
      dispatchExplorerOpenSettingsDrawer(this.$store);
    }

    if (this.$vuetify.breakpoint.mobile) {
      this.resultLayout = "wide";
    }

    this.isMounted = true;
    if (this.pendingAutorun) {
      await this.scheduleAutorun();
    }
  }

  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener);
    window.removeEventListener("zillion-notification-dismissed", this._notificationDismissListener);
    window.removeEventListener("popstate", this._popStateListener);
    document.removeEventListener("visibilitychange", this._visibilityChangeListener);
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

  @Watch("showGraph")
  onShowGraphChanged(val: object, oldVal: object) {
    if (!val) {
      if (this.tab === "graphTab") {
        this.tab = "tableTab";
      }
    } else {
      if (this.resultLayout === "tabs") {
        this.tab = "graphTab";
      }
    }
  }

  @Watch("graphComplete")
  onGraphCompleteChanged(val: object, oldVal: object) {
    if (val) {
      dispatchExplorerCloseLoadingOverlay(this.$store);
      dispatchExplorerSetReportState(this.$store, "");
      this.handleReportExecutionFinished();
    }
  }

  @Watch("reportResult")
  onReportResultChanged(val: object, oldVal: object) {
    if (!this.showGraph) {
      dispatchExplorerCloseLoadingOverlay(this.$store);
      dispatchExplorerSetReportState(this.$store, "");
      this.handleReportExecutionFinished();
    }
  }

  private keyListenerHandler(e) {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      this.openReportSaveDialog();
    } else if (e.key === "/" && e.ctrlKey) {
      e.preventDefault();
      // this.openReportFromTextDialog();
      dispatchAddWarning(this.$store, "NLP Report is temporarily disabled");
    } else if (e.key === "x" && e.ctrlKey) {
      e.preventDefault();
      this.run();
    } else if (e.key === "z" && e.ctrlKey) {
      e.preventDefault();
      dispatchExplorerToggleSettingsDrawer(this.$store);
    } else if (e.key === "D" && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      this.downloadReport();
    }
  }

  private addKeyListener() {
    this._keyListener = this.keyListenerHandler.bind(this);
    document.addEventListener("keydown", this._keyListener);
  }

  private addNotificationDismissListener() {
    this._notificationDismissListener = () => {
      this.ignoreSettingsToggleUntil = Date.now() + 750;
    };
    window.addEventListener("zillion-notification-dismissed", this._notificationDismissListener);
  }

  private addPopStateListener() {
    this._popStateListener = () => {
      if (!this.mobileBackButtonClosesModal || !this.activeMobileModalId) {
        return;
      }
      this.closeModalById(this.activeMobileModalId);
    };
    window.addEventListener("popstate", this._popStateListener);
  }

  private addVisibilityChangeListener() {
    this._visibilityChangeListener = () => {
      if (!document.hidden) {
        this.clearBackgroundCompletionIndicator();
      }
    };
    document.addEventListener("visibilitychange", this._visibilityChangeListener);
  }
}
</script>

<style>
.explorer-report-output {
  box-sizing: border-box;
  height: 100%;
  margin-bottom: 20px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.explorer-window-size-input {
  max-width: 7.5rem;
}

@media (max-width: 600px) {
  .explorer-window-size-input {
    max-width: none;
  }
}
</style>
