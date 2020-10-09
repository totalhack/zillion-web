<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import {
  readActiveWarehouseId,
  readWarehouses,
  readDimensions,
  readMetrics
} from '@/store/main/getters';
import {
  dispatchSetActiveWarehouseId,
  dispatchSetDefaultWarehouseId,
  dispatchSetReportRequest,
  dispatchSetReportResult
} from '@/store/main/actions';

@Component
export default class WarehouseManagerMixin extends Vue {
  get activeWarehouseId() {
    return readActiveWarehouseId(this.$store);
  }

  get warehouses() {
    return Object.values(readWarehouses(this.$store));
  }

  get warehouseActive() {
    if (!this.activeWarehouseId) {
      return false;
    }
    return true;
  }

  changeWarehouse(obj) {
    dispatchSetActiveWarehouseId(this.$store, obj.id);
    dispatchSetReportRequest(this.$store, null);
    dispatchSetReportResult(this.$store, null);
  }

  get warehouseDimensions() {
    return readDimensions(this.$store);
  }

  get warehouseMetrics() {
    return readMetrics(this.$store);
  }

  fieldDefFromName(name) {
    if (name in this.warehouseDimensions) {
      return this.warehouseDimensions[name];
    } else if (name in this.warehouseMetrics) {
      return this.warehouseMetrics[name];
    }
    return null;
  }

  fieldType(field) {
    if (!field.type) {
      if (field.formula) {
        return 'float';
      } else {
        return 'string';
      }
    }
    return field.type.split('(')[0].toLowerCase();
  }
}
</script>