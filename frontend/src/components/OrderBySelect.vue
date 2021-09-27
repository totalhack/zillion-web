<template>
  <div @focus.capture.prevent.stop="handleFocus">
    <multiselect
      v-model="selectedOptions"
      :options="options"
      :multiple="true"
      :close-on-select="true"
      track-by="name"
      label="display_name"
      placeholder="Select Order By"
      :option-height="24"
      :show-labels="false"
      ref="multiselect"
    >
      <template
        slot="selection"
        slot-scope="{ values, search, isOpen, remove }"
      >
        <div class="multiselect__tags-wrap" v-show="values.length > 0">
          <draggable :list="selectedOptions">
            <template v-for="(option, index) of values" @mousedown.prevent>
              <slot
                name="tag"
                :option="option"
                :search="search"
                :remove="remove"
              >
                <v-chip
                  class="tagchip mt-2 pr-0"
                  :style="option.active ? '' : { opacity: 0.5 }"
                  label
                >
                  <span
                    class="pr-1"
                    style="cursor: pointer"
                    @mousedown.prevent
                    @click="doRemove(remove, option)"
                  >
                    <v-icon size="21">delete</v-icon>
                  </span>
                  <span class="chiptext">{{ option.display_name }}</span>
                  <v-btn-toggle
                    v-model="option.order_by_type"
                    class="ml-2"
                    mandatory
                  >
                    <v-tooltip bottom>
                      <template v-slot:activator="{ on, attrs }">
                        <v-btn
                          style="border: none"
                          @mousedown.prevent
                          v-bind="attrs"
                          v-on="on"
                          value="asc"
                        >
                          <v-icon small>arrow_upward</v-icon>
                        </v-btn>
                      </template>
                      <span>Ascending in value</span>
                    </v-tooltip>

                    <v-tooltip bottom>
                      <template v-slot:activator="{ on, attrs }">
                        <v-btn
                          style="border: none"
                          @mousedown.prevent
                          v-bind="attrs"
                          v-on="on"
                          value="desc"
                        >
                          <v-icon small>arrow_downward</v-icon>
                        </v-btn>
                      </template>
                      <span>Descending in value</span>
                    </v-tooltip>
                  </v-btn-toggle>
                </v-chip>
              </slot>
            </template>
          </draggable>
        </div>
      </template>
    </multiselect>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { sortBy } from '@/utils';
import BaseSelect from './BaseSelect.vue';

@Component
export default class OrderBySelect extends BaseSelect {
  @Prop({ default: [] }) orderByOptions!: string[];

  get options() {
    const result: object[] = [];

    if (this.orderByOptions) {
      for (const option of this.orderByOptions) {
        const field = this.fieldDefFromName(option);
        result.push({
          name: option,
          active: true,
          display_name: field.display_name,
          order_by_type: 'asc',
        });
      }
      result.sort(sortBy('display_name'));
    }

    // This is handling case where fields are removed from options.
    // It seems like vue-multiselect doesn't automatically remove them from
    // the selections. Perhaps there is a better way.
    const newRawSelected: any[] = [];
    for (const selected of (this.rawSelected || []) as any[]) {
      if (this.orderByOptions.indexOf(selected.name) > -1) {
        newRawSelected.push(selected);
      }
    }
    this.rawSelected = newRawSelected;

    return result;
  }

  get selected() {
    const result: any[] = [];
    for (const selected of (this.rawSelected || []) as any[]) {
      if (selected.active) {
        result.push([selected.name, selected.order_by_type]);
      }
    }
    return result;
  }

  set selected(selectedList) {
    const result: object[] = [];
    for (const row of selectedList) {
      const name: string = row[0];
      const orderByType = row[1];
      const field = this.fieldDefFromName(name);
      result.push({
        name,
        display_name: field.display_name,
        order_by_type: orderByType,
        active: true,
      });
    }
    this.rawSelected = result;
  }

  handleFocus(e) {
    if (e.explicitOriginalTarget.closest && !e.explicitOriginalTarget.closest('.tagchip')) {
      const ms = this.$refs.multiselect as any;
      if (!ms.isOpen) {
        ms.activate();
      }
    }
  }
}
</script>
