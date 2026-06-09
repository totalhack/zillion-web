<template>
  <div id="bb-container" :class="['report-result-graph', { 'report-result-graph--tabs': resultLayout === 'tabs' }]">
    <div id="graph-stage" class="graph-stage">
      <div
        id="graph"
        @mouseleave="hideToolTip"
        @dblclick.stop="resetLegendSelections()"
        class="graph-stage__surface"
      ></div>
    </div>
    <div class="graph-legend-area">
      <div id="legend" @touchstart="hideToolTip" @dblclick.stop="resetLegendSelections()" class="legend-container">
        <button
          v-for="seriesId in visibleSeriesIdsByControls"
          :key="seriesId"
          :title="seriesId"
          type="button"
          :class="[
            'bb-legend-item',
            'legend-button',
            legendItemClass,
            isSeriesManuallyHidden(seriesId) ? manualHiddenLegendClass : '',
          ]"
          @click.stop="handleLegendItemClick(seriesId, $event.altKey)"
          @mouseenter="handleLegendItemMouseEnter(seriesId)"
          @mouseleave="handleLegendItemMouseLeave()"
          @focus="handleLegendItemMouseEnter(seriesId)"
          @blur="handleLegendItemMouseLeave()"
        >
          <span class="legend-color-box" :style="{ backgroundColor: getSeriesColor(seriesId) }"></span>
          {{ seriesId }}
        </button>
      </div>
      <div v-if="seriesSearchTerm && visibleSeriesIdsByControls.length === 0" class="graph-legend-controls__empty">
        No matching series
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch, Vue } from "vue-property-decorator";
import ReportManagerMixin from "@/components/mixins/ReportManagerMixin.vue";
import { dispatchAddNotification } from "@/store/main/actions";

// https://github.com/naver/billboard.js/wiki/CHANGELOG-v2#modularization-by-its-functionality
import { bb, line, bar, area, zoom, selection } from "billboard.js";
import "billboard.js/dist/billboard.css";
import "billboard.js/dist/theme/insight.css";

import { schemeTableau10 } from "d3-scale-chromatic";
import { select, mouse } from "d3-selection";

// TODO: remove eventually: https://github.com/naver/billboard.js/issues/1619
selection();
line();

const chartColorPattern = [...schemeTableau10];

@Component
export default class ReportResultGraph extends Mixins(ReportManagerMixin) {
  @Prop({ default: { graphType: null, multiAxis: false, logYScale: false } }) graphOptions;
  @Prop({ default: null }) resultLayout!: string | null;
  @Prop({ default: "" }) seriesSearchTerm!: string;
  @Prop({ default: null }) tab!: string | null;

  public $chart: any = null;
  public showLegend: boolean = true;
  public maxXCharsAllowed = 40;
  public defaultChartHeight = 320;
  public defaultWideChartHeight = 380;
  public manuallyHiddenSeriesIds: string[] = [];
  public manualHiddenLegendClass = "legend-item-manual-hidden";
  public hoveredLegendSeriesId: string | null = null;

  get baseChartHeight() {
    return this.resultLayout === "tabs" ? this.defaultChartHeight : this.defaultWideChartHeight;
  }

  getLegendElement() {
    return document.getElementById("legend");
  }

  getGraphElement() {
    return document.getElementById("graph");
  }

  getGraphStageElement() {
    return document.getElementById("graph-stage");
  }

  get graphTypeName() {
    if (!this.graphOptions) {
      return null;
    }
    return this.graphOptions.graphType;
  }

  get graphType() {
    if (!this.graphOptions.graphType) {
      return null;
    }
    const fMap = {
      area,
      bar,
      line,
      normalized: bar,
      stackedArea: area,
      stackedBar: bar,
    };
    if (!(this.graphTypeName in fMap)) {
      return null;
    }
    return fMap[this.graphTypeName]();
  }

  get multiAxis() {
    return this.graphOptions.multiAxis;
  }

  get logYScale() {
    return this.graphOptions.logYScale;
  }

  get legendSize() {
    if (!this.showLegend || !this.$chart) {
      return 0;
    }
    return Object.values(this.$chart.xs()).length;
  }

  resetLegendSelections() {
    this.manuallyHiddenSeriesIds = [];
    if (this.$chart) {
      this.applyLegendVisibilityFilters();
    }
  }

  resize(height: number | null = null) {
    if (!this.$chart || typeof this.$chart.resize !== "function") {
      return;
    }

    const graphStageHeight = this.getGraphStageElement()?.clientHeight || 0;
    this.$chart.resize({
      height: height || graphStageHeight || this.baseChartHeight,
    });
  }

  hideToolTip(e) {
    select(".bb-tooltip-container").style("display", "none");
  }

  get metricsToGraph() {
    return this.reportResultMetricsDisplay;
  }

  get hasLegendControls() {
    return this.allSeriesIds.length > 0;
  }

  get legendLabelCount() {
    return this.allSeriesIds.length;
  }

  get metricFilterOptions() {
    return Object.keys(this.chartDataMetricBuckets || {});
  }

  get seriesSearchFilter() {
    const trimmed = this.seriesSearchTerm.trim().toLowerCase();
    const isNegated = trimmed.startsWith("!");

    return {
      isNegated,
      term: (isNegated ? trimmed.slice(1) : trimmed).trim(),
    };
  }

  get allSeriesIds() {
    const seriesIds: string[] = [];
    for (const metricName of this.metricFilterOptions) {
      seriesIds.push(...this.getMetricBucketIds(metricName));
    }
    return seriesIds;
  }

  get visibleSeriesIdsByControls() {
    const { isNegated, term } = this.seriesSearchFilter;
    const visibleSeriesIds: string[] = [];

    for (const metricName of this.metricFilterOptions) {
      for (const seriesId of this.getMetricBucketIds(metricName)) {
        const matchesSearch = this.seriesLabelMatchesSearch(seriesId, term);
        if (term && ((isNegated && matchesSearch) || (!isNegated && !matchesSearch))) {
          continue;
        }
        visibleSeriesIds.push(seriesId);
      }
    }

    return visibleSeriesIds;
  }

  get controlHiddenSeriesIds() {
    const visibleSeriesIds = new Set(this.visibleSeriesIdsByControls);
    return this.allSeriesIds.filter((seriesId) => !visibleSeriesIds.has(seriesId));
  }

  get graphHasNoXDim() {
    return false;
  }

  get xDimIndex() {
    if (!this.reportDimensions || this.graphHasNoXDim) {
      return null;
    }
    return this.reportDimensions.length - 1;
  }

  get xDim() {
    if (!this.reportDimensions || this.graphHasNoXDim) {
      return null;
    }
    return this.reportDimensions[this.reportDimensions.length - 1];
  }

  get xDimDisplay() {
    if (!this.reportDimensions || this.graphHasNoXDim) {
      return null;
    }
    return this.reportDimensionsDisplay[this.reportDimensions.length - 1];
  }

  get xDimCount() {
    if (!this.xDim) {
      return 0;
    }
    return 1;
  }

  get xDimType() {
    if ((this.xDim as any).formula) {
      // Assume it's a formula dimension, guess string type
      return "string";
    }
    const dim = this.warehouseDimensions[this.xDim!];
    return this.fieldType(dim);
  }

  get xIsCategorical() {
    return (this.xOptions as any).type === "category";
  }

  get dataHasZDims() {
    if (!this.reportDimensions || (this.xDim && this.reportDimensions.length < 2)) {
      return false;
    }
    return true;
  }

  get zDims() {
    return this.dataHasZDims ? this.reportDimensions.slice(0, this.reportDimensions.length - this.xDimCount) : [];
  }

  get zDimsDisplay() {
    return this.dataHasZDims
      ? this.reportDimensionsDisplay.slice(0, this.reportDimensions.length - this.xDimCount)
      : [];
  }

  get chartData() {
    const columns: object = {};
    const metricBuckets: object = {};
    const metricBucketStats: object = {};
    const reportResult = this.reportResult;

    if (!(this.xDim || this.zDims)) {
      return null;
    }

    if (reportResult != null) {
      const metrics = this.metricsToGraph;
      const dimensions = this.reportDimensionsDisplay;
      const reportData = reportResult.data;
      const xDim = this.xDimDisplay;
      const xDimValuesSorted = [];
      const xDimValueMap = new Map();
      const zDims = this.zDimsDisplay;

      const columnIndexes = {};
      for (const index of Object.keys(this.reportColumns)) {
        const column = this.reportColumns[index];
        columnIndexes[column] = index;
      }

      const nonRollupRows: any[] = [];

      for (const reportRow of reportData) {
        if (this.isRollupRow(reportRow)) {
          continue;
        }

        nonRollupRows.push(reportRow);

        if (this.xDim) {
          const xValue = reportRow[this.xDimIndex!];
          // Add to a map that tracks x axis positions in the order
          // we get new values
          if (!xDimValueMap.has(xValue)) {
            xDimValueMap.set(xValue, xDimValueMap.size);
          }
        }
      }

      if (this.xDim) {
        columns[xDim!] = [xDim].concat(Array.from(xDimValueMap.keys()));
      }

      const xDimLength = xDimValueMap.size;
      const zDimIndexes = Object.keys(zDims);

      for (const row of nonRollupRows) {
        for (const metric of metrics) {
          let bucketName: string = metric;
          const metricValue = row[columnIndexes[metric]];

          for (const zDimIndex of zDimIndexes) {
            // In multi-dimensional case, we create a series for each combination of
            // each metric and the non-x dimension (z dimensions). The bucketName
            // reflects the grouping and ends up in the graph legend/tooltips.
            bucketName = bucketName.concat("/" + row[zDimIndex]);
          }

          if (!(bucketName in columns)) {
            columns[bucketName] = new Array(1 + xDimLength).fill(null); // Add 1 for bucketName
            columns[bucketName][0] = bucketName;
            metricBucketStats[bucketName] = {
              yMin: metricValue,
              yMax: metricValue,
            };
          } else {
            metricBucketStats[bucketName].yMin = Math.min(metricBucketStats[bucketName].yMin, metricValue);
            metricBucketStats[bucketName].yMax = Math.max(metricBucketStats[bucketName].yMax, metricValue);
          }

          if (this.xDim) {
            const xIndex = xDimValueMap.get(row[this.xDimIndex!]);
            columns[bucketName][xIndex + 1] = metricValue; // Add 1 for bucketName
          } else {
            // Only zDims
            columns[bucketName].push(metricValue);
          }

          if (!(metric in metricBuckets)) {
            metricBuckets[metric] = [bucketName];
          } else if (!metricBuckets[metric].includes(bucketName)) {
            metricBuckets[metric].push(bucketName);
          }
        }
      }
    }

    return { columns: Object.values(columns), metricBuckets, metricBucketStats };
  }

  get chartDataColumns() {
    return (this.chartData as any).columns;
  }

  get chartDataColumnsNoXDim() {
    const result: any[] = [];
    for (const column of this.chartDataColumns) {
      if (column[0] === this.xDimDisplay) {
        continue;
      }
      result.push(column);
    }
    return result;
  }

  get chartDataXDimColumn() {
    for (const column of this.chartDataColumns) {
      if (column[0] === this.xDimDisplay) {
        return column;
      }
    }
    return [];
  }

  get chartDataXDimValues() {
    return this.chartDataXDimColumn.slice(1);
  }

  get chartDataMetricBuckets() {
    return (this.chartData as any).metricBuckets;
  }

  get chartDataMetricBucketStats() {
    return (this.chartData as any).metricBucketStats;
  }

  get maxBucketNameLength() {
    let max = 0;
    const buckets = (this.chartData as any).metricBucketStats;
    for (const bucketName of Object.keys(buckets)) {
      max = Math.max(bucketName.length, max);
    }
    return max;
  }

  get legendItemClass() {
    let legendItemClass = "legend-item-span";
    if (this.maxBucketNameLength) {
      const px = this.maxBucketNameLength * 7;
      if (px > 550) {
        legendItemClass = legendItemClass + " width-600";
      } else if (px > 500) {
        legendItemClass = legendItemClass + " width-550";
      } else if (px > 450) {
        legendItemClass = legendItemClass + " width-500";
      } else if (px > 400) {
        legendItemClass = legendItemClass + " width-450";
      } else if (px > 350) {
        legendItemClass = legendItemClass + " width-400";
      } else if (px > 300) {
        legendItemClass = legendItemClass + " width-350";
      } else if (px > 250) {
        legendItemClass = legendItemClass + " width-300";
      } else if (px > 200) {
        legendItemClass = legendItemClass + " width-250";
      }
    } else {
      legendItemClass = legendItemClass + " width-200";
    }

    return legendItemClass;
  }

  getMultiAxisAxesConfig(currentAxes) {
    const axes = currentAxes || {};
    let yAxis = "y";
    let yMin;
    let yMax;
    const metricBuckets = Object.values(this.chartDataMetricBuckets);
    const metricBucketStats = this.chartDataMetricBucketStats;

    metricBuckets.forEach((metricBucket, index) => {
      if (index >= metricBuckets.length / 2) {
        // Put right "half" of metrics on y2
        yAxis = "y2";
      }
      for (const bucket of metricBucket as any) {
        // Track absolute min/max across all Y axes
        yMin = Math.min(isNaN(yMin) ? null : yMin, metricBucketStats[bucket as any].yMin);
        yMax = Math.max(isNaN(yMax) ? null : yMax, metricBucketStats[bucket as any].yMax);
        axes[bucket] = yAxis;
      }
    });

    return { axes, yMin, yMax };
  }

  get showY2() {
    const metrics = this.reportMetricsDisplay;
    return this.multiAxis && metrics.length > 1;
  }

  get maxVisibleXAxisTickCount() {
    return this.$vuetify.breakpoint.mobile ? 20 : 100;
  }

  get timeseriesTickValues() {
    const xValues = this.chartDataXDimValues;
    const maxTickCount = this.maxVisibleXAxisTickCount;

    if (xValues.length <= maxTickCount) {
      return xValues;
    }

    const tickValues: any[] = [];
    const lastIndex = xValues.length - 1;
    const step = lastIndex / (maxTickCount - 1);

    for (let index = 0; index < maxTickCount; index += 1) {
      const valueIndex = Math.min(lastIndex, Math.round(index * step));
      const value = xValues[valueIndex];

      if (tickValues[tickValues.length - 1] !== value) {
        tickValues.push(value);
      }
    }

    return tickValues;
  }

  get xOptions() {
    if (!this.xDim) {
      return {};
    }

    const xLen = this.chartDataXDimColumn.length - 1;
    const dimType = this.xDimType;
    let options = {};

    switch (dimType) {
      case "integer":
      case "smallinteger":
      case "biginteger":
      case "float":
      case "numeric":
        options = {
          clipPath: false,
          tick: {
            rotate: 60,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100,
            },
          },
        };
        break;
      case "date":
        options = {
          type: "timeseries",
          clipPath: false,
          tick: {
            fit: true,
            count: Math.min(xLen, 100),
            multiline: false,
            format: "%Y-%m-%d",
            rotate: 60,
            values: this.timeseriesTickValues,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100,
            },
          },
        };
        break;
      case "datetime":
        options = {
          type: "timeseries",
          clipPath: false,
          tick: {
            fit: false,
            count: Math.min(xLen, 100),
            multiline: false,
            format: "%Y-%m-%d %H:%M:%S",
            rotate: 60,
            values: this.timeseriesTickValues,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100,
            },
          },
        };
        break;
      case "string":
      case "varchar":
      case "text":
      default:
        options = {
          type: "category",
          clipPath: false,
          tick: {
            fit: true,
            multiline: false,
            rotate: 60,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100,
            },
            format: (index, name) => {
              if (name === null) {
                return "null";
              }
              if (typeof name !== "string") {
                name = JSON.stringify(name);
              }
              return name.substr(0, this.maxXCharsAllowed);
            },
          },
        };
        break;
    }

    return options;
  }

  getBaseChartOptions() {
    const options = {
      bindto: this.getGraphElement(),
      data: {
        columns: this.chartDataColumns,
        type: this.graphType,
      },
      color: {
        pattern: chartColorPattern,
      },
      transition: {
        duration: 0,
      },
      axis: {
        x: this.xOptions,
        y: {},
        y2: {
          show: this.showY2,
        },
      },
      line: {
        connectNull: true,
      },
      grid: {
        x: {
          show: true,
        },
        y: {
          show: true,
        },
      },
      padding: {
        top: 2,
        right: 32 + (this.showY2 ? 40 : 0),
        bottom: 8,
      },
      legend: {
        show: false,
      },
      tooltip: {
        grouped: true,
        position: (data, width, height, element) => {
          const coord = mouse(element);
          let top = coord[1];
          let left = coord[0];

          const container = document.getElementById("bb-container");
          if (container) {
            const containerWidth = container.clientWidth;
            const tooltip = container.querySelector(".bb-tooltip-container");
            const tooltipWidth = tooltip?.clientWidth || 150;
            const tooltipHeight = tooltip?.clientHeight || 250;
            let pushRight = 85;

            if (this.$vuetify.breakpoint.mobile) {
              pushRight = 20;
            }

            if (coord[0] > containerWidth / 2) {
              // We are on the right half, put tooltips left
              left = coord[0] - tooltipWidth;
            } else {
              left = coord[0] + pushRight;
            }

            top = Math.max(coord[1] - tooltipHeight / 2, 0);
          }
          return { top, left };
        },
      },
    };

    if (!this.$vuetify.breakpoint.mobile) {
      options["zoom"] = {
        enabled: zoom(),
        type: "drag",
      };
    }

    if (this.xDim && this.xDimType === "datetime") {
      (options as any).data.xFormat = "%Y-%m-%d %H:%M:%S";
    }

    return options;
  }

  applyGraphTypeOverrides(options) {
    const groups: any[] = [];

    options.data["x"] = this.xDimDisplay;

    switch (this.graphTypeName) {
      case "line":
      case "area":
        options["point"] = {
          focus: {
            only: (options.axis.x as any).type === "category" ? false : true,
          },
        };
        break;
      case "bar":
        options.tooltip.grouped = false;
        options["bar"] = {
          width: {
            ratio: this.dataHasZDims ? 1 : 0.7,
          },
        };
        break;
      case "stackedBar":
        options.data.type = "bar";
        for (const column of this.chartDataColumns) {
          groups.push(column[0]);
        }
        options.data["groups"] = [groups];
        options["bar"] = {
          width: {
            ratio: 0.85,
          },
        };
        break;
      case "stackedArea":
        options.data.type = "area";
        options["point"] = {
          focus: {
            only: (options.axis.x as any).type === "category" ? false : true,
          },
        };
        for (const column of this.chartDataColumns) {
          groups.push(column[0]);
        }
        options.data["groups"] = [groups];
        break;
      case "normalized":
        options.data.type = "bar";
        options["bar"] = {
          width: {
            ratio: 0.9,
          },
        };
        for (const column of this.chartDataColumns) {
          groups.push(column[0]);
        }
        options.data["groups"] = [groups];
        options.data["stack"] = {
          normalize: true,
        };
        break;
      default:
        break;
    }
  }

  get xAxisMaxLength() {
    const xData = this.chartDataXDimColumn;
    const maxXLen = Math.max(...xData.map((el) => (el === null ? null : el.length)));
    return Math.min(maxXLen, this.maxXCharsAllowed);
  }

  setXAxisHeight(options) {
    const xData = this.chartDataXDimColumn;
    const maxXLen = Math.max(...xData.map((el) => (el === null ? null : el.length)));
    const maxCategories = 12;

    // Hack to make more room when there are many categorical
    // x ticks or they have long values
    if (xData.length > maxCategories || maxXLen > this.maxXCharsAllowed) {
      // Multiplier is somewhat arbitrary. Needs more testing.
      const height = 10 + 6 * Math.min(maxXLen, this.maxXCharsAllowed);
      options.axis.x["height"] = height;
    }
  }

  get chartOptions() {
    if (!this.graphTypeName || !this.graphType) {
      return {};
    }

    const metrics = this.reportMetricsDisplay;
    const groups: any[] = [];
    this.syncLegendAlignment(this.chartDataColumns.length);

    const options = this.getBaseChartOptions();

    if (this.showY2) {
      const axesConfig = this.getMultiAxisAxesConfig(null);
      options.data["axes"] = axesConfig.axes;
      // This doesn't have the desired effect, was hoping it would line up
      // the zero position when negative numbers are present but that doesnt
      // work since the scales are different.
      // if (axesConfig.yMin) {
      //   (options.axis.y as any).min = axesConfig.yMin;
      //   (options.axis.y2 as any).min = axesConfig.yMin;
      // }
    }

    if (this.logYScale) {
      options.axis.y["type"] = "log";
    }

    this.applyGraphTypeOverrides(options);
    this.setXAxisHeight(options);
    return options;
  }

  destroyChart() {
    if (this.$chart) {
      this.$chart = this.$chart.destroy();
    }
  }

  beforeDestroy() {
    this.destroyChart();
  }

  initChart(height: number | null = null) {
    if (this.$chart) {
      this.destroyChart();
    }
    if (!(this.metricsToGraph.length > 0)) {
      dispatchAddNotification(this.$store, { content: "No metrics to graph", color: "warning" });
      this.$emit("complete");
      return;
    }
    if (!this.chartData) {
      this.$emit("complete");
      return;
    }

    this.syncLegendFilterState();

    let options;
    try {
      options = this.chartOptions;
      console.log("Chart Data", options.data);
      this.$chart = bb.generate(options);
    } catch (err) {
      dispatchAddNotification(this.$store, { content: "Unable to build chart: " + err.message, color: "error" });
      this.destroyChart();
      this.$emit("complete");
      throw err;
    }

    // XXX Trying to make sure Vue doesnt waste cycles observing the chart.
    // Is this Necessary?
    Object.defineProperty(this, "$chart", { configurable: false });
    this.$chart.internal.hideTooltip = () => {
      return;
    };
    this.applyLegendVisibilityFilters(true);

    // TODO: It would be better if we could draw the right height initially
    // but it will require some work to get that working correctly.
    if (this.resultLayout !== "tabs") {
      height = (height || this.baseChartHeight) + (options.axis.x.height || 0);
    }
    this.resize(height);
    this.$emit("complete");
  }

  mounted() {
    this.$nextTick(() => {
      this.emitLegendLabelCount();
    });

    if (this.graphTypeName) {
      this.initChart();
    }
  }

  @Watch("legendLabelCount")
  onLegendLabelCountChanged() {
    this.emitLegendLabelCount();
  }

  @Watch("graphTypeName")
  onGraphTypeNameChanged(val: object, oldVal: object) {
    if (val) {
      setTimeout(this.initChart, 25);
    }
  }

  @Watch("logYScale")
  onLogYScaleChanged(val: object, oldVal: object) {
    if (val) {
      this.$chart.config("axis.y.type", "log");
    } else {
      this.$chart.config("axis.y.type", "indexed");
    }
    this.$chart.flush();
  }

  @Watch("multiAxis")
  onMultiAxisChanged(val: object, oldVal: object) {
    setTimeout(this.initChart, 25);
  }

  @Watch("seriesSearchTerm")
  onSeriesSearchTermChanged() {
    this.applyLegendVisibilityFilters(true);
  }

  @Watch("tab")
  onTabChanged(val: string, oldVal: string) {
    if (oldVal === null) {
      return;
    }
    if (this.$chart && val === "graphTab") {
      // HACK: need setTimeout so resize() checks parent height after
      // tab has rendered
      setTimeout(() => {
        this.resize();
      });
    }
  }

  @Watch("reportResult")
  onReportResultChanged(val: object, oldVal: object) {
    this.resetLegendFilterState();
    if (this.graphTypeName) {
      if (!this.reportResult) {
        this.$emit("complete");
        return;
      }
      let height: any = null;
      if (this.resultLayout === "tabs" && this.tab === "tableTab") {
        // HACK: get the graph height closer to what it should be. By
        // default BB will draw it at 320 px tall, and then on tab switch
        // we resize. This gets the initial state looking closer to the
        // full graph tab height
        height = window.innerHeight * 0.7;
      }
      this.initChart((height = height));
    }
  }

  getMetricBucketIds(metricName: string) {
    return (this.chartDataMetricBuckets[metricName] || []).slice();
  }

  seriesLabelMatchesSearch(seriesId: string, searchTerm = this.seriesSearchFilter.term) {
    return !searchTerm || seriesId.toLowerCase().includes(searchTerm);
  }

  isSeriesManuallyHidden(seriesId: string) {
    return this.manuallyHiddenSeriesIds.includes(seriesId) && this.visibleSeriesIdsByControls.includes(seriesId);
  }

  getSeriesColor(seriesId: string) {
    const seriesColumns = this.chartDataColumnsNoXDim || [];
    const seriesIndex = seriesColumns.findIndex((column) => column[0] === seriesId);
    if (seriesIndex < 0) {
      return chartColorPattern[0];
    }
    return chartColorPattern[seriesIndex % chartColorPattern.length];
  }

  updateManualSeriesSelection(seriesId: string, isolate = false) {
    if (!this.allSeriesIds.includes(seriesId)) {
      return;
    }

    const visibleSeriesIds = this.visibleSeriesIdsByControls;
    if (!visibleSeriesIds.includes(seriesId)) {
      return;
    }

    if (isolate) {
      this.manuallyHiddenSeriesIds = visibleSeriesIds.filter((id) => id !== seriesId);
      return;
    }

    const hiddenSeriesIds = new Set(this.manuallyHiddenSeriesIds);
    if (hiddenSeriesIds.has(seriesId)) {
      hiddenSeriesIds.delete(seriesId);
    } else {
      hiddenSeriesIds.add(seriesId);
    }
    this.manuallyHiddenSeriesIds = Array.from(hiddenSeriesIds);
  }

  handleLegendItemClick(seriesId: string, isolate = false) {
    this.handleLegendItemMouseLeave();
    this.updateManualSeriesSelection(seriesId, isolate);
    this.applyLegendVisibilityFilters();
  }

  handleLegendItemMouseEnter(seriesId: string) {
    if (!this.$chart || this.isSeriesManuallyHidden(seriesId) || this.hoveredLegendSeriesId === seriesId) {
      return;
    }

    this.hoveredLegendSeriesId = seriesId;
    this.$chart.focus(seriesId);
  }

  handleLegendItemMouseLeave() {
    if (!this.$chart || this.hoveredLegendSeriesId === null) {
      return;
    }

    this.hoveredLegendSeriesId = null;
    this.$chart.revert();
  }

  resetLegendFilterState() {
    this.$emit("update:seriesSearchTerm", "");
    this.manuallyHiddenSeriesIds = [];
  }

  emitLegendLabelCount() {
    this.$emit("legend-label-count-change", this.legendLabelCount);
  }

  syncLegendFilterState() {
    const allSeriesIds = new Set(this.allSeriesIds);
    this.manuallyHiddenSeriesIds = this.manuallyHiddenSeriesIds.filter((seriesId) => allSeriesIds.has(seriesId));
  }

  syncLegendAlignment(seriesCount = this.chartDataColumns.length) {
    const legend = this.getLegendElement();
    if (!legend) {
      return;
    }

    legend.classList.remove("justify-left");
    legend.classList.remove("justify-center");
    legend.classList.add("justify-center");
  }

  applyLegendVisibilityFilters(skipResize: boolean = false) {
    if (!this.$chart || !this.hasLegendControls) {
      return;
    }

    this.syncLegendFilterState();

    const visibleSeriesIds = this.visibleSeriesIdsByControls;
    const hiddenSeriesIds = this.controlHiddenSeriesIds;
    const visibleSeriesSet = new Set(visibleSeriesIds);
    const manuallyHiddenVisibleSeriesIds = this.manuallyHiddenSeriesIds.filter((seriesId) =>
      visibleSeriesSet.has(seriesId)
    );
    const chartHiddenSeriesIds = Array.from(new Set(hiddenSeriesIds.concat(manuallyHiddenVisibleSeriesIds)));
    const chartHiddenSeriesSet = new Set(chartHiddenSeriesIds);
    const chartVisibleSeriesIds = this.allSeriesIds.filter((seriesId) => !chartHiddenSeriesSet.has(seriesId));

    if (chartVisibleSeriesIds.length) {
      this.$chart.show(chartVisibleSeriesIds, { withLegend: false });
    }

    if (chartHiddenSeriesIds.length) {
      this.$chart.hide(chartHiddenSeriesIds, { withLegend: false });
    }

    this.$chart.flush();
    this.syncLegendAlignment(visibleSeriesIds.length);

    if (!skipResize) {
      this.resize();
    }
  }
}
</script>

<style>
/* See https://naver.github.io/billboard.js/release/latest/dist/theme/insight.css */
.bb svg {
  font-size: 13px;
  line-height: 1;
}

.bb-tooltip-container {
  pointer-events: auto !important;
  overflow: scroll;
  max-height: 50vh;
  font-family: Helvetica;
  line-height: 1rem !important;
  color: #272727;
}

.bb-axis-y text,
.bb-axis-y2 text {
  fill: #272727;
}

.bb-legend-item {
  font: normal 13px Helvetica;
  color: #272727;
  letter-spacing: unset !important;
}

.bb text,
.bb .bb-button {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  fill: #272727;
  font-size: 13px;
  font-family: Helvetica !important;
  font-weight: 500;
  letter-spacing: unset !important;
}

.report-result-graph {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
  width: 100%;
}

.graph-stage {
  min-width: 0;
  width: 100%;
}

.report-result-graph--tabs .graph-stage {
  flex: 1 1 auto;
  min-height: 0;
}

.graph-stage__surface {
  width: 100%;
}

.report-result-graph--tabs .graph-stage__surface {
  height: 100%;
}

.graph-legend-area {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px;
  width: 100%;
}

.graph-legend-controls__empty {
  color: rgba(39, 39, 39, 0.72);
  font: 500 12px Helvetica;
  text-align: center;
}

.legend-container {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  justify-content: center;
  overflow-y: auto;
  overflow-x: unset;
  max-height: 80px;
  padding: 0;
  white-space: normal;
  width: 100%;
}

.legend-container .bb-legend-item {
  flex: 0 0 auto;
}

.legend-button {
  align-items: center;
  appearance: none;
  background: none;
  border: 0;
  color: #272727;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 12px;
  gap: 6px;
  line-height: 1.15;
  margin: 0;
  padding: 0;
}

.legend-button:focus-visible {
  outline: 1px solid rgba(39, 39, 39, 0.45);
  outline-offset: 2px;
}

.legend-container.justify-center {
  justify-content: center;
}

.legend-container.justify-left {
  justify-content: flex-start;
}

.legend-container .legend-item-manual-hidden {
  opacity: 0.45;
}

.legend-color-box {
  display: block;
  flex: 0 0 10px;
  width: 10px;
  height: 10px;
  margin-right: 0;
}

.legend-item-span {
  display: inline-flex;
  align-items: center;
  padding-left: 8px;
  white-space: nowrap;
  overflow: hidden;
}

.width-200 {
  width: 200px;
}

.width-250 {
  width: 250px;
}

.width-300 {
  width: 300px;
}

.width-350 {
  width: 350px;
}

.width-400 {
  width: 400px;
}

.width-450 {
  width: 450px;
}

.width-500 {
  width: 500px;
}

.width-550 {
  width: 550px;
}

.width-600 {
  width: 600px;
}

.legend-item-span:hover {
  overflow: visible;
}

@media (max-width: 959px) {
  .graph-legend-area {
    padding: 0 12px 0 24px;
  }

  .legend-container {
    align-items: stretch;
    gap: 2px 0;
    justify-content: flex-start;
    overflow-x: hidden;
  }

  .legend-container .bb-legend-item {
    flex: 1 1 100%;
    max-width: 100%;
  }

  .legend-container .legend-item-span {
    justify-content: flex-start;
    padding-left: 0;
    width: 100%;
  }

  .legend-item-span:hover {
    overflow: hidden;
  }
}
</style>
