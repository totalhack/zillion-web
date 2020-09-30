<template>
  <div @focus.capture.prevent.stop="handleFocus">
    <multiselect
      ref="multiselect"
      v-model="selectedOptions"
      :options="options"
      v-bind="multiSelectProps"
      @select="initComponent"
    >
      <template slot="selection" slot-scope="{ values, search, isOpen, remove }">
        <div class="multiselect__tags-wrap" v-show="values.length > 0">
          <table class="pa-0">
            <template v-for="(option, index) of values" @mousedown.prevent>
              <tr :key="index" class="tagrow" style="height:40px" :style="option.active ? '' : { 'opacity': 0.5 }">
                <td cols="12" sm="4">
                  <v-chip class="tagchip mr-2" label>
                    <span class="pr-1" style="cursor: pointer" @mousedown.prevent @click="doRemove(remove, option)">
                      <v-icon size="21">delete</v-icon>
                    </span>
                    <span class="pr-1" style="cursor: pointer" @mousedown.prevent @click="doPause(option)">
                      <v-icon size="22">pause</v-icon>
                    </span>
                    <span class="chiptext">{{ option.display_name }}</span>
                  </v-chip>
                </td>
                <td cols="12" sm="2">
                  <v-menu offset-y>
                    <template v-slot:activator="{ on, attrs, value }">
                      <v-chip class="mx-2" v-bind="attrs" v-on="on" @mousedown.prevent label>
                        <span class="chiptext">{{ option.operation }}</span>
                        <v-icon right>arrow_drop_down</v-icon>
                      </v-chip>
                    </template>
                    <v-list>
                      <v-list-item
                        v-for="(operation, index) in supportedOperations"
                        :key="index"
                        class="operation-item"
                        @mousedown.prevent
                        @click="updateOperation(option, operation)"
                      >
                        <v-list-item-title>{{ operation }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
                <td cols="12" sm="6">
                  <keep-alive>
                    <component
                      class="mx-2"
                      v-if="option.component"
                      :ref="option.name"
                      :is="option.component"
                      v-bind:value="option.value"
                      v-on:update:value="option.value = $event"
                    ></component>
                  </keep-alive>
                </td>
              </tr>
            </template>
          </table>
        </div>
      </template>
    </multiselect>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { sortBy } from '@/utils';
import CriteriaSelect from './CriteriaSelect.vue';

@Component
export default class RowFilterSelect extends CriteriaSelect {
  @Prop({ default: () => ({}) }) rawOptionsMap!: object;
  @Prop({ default: [] }) rowFilterOptions!: string[];
  @Prop({
    default: () => (['=', '!=', '>', '>=', '<', '<='])
  }) supportedOperations!: string[];

  // Override because this doesn't use groups
  get multiSelectProps(): any {
    return {
      'multiple': true,
      'close-on-select': true,
      'max-height': this.maxHeight,
      'options-limit': this.optionsLimit,
      'track-by': 'name',
      'label': 'display_name',
      'placeholder': this.placeholder,
      'option-height': 24,
      'show-labels': false,
    };
  }

  get options() {
    const rawOptions = this.rawOptionsMap;
    const result: object[] = [];

    if (this.rowFilterOptions) {
      for (const optionName of this.rowFilterOptions) {
        const raw = rawOptions[optionName];
        const option = Object.assign({}, raw);
        result.push({
          name: option.name,
          display_name: option.display_name,
          description: option.description,
          type: this.fieldType(option),
          operation: '=',
          component: null,
          value: null,
          active: true,
        });
      }
      result.sort(sortBy('display_name'));
    }

    // Note: this is handling the case where fields are removed from options.
    // It seems like vue-multiselect doesn't automatically remove them from
    // the selections. Perhaps there is a better way.
    const newRawSelected: any[] = [];
    for (const selected of (this.rawSelected || []) as any[]) {
      if (this.rowFilterOptions.indexOf(selected.name) > -1) {
        newRawSelected.push(selected);
      }
    }
    this.rawSelected = newRawSelected;

    return result;
  }
}
</script>
