<template>
  <draggable-multi-select
    ref="multiselect"
    :raw-options-map="rawOptionsMap"
    default-group="Dimensions"
    placeholder="Select Dimensions"
  ></draggable-multi-select>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { readDimensions } from '@/store/main/getters';
import DraggableMultiSelect from './DraggableMultiSelect.vue';

@Component({
  components: {
    DraggableMultiSelect
  }
})
export default class DimensionSelect extends Vue {
  get rawOptionsMap() {
    return readDimensions(this.$store);
  }

  get selected() {
    return (this.$refs.multiselect as any).selected;
  }

  set selected(selectedList) {
    (this.$refs.multiselect as any).selected = selectedList;
  }
}
</script>
