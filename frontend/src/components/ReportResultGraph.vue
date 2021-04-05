<template>
  <div id="bb-container">
    <div id="graph" @mouseleave="hideToolTip" class="mx-4"></div>
    <div
      id="legend"
      @touchstart="hideToolTip"
      class="ml-6 pl-5 legend-container d-flex flex-wrap justify-center"
    ></div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch, Vue } from 'vue-property-decorator';
import ReportManagerMixin from '@/components/mixins/ReportManagerMixin.vue';
import { dispatchAddNotification } from '@/store/main/actions';
import { IReportRequest } from '@/interfaces';
import { binaryFind, addSortedIfMissing } from '@/utils';

// https://github.com/naver/billboard.js/wiki/CHANGELOG-v2#modularization-by-its-functionality
import { bb, line, bar, area, scatter, zoom, selection } from 'billboard.js';
import 'billboard.js/dist/billboard.css';
import 'billboard.js/dist/theme/insight.css';

import { scaleOrdinal } from 'd3-scale';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { select, mouse } from 'd3-selection';

// TODO: remove eventually: https://github.com/naver/billboard.js/issues/1619
selection();
line();

@Component
export default class ReportResultGraph extends Mixins(ReportManagerMixin) {
  @Prop({ default: { graphType: null, multiAxis: false, logYScale: false } }) graphOptions;
  @Prop({ default: null }) resultLayout!: string | null;
  @Prop({ default: null }) tab!: string | null;

  public $chart: any = null;
  public showLegend: boolean = true;
  public maxXCharsAllowed = 40;
  public defaultChartHeight = 320;

  getLegendElement() {
    return document.getElementById('legend');
  }

  getGraphElement() {
    return document.getElementById('graph');
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
      scatter,
      stackedArea: area,
      stackedBar: bar,
    };
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

  getParentHeight() {
    return (this.$el.parentNode as any).clientHeight;
  }

  getLegendHeight() {
    return document.getElementById('legend')?.clientHeight || 0;
  }

  resize(height: number | null = null) {
    // When the legend is in a separate div, billboard.js doesn't seem
    // to account for it when setting chart height.
    this.$chart.resize({ height: height || (this.getParentHeight() - this.getLegendHeight()) });
  }

  hideToolTip(e) {
    select('.bb-tooltip-container').style('display', 'none');
  }

  get metricsToGraph() {
    if (this.graphTypeName === 'scatter') {
      return this.reportMetricsDisplay.slice(0, 2);
    }
    return this.reportMetricsDisplay;
  }

  get graphHasNoXDim() {
    // Whether the graph supports a x dim from the report dims (vs from a metric)
    if (this.graphTypeName === 'scatter') {
      return true;
    }
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
    const dim = this.warehouseDimensions[this.xDim!];
    return this.fieldType(dim);
  }

  get xIsCategorical() {
    return (this.xOptions as any).type === 'category';
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
    return this.dataHasZDims ?
      this.reportDimensionsDisplay.slice(0, this.reportDimensions.length - this.xDimCount) : [];
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
          if (!(xDimValueMap.has(xValue))) {
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
            bucketName = bucketName.concat('/' + row[zDimIndex]);
          }

          if (!(bucketName in columns)) {
            columns[bucketName] = new Array(1 + xDimLength).fill(null); // Add 1 for bucketName
            columns[bucketName][0] = bucketName;
            metricBucketStats[bucketName] = {
              yMin: metricValue,
              yMax: metricValue
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
          } else {
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

  getMultiAxisAxesConfig(currentAxes) {
    const axes = currentAxes || {};
    let yAxis = 'y';
    let yMin;
    let yMax;
    const metricBuckets = Object.values(this.chartDataMetricBuckets);
    const metricBucketStats = this.chartDataMetricBucketStats;

    metricBuckets.forEach((metricBucket, index) => {
      if (index >= (metricBuckets.length / 2)) {
        // Put right "half" of metrics on y2
        yAxis = 'y2';
      }
      for (const bucket of (metricBucket as any)) {
        // Track absolute min/max across all Y axes
        yMin = Math.min(isNaN(yMin) ? null : yMin, metricBucketStats[(bucket as any)].yMin);
        yMax = Math.max(isNaN(yMax) ? null : yMax, metricBucketStats[(bucket as any)].yMax);
        axes[bucket] = yAxis;
      }
    });

    return { axes, yMin, yMax };
  }

  get showY2() {
    const metrics = this.reportMetricsDisplay;
    return this.multiAxis && (metrics.length > 1);
  }

  get xOptions() {
    if (!this.xDim) {
      return {};
    }

    const dimType = this.xDimType;
    let options = {};

    switch (dimType) {
      case 'integer':
      case 'smallinteger':
      case 'biginteger':
      case 'float':
      case 'numeric':
        options = {
          clipPath: false,
          tick: {
            rotate: 60,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100
            }
          },
        };
        break;
      case 'date':
        options = {
          type: 'timeseries',
          clipPath: false,
          tick: {
            fit: false,
            count: 100,
            multiline: false,
            format: '%Y-%m-%d',
            rotate: 60,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100
            }
          },
        };
        break;
      case 'datetime':
        options = {
          type: 'timeseries',
          clipPath: false,
          tick: {
            fit: false,
            count: 100,
            multiline: false,
            format: '%Y-%m-%d %H:%M:%S',
            rotate: 60,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100
            }
          },
        };
        break;
      case 'string':
      case 'varchar':
      case 'text':
      default:
        options = {
          type: 'category',
          clipPath: false,
          tick: {
            fit: true,
            multiline: false,
            rotate: 60,
            culling: {
              max: this.$vuetify.breakpoint.mobile ? 20 : 100
            },
            format: (index, name) => {
              if (name === null) {
                return 'null';
              }
              return name.substr(0, this.maxXCharsAllowed);
            }
          }
        };
        break;
    }

    return options;
  }

  getBaseChartOptions() {
    let legendItemClass = 'legend-item-span';
    if (this.maxBucketNameLength) {
      const px = this.maxBucketNameLength * 7;
      if (px > 550) {
        legendItemClass = legendItemClass + ' width-600';
      } else if (px > 500) {
        legendItemClass = legendItemClass + ' width-550';
      } else if (px > 450) {
        legendItemClass = legendItemClass + ' width-500';
      } else if (px > 400) {
        legendItemClass = legendItemClass + ' width-450';
      } else if (px > 350) {
        legendItemClass = legendItemClass + ' width-400';
      } else if (px > 300) {
        legendItemClass = legendItemClass + ' width-350';
      } else if (px > 250) {
        legendItemClass = legendItemClass + ' width-300';
      } else if (px > 200) {
        legendItemClass = legendItemClass + ' width-250';
      }
    } else {
      legendItemClass = legendItemClass + ' width-200';
    }

    const options = {
      bindto: this.getGraphElement(),
      data: {
        columns: this.chartDataColumns,
        type: this.graphType,
      },
      color: {
        pattern: scaleOrdinal(schemeTableau10).range()
      },
      transition: {
        duration: 0,
      },
      axis: {
        x: this.xOptions,
        y: {},
        y2: {
          show: this.showY2,
        }
      },
      line: {
        connectNull: true
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
        top: 10,
        right: 20 + (this.showY2 ? 40 : 0),
        bottom: -10,
      },
      legend: {
        show: this.showLegend,
        contents: {
          bindto: this.getLegendElement(),
          template: (
            '<span class="' + legendItemClass + '">' +
            '<div class="legend-color-box" style="background-color:{=COLOR};"></div>' +
            '{=TITLE}</span>'
          )
        },
      },
      tooltip: {
        grouped: true,
        position: (data, width, height, element) => {
          const coord = mouse(element);
          let top = coord[1];
          let left = coord[0];

          const container = document.getElementById('bb-container');
          if (container) {
            const containerWidth = container.clientWidth;
            const tooltip = container.querySelector('.bb-tooltip-container');
            const tooltipWidth = tooltip?.clientWidth || 150;
            const tooltipHeight = tooltip?.clientHeight || 250;
            let pushRight = 85;

            if (this.$vuetify.breakpoint.mobile) {
              pushRight = 20;
            }

            if (coord[0] > (containerWidth / 2)) {
              // We are on the right half, put tooltips left
              left = coord[0] - tooltipWidth;
            } else {
              left = coord[0] + pushRight;
            }

            top = Math.max(coord[1] - (tooltipHeight / 2), 0);
          }
          return { top, left };
        },
      },
    };

    if (!this.$vuetify.breakpoint.mobile) {
      options['zoom'] = {
        enabled: zoom(),
        type: 'drag',
      };
    }

    if (this.xDim && this.xDimType === 'datetime') {
      (options as any).data.xFormat = '%Y-%m-%d %H:%M:%S';
    }

    return options;
  }

  applyGraphTypeOverrides(options) {
    const metrics = this.reportMetricsDisplay;
    const groups: any[] = [];

    switch (this.graphTypeName) {
      case 'scatter':
        if (this.reportMetrics.length < 2) {
          throw Error('Scatter plot requires at least two metrics');
        }
        const xs = {};
        const xsList = this.chartDataMetricBuckets[metrics[0]];
        const ysList = this.chartDataMetricBuckets[metrics[1]];
        for (const index of Object.keys(xsList)) {
          xs[ysList[index]] = xsList[index];
        }
        options.data['xs'] = xs;
        break;
      default:
        options.data['x'] = this.xDimDisplay;
        break;
    }

    switch (this.graphTypeName) {
      case 'line':
      case 'area':
        options['point'] = {
          focus: {
            only: (options.axis.x as any).type === 'category' ? false : true
          },
        };
        break;
      case 'bar':
        options.tooltip.grouped = false;
        options['bar'] = {
          width: {
            ratio: this.dataHasZDims ? 1 : 0.7,
          },
        };
        break;
      case 'stackedBar':
        options.data.type = 'bar';
        for (const column of this.chartDataColumns) {
          groups.push(column[0]);
        }
        options.data['groups'] = [groups];
        options['bar'] = {
          width: {
            ratio: 0.85,
          },
        };
        break;
      case 'stackedArea':
        options.data.type = 'area';
        options['point'] = {
          focus: {
            only: (options.axis.x as any).type === 'category' ? false : true
          },
        };
        for (const column of this.chartDataColumns) {
          groups.push(column[0]);
        }
        options.data['groups'] = [groups];
        break;
      case 'normalized':
        options.data.type = 'bar';
        options['bar'] = {
          width: {
            ratio: 0.9,
          },
        };
        for (const column of this.chartDataColumns) {
          groups.push(column[0]);
        }
        options.data['groups'] = [groups];
        options.data['stack'] = {
          normalize: true,
        };
        break;
      case 'scatter':
        options.axis.x = {
          label: metrics[0],
          tick: { fit: false }
        };
        (options.axis.y as any).label = metrics[1];
        options.tooltip['format'] = {
          title: (d) => metrics[0] + ': ' + d
        };
        break;
      default:
        break;
    }
  }

  get xAxisMaxLength() {
    const xData = this.chartDataXDimColumn;
    const maxXLen = Math.max(...(xData.map((el) => el === null ? null : el.length)));
    return Math.min(maxXLen, this.maxXCharsAllowed);
  }

  setXAxisHeight(options) {
    const xData = this.chartDataXDimColumn;
    const maxXLen = Math.max(...(xData.map((el) => el === null ? null : el.length)));
    const maxCategories = 12;

    // Hack to make more room when there are many categorical
    // x ticks or they have long values
    if (xData.length > maxCategories || maxXLen > this.maxXCharsAllowed) {
      // Multiplier is somewhat arbitrary. Needs more testing.
      const height = 10 + 6 * Math.min(maxXLen, this.maxXCharsAllowed);
      options.axis.x['height'] = height;
    }
  }

  get chartOptions() {
    if (!this.graphTypeName) {
      return {};
    }

    const metrics = this.reportMetricsDisplay;
    const groups: any[] = [];
    const legend = this.getLegendElement();

    if (this.chartDataColumns.length > 20) {
      legend?.classList.remove('justify-center');
      legend?.classList.add('justify-left');
    } else {
      legend?.classList.remove('justify-left');
      legend?.classList.add('justify-center');
    }

    const options = this.getBaseChartOptions();

    if (this.showY2) {
      const axesConfig = this.getMultiAxisAxesConfig(null);
      options.data['axes'] = axesConfig.axes;
      // This doesn't have the desired effect, was hoping it would line up
      // the zero position when negative numbers are present but that doesnt
      // work since the scales are different.
      // if (axesConfig.yMin) {
      //   (options.axis.y as any).min = axesConfig.yMin;
      //   (options.axis.y2 as any).min = axesConfig.yMin;
      // }
    }

    if (this.logYScale) {
      options.axis.y['type'] = 'log';
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
    if (!this.chartData) {
      this.$emit('complete');
      return;
    }

    let options;
    try {
      options = this.chartOptions;
      this.$chart = bb.generate(options);
    } catch (err) {
      dispatchAddNotification(
        this.$store,
        { content: 'Unable to build chart: ' + err.message, color: 'error' }
      );
      this.destroyChart();
      this.$emit('complete');
      throw (err);
    }

    // XXX Trying to make sure Vue doesnt waste cycles observing the chart.
    // Is this Necessary?
    Object.defineProperty(this, '$chart', { configurable: false });
    this.$chart.internal.hideTooltip = () => { return; };

    // TODO: It would be better if we could draw the right height initially
    // but it will require some work to get that working correctly.
    if (this.resultLayout !== 'tabs') {
      height = (height || this.defaultChartHeight) + options.axis.x.height;
    }
    this.resize(height);
    this.$emit('complete');
  }

  mounted() {
    if (this.graphTypeName) {
      this.initChart();
    }
  }

  @Watch('graphTypeName')
  onGraphTypeNameChanged(val: object, oldVal: object) {
    if (val) {
      setTimeout(this.initChart, 25);
    }
  }

  @Watch('logYScale')
  onLogYScaleChanged(val: object, oldVal: object) {
    if (val) {
      this.$chart.config('axis.y.type', 'log');
    } else {
      this.$chart.config('axis.y.type', 'indexed');
    }
    this.$chart.flush();
  }

  @Watch('multiAxis')
  onMultiAxisChanged(val: object, oldVal: object) {
    setTimeout(this.initChart, 25);
  }

  @Watch('tab')
  onTabChanged(val: string, oldVal: string) {
    if (oldVal === null) {
      return;
    }
    if (this.$chart && val === 'graphTab') {
      // HACK: need setTimeout so resize() checks parent height after
      // tab has rendered
      setTimeout(() => {
        this.resize();
      });
    }
  }

  @Watch('reportResult')
  onReportResultChanged(val: object, oldVal: object) {
    if (this.graphTypeName) {
      if (!this.reportResult) {
        this.$emit('complete');
        return;
      }
      let height: any = null;
      if (this.resultLayout === 'tabs' && this.tab === 'tableTab') {
        // HACK: get the graph height closer to what it should be. By
        // default BB will draw it at 320 px tall, and then on tab switch
        // we resize. This gets the initial state looking closer to the
        // full graph tab height
        height = window.innerHeight * 0.7;
      }
      this.initChart(height = height);
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
  color: #333;
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

.legend-container {
  overflow-y: scroll;
  overflow-x: unset;
  max-height: 80px;
  white-space: normal;
}
.legend-color-box {
  width: 10px;
  height: 10px;
  margin-right: 5px;
  display: inline-block;
  position: relative;
  top: 1px;
}
.legend-item-span {
  padding-left: 10px;
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
</style>