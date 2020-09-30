<template>
  <v-select v-model="selectedOptions" :items="options" dense solo></v-select>
</template>

<script lang="ts">
import { Component, Mixins, Watch, Vue } from 'vue-property-decorator';
import WarehouseManagerMixin from '@/components/mixins/WarehouseManagerMixin.vue';

@Component
export default class BaseSelect extends Mixins(WarehouseManagerMixin) {
  private selectedOptions: any = null;
  private tagDisplayLimit: number = 99999;

  get options(): any {
    throw new Error('Not implemented');
  }

  get rawSelected() {
    return this.selectedOptions;
  }

  set rawSelected(newValue) {
    this.selectedOptions = newValue;
  }

  get selected() {
    return this.selectedOptions;
  }

  set selected(newValue) {
    this.selectedOptions = newValue;
  }

  limitText(count) {
    return `and ${count} more`;
  }

  doRemove(remove, option) {
    option.active = true;
    remove(option);
  }

  doPause(option) {
    if (option.active) {
      option.active = false;
    } else {
      option.active = true;
    }
  }

  @Watch('activeWarehouseId')
  onActiveWarehouseIdChanged(val: object, oldVal: object) {
    this.rawSelected = [];
  }
}
</script>
