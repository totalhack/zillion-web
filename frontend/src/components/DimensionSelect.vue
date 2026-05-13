<template>
  <div>
    <draggable-multi-select
      ref="multiselect"
      :raw-options-map="rawOptionsMap"
      default-group="Dimensions"
      placeholder="Select Dimensions"
      :created-options-group="createdOptionsGroup"
      tag-placeholder="Press enter to create a dimension"
      :taggable="true"
      @tag="openAdHocDimensionDialog"
      @tagDblClick="handleTagDblClick"
      @tagRightClick="handleTagRightClick"
    ></draggable-multi-select>
    <ad-hoc-dimension-dialog @input="addAdHocDimension($event)" ref="adHocDimensionDialog"></ad-hoc-dimension-dialog>
    <context-menu :options="contextMenuOptions" :handler="handleContextMenuOption" ref="contextMenu"></context-menu>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import { readDimensions } from "@/store/main/getters";
import DraggableMultiSelect from "./DraggableMultiSelect.vue";
import AdHocDimensionDialog from "./AdHocDimensionDialog.vue";
import ContextMenu from "./ContextMenu.vue";
import WarehouseManagerMixin from "./mixins/WarehouseManagerMixin.vue";

@Component({
  components: {
    DraggableMultiSelect,
    AdHocDimensionDialog,
    ContextMenu,
  },
})
export default class DimensionSelect extends Mixins(WarehouseManagerMixin) {
  createdOptionsGroup: string = "Ad Hoc Dimensions";
  private pendingSelected: any = null;

  private contextMenuOptions = ["Add/Edit Dimension", "Add Partition", "Add Criteria"];

  mounted() {
    this.flushPendingSelection();
  }

  get multiselect() {
    return (this.$refs.multiselect as any) || null;
  }

  flushPendingSelection() {
    if (!this.multiselect || this.pendingSelected === null) {
      return;
    }

    this.multiselect.selected = this.pendingSelected;
  }

  queuePendingSelectionFlush() {
    this.$nextTick(() => {
      this.flushPendingSelection();
    });
  }

  get rawOptionsMap() {
    return readDimensions(this.$store);
  }

  get selected() {
    return this.multiselect?.selected || [];
  }

  set selected(selectedList) {
    this.clearUnsupportedGrainMetrics();
    this.pendingSelected = Array.isArray(selectedList) ? [...selectedList] : [];
    if (this.multiselect) {
      this.multiselect.selected = selectedList;
      return;
    }
    this.queuePendingSelectionFlush();
  }

  ensureDimensionSelected(dim) {
    let isSelected = false;
    let dimName;

    if (typeof dim === "string") {
      dimName = dim;
    } else {
      dimName = dim.name;
    }
    for (const selectedDim of this.selected) {
      if (typeof selectedDim === "string" && selectedDim === dimName) {
        isSelected = true;
        break;
      }
      if (typeof selectedDim !== "string" && selectedDim.name === dimName) {
        isSelected = true;
        break;
      }
    }
    if (!isSelected) {
      const selected = this.selected;
      selected.push(dim);
      this.selected = selected;
    }
  }

  handleContextMenuOption(item, context) {
    if (item === "Add/Edit Dimension") {
      (this.$refs.adHocDimensionDialog as any).open(context);
    } else if (item === "Add Partition") {
      const option = Object.assign({}, context);
      if (!option.name.endsWith("_part")) {
        option.name = option.name + "_part";
        option.display_name = option.display_name + " Part";
        option.formula = "{" + context.name + '} = "X"';
      }
      (this.$refs.adHocDimensionDialog as any).open(option);
    } else if (item === "Add Criteria") {
      this.$emit("addCriteriaFromDimension", context);
    }
  }

  openAdHocDimensionDialog(adHocDimensionName) {
    const ms = this.multiselect;
    if (ms.hasCreatedOption(adHocDimensionName)) {
      return;
    }
    (this.$refs.adHocDimensionDialog as any).open({ name: adHocDimensionName });
  }

  addAdHocDimension(dimension) {
    const ms = this.multiselect;
    if (ms.hasCreatedOption(dimension.name)) {
      ms.updateCreatedOption(dimension);
    } else {
      ms.addCreatedOption(dimension);
    }
    this.ensureDimensionSelected(dimension);
  }

  handleTagDblClick({ option, event }) {
    (this.$refs.adHocDimensionDialog as any).open(option);
  }

  handleTagRightClick({ option, event }) {
    (this.$refs.contextMenu as any).open(event, option);
  }
}
</script>
