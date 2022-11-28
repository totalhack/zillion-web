<template>
  <div @focus.capture.prevent.stop="" @pointerdown="handlePointerDown">
    <multiselect ref="multiselect" v-model="selectedOptions" :options="options" v-bind="multiSelectProps"
      @tag="emitTag">
      <template slot="selection" slot-scope="{ values, search, isOpen, remove }">
        <div class="multiselect__tags-wrap" v-show="values.length > 0">
          <draggable :list="selectedOptions" :disabled="breakpointMdOrLess">
            <template v-for="(option, index) of values">
              <slot name="tag" :option="option" :search="search" :remove="remove">
                <v-chip class="tagchip ma-2 ml-0" :style="option.active ? '' : { opacity: 0.5 }" label>
                  <span class="pr-1" style="cursor: pointer" @mousedown.prevent @click="doRemove(remove, option)">
                    <v-icon size="21">delete</v-icon>
                  </span>
                  <span class="pr-1" style="cursor: pointer" @mousedown.prevent @click="doPause(option)">
                    <v-icon size="22">pause</v-icon>
                  </span>
                  <span class="chiptext" @contextmenu.prevent="handleTagRightClick(option, $event)"
                    @dblclick="handleTagDblClick(option, $event)">{{ option.display_name }}</span>
                </v-chip>
              </slot>
            </template>
          </draggable>
        </div>
        <template v-if="selectedOptions && selectedOptions.length > tagDisplayLimit">
          <slot name="limit">
            <strong class="multiselect__strong" v-text="limitText(selectedOptions.length - tagDisplayLimit)" />
          </slot>
        </template>
      </template>
      <template slot="option" slot-scope="props">
        <slot name="option" :option="props.option" :search="props.search" :index="props.index">
          <div class="option__desc">
            <span v-if="props.option.$isLabel">{{
                props.option.$groupLabel
            }}</span>
            <div v-else class="tooltip">
              <span class="option__title">{{ props.option.display_name }}</span>
              <span class="tooltiptext">{{
              props.option.description ||
              props.option.formula ||
              "No description"
              }}</span>
            </div>
          </div>
        </slot>
      </template>
    </multiselect>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import BaseMultiSelect from './BaseMultiSelect.vue';

@Component
export default class DraggableMultiSelect extends BaseMultiSelect { }
</script>
