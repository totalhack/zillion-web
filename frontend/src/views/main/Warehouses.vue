<template>
  <v-container container--fluid class="content-container">
    <v-card height="100%" class="mx-0 pa-2">
      <v-card-title class="py-0">
        <h5>Warehouse Structure</h5>
        <v-spacer></v-spacer>
        <v-col class="my-0 py-2" cols="12" lg="4" md="5" sm="6" xs="12">
          <v-text-field
            class="text-subtitle-1 mb-0 mt-1 py-0"
            color="grey darken-3"
            @change="handleSearch"
            @input="clearSearchIfBlank"
            label="Search Warehouses"
            hide-details
            clearable
            clear-icon="close"
            append-icon="search"
          ></v-text-field>
        </v-col>
      </v-card-title>
      <v-card-text class="py-0 my-0">
        <span class="ml-3 mt-2 text-subtitle-2">Click metric/dimension names for details</span>
        <v-treeview ref="tree" :items="items" :open.sync="open" :search="search" dense hoverable open-on-click>
          <template v-slot:label="{ item, open }">
            <v-row v-if="item.isField">
              <v-col cols="12" md="4" @click="showDetails(item)">
                <span style="font-weight:bold">{{ item.name }}</span>
              </v-col>
              <v-col cols="12" md="4">
                <span>{{ item.raw.description || 'No description '}}</span>
              </v-col>
              <v-col v-if="item.raw.type" cols="12" md="4">
                <span style="font-weight:500">Type:</span>
                <span>{{ ' ' + item.raw.type }}</span>
              </v-col>
              <v-col v-if="item.raw.formula" cols="12" md="4">
                <span style="font-weight:500">Formula:</span>
                <span>{{ ' ' + item.raw.formula }}</span>
              </v-col>
            </v-row>
            <v-row v-else>
              <v-col>
                <span style="font-weight:bold">{{ item.name }}</span>
              </v-col>
            </v-row>
          </template>
        </v-treeview>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" scrollable width="unset">
      <v-card class="pa-2">
        <v-card-title>Raw Field Definition</v-card-title>
        <v-card-text>
          <pre v-if="clickedField" class="mx-5">{{ JSON.stringify(clickedField.raw, null, 2) }}</pre>
          <span v-else>No field clicked</span>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Watch, Vue } from 'vue-property-decorator';
import { readWarehouses, readWarehouseStructures } from '@/store/main/getters';
import { dispatchHydrateWarehouseStore } from '@/store/main/actions';

let headScripts: any[] = [];
if (process.env.NODE_ENV !== 'production') {
  headScripts = [
    { type: 'text/javascript', src: 'http://localhost:8098', async: true },
  ];
}

@Component({
  head: {
    script: headScripts,
  },
})
export default class Warehouse extends Vue {
  private search = null;
  private open: string[] = [];
  private allOpened = false;
  private lastOpen: string[] = [];
  private dialog = false;
  private clickedField = null;

  get items() {
    const structures = readWarehouseStructures(this.$store);
    const result: object[] = [];
    if (Object.keys(structures).length === 0) {
      return [];
    }

    const whs = readWarehouses(this.$store);

    for (const whId of Object.keys(structures)) {
      const structure = structures[whId];
      const whName = whs[whId].name;

      const whMetrics = this.getLevelMetrics(structure, whId + '_warehouse');
      const whDimensions = this.getLevelDimensions(structure, whId + '_warehouse');
      const whDataSources = this.getDataSources(whId, structure);

      const warehouse = {
        id: whId,
        name: 'Warehouse: ' + whName,
      };

      const children: object[] = [];
      if (whMetrics.length) {
        children.push({
          id: whId + '_warehouse_metrics',
          name: 'Metrics',
          children: whMetrics
        });
      } else {
        children.push({
          id: whId + '_warehouse_metrics',
          name: 'No Metrics',
        });
      }
      if (whDimensions.length) {
        children.push({
          id: whId + '_warehouse_dimensions',
          name: 'Dimensions',
          children: whDimensions
        });
      } else {
        children.push({
          id: whId + '_warehouse_dimensions',
          name: 'No Dimensions',
        });
      }
      if (whDataSources.length) {
        children.push({
          id: whId + '_warehouse_datasources',
          name: 'Datasources',
          children: whDataSources
        });
      } else {
        children.push({
          id: whId + '_warehouse_datasources',
          name: 'No Datasources',
        });
      }

      if (children.length) {
        warehouse['children'] = children;
      }
      result.push(warehouse);
    }

    return result;
  }

  getInitialOpen() {
    const structures = readWarehouseStructures(this.$store);
    const toOpen: string[] = [];
    for (const whId of Object.keys(structures)) {
      const structure = structures[whId];
      toOpen.push(whId);
      toOpen.push(whId + '_warehouse_datasources');
      for (const ds of (structure as any).datasources) {
        toOpen.push(whId + '_' + ds.name);
      }
    }
    return toOpen;
  }

  getLevelMetrics(structure, prefix) {
    const metrics = Object.values(structure.metrics);
    const result: object[] = [];
    metrics.forEach((metric: any) => {
      result.push({
        id: prefix + '_' + metric.name,
        name: metric.display_name,
        raw: metric,
        isField: true,
      });
    });
    return result;
  }

  getLevelDimensions(structure, prefix) {
    const dimensions = Object.values(structure.dimensions);
    const result: object[] = [];
    dimensions.forEach((dimension: any) => {
      result.push({
        id: prefix + '_' + dimension.name,
        name: dimension.display_name,
        raw: dimension,
        isField: true,
      });
    });
    return result;
  }

  getDataSources(whId, structure) {
    const datasources = structure.datasources;
    const result: object[] = [];

    for (const datasource of datasources) {
      const dsRow = {
        id: whId + '_' + datasource.name,
        name: datasource.name
      };

      const dsMetrics = this.getLevelMetrics(datasource, whId + '_' + datasource.name);
      const dsDimensions = this.getLevelDimensions(datasource, whId + '_' + datasource.name);
      const metricChildId = whId + '_' + datasource.name + '_metrics';
      const dimensionChildId = whId + '_' + datasource.name + '_dimensions';
      const children: object[] = [];

      if (dsMetrics.length) {
        children.push({
          id: metricChildId,
          name: 'Metrics',
          children: dsMetrics
        });
      } else {
        children.push({
          id: metricChildId,
          name: 'No Metrics'
        });
      }
      if (dsDimensions.length) {
        children.push({
          id: dimensionChildId,
          name: 'Dimensions',
          children: dsDimensions
        });
      } else {
        children.push({
          id: dimensionChildId,
          name: 'No Dimensions',
        });
      }

      if (children.length) {
        dsRow['children'] = children;
      }
      result.push(dsRow);
    }
    return result;
  }

  handleSearch(val) {
    if (val) {
      if (!this.allOpened) {
        this.lastOpen = this.open;
        this.allOpened = true;
        (this.$refs.tree as any).updateAll(true);
      }
      this.search = val;
    }
  }

  clearSearchIfBlank(val) {
    if (!val) {
      (this.$refs.tree as any).updateAll(false);
      this.allOpened = false;
      this.open = this.lastOpen;
      this.search = null;
    }
  }

  showDetails(item) {
    this.clickedField = item;
    this.dialog = true;
  }

  async mounted() {
    await dispatchHydrateWarehouseStore(this.$store);
    this.open = this.getInitialOpen();
  }
}
</script>

<style>
.v-treeview-node__label {
  white-space: normal !important;
}
</style>