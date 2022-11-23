<template>
  <div>
    <draggable-multi-select ref="multiselect" :raw-options-map="rawOptionsMap" default-group="Dimensions"
      placeholder="Select Dimensions" :created-options-group="createdOptionsGroup"
      tag-placeholder="Press enter to create a dimension" :taggable="true" @tag="openAdHocDimensionDialog"
      @tagDblClick="handleTagDblClick"></draggable-multi-select>
    <ad-hoc-dimension-dialog @input="addAdHocDimension($event)" ref="adHocDimensionDialog"></ad-hoc-dimension-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { readDimensions } from '@/store/main/getters';
import DraggableMultiSelect from './DraggableMultiSelect.vue';
import AdHocDimensionDialog from './AdHocDimensionDialog.vue';

@Component({
  components: {
    DraggableMultiSelect,
    AdHocDimensionDialog
  }
})
export default class DimensionSelect extends Vue {
  createdOptionsGroup: string = 'Ad Hoc Dimensions';

  get rawOptionsMap() {
    return readDimensions(this.$store);
  }

  get selected() {
    return (this.$refs.multiselect as any).selected;
  }

  set selected(selectedList) {
    (this.$refs.multiselect as any).selected = selectedList;
  }

  openAdHocDimensionDialog(adHocDimensionName) {
    const ms = this.$refs.multiselect as any;
    if (ms.hasCreatedOption(adHocDimensionName)) {
      return;
    }
    (this.$refs.adHocDimensionDialog as any).open({ name: adHocDimensionName });
  }

  addAdHocDimension(dimension) {
    const ms = this.$refs.multiselect as any;
    if (ms.hasCreatedOption(dimension.name)) {
      ms.updateCreatedOption(dimension);
      return;
    }
    ms.addCreatedOption(dimension);
  }

  handleTagDblClick({ option, event }) {
    if (option.group && option.group === this.createdOptionsGroup) {
      (this.$refs.adHocDimensionDialog as any).open(option);
    } else {
      (this.$refs.adHocDimensionDialog as any).open(option);
    }
  }
}
</script>
