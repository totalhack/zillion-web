<template>
  <div class="multiselect-field-shell" @focus.capture.prevent.stop="" @pointerdown="handlePointerDown">
    <multiselect
      ref="multiselect"
      v-model="selectedOptions"
      :options="options"
      v-bind="multiSelectProps"
      @tag="emitTag"
    >
      <template slot="selection" slot-scope="{ values, search, isOpen, remove }">
        <div class="multiselect__tags-wrap" v-show="values.length > 0">
          <draggable
            :list="selectedOptions"
            :delay="mobileDragDelay"
            :delay-on-touch-only="true"
            :touch-start-threshold="8"
            :force-fallback="breakpointMdOrLess"
            :fallback-on-body="breakpointMdOrLess"
            :filter="'.tagchip__action, .tagchip__action *'"
            :prevent-on-filter="false"
          >
            <template v-for="(option, index) of values">
              <slot name="tag" :option="option" :search="search" :remove="remove">
                <v-chip
                  class="tagchip ma-2 ml-0"
                  :class="{ 'tagchip--warning': isOptionHighlighted(option) }"
                  :style="option.active ? '' : { opacity: 0.5 }"
                  :title="getOptionHighlightReason(option)"
                  label
                >
                  <span
                    class="pr-1 tagchip__action"
                    style="cursor: pointer"
                    @mousedown.prevent
                    @click="doRemove(remove, option)"
                  >
                    <v-icon size="21">delete</v-icon>
                  </span>
                  <span
                    class="pr-1 tagchip__action"
                    style="cursor: pointer"
                    @mousedown.prevent
                    @click="doPause(option)"
                  >
                    <v-icon size="22">pause</v-icon>
                  </span>
                  <span
                    class="chiptext"
                    @click="handleTagTap(option, $event)"
                    @contextmenu.prevent="handleTagContextMenu(option, $event)"
                    @dblclick="handleTagDblClick(option, $event)"
                    >{{ option.display_name }}</span
                  >
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
            <span v-if="props.option.$isLabel">{{ props.option.$groupLabel }}</span>
            <div v-else class="tooltip">
              <span class="option__title" :class="{ 'option__title--warning': isOptionHighlighted(props.option) }">{{
                props.option.display_name
              }}</span>
              <span class="tooltiptext">{{
                props.option.description || props.option.formula || "No description"
              }}</span>
            </div>
          </div>
        </slot>
      </template>
    </multiselect>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import BaseMultiSelect from "./BaseMultiSelect.vue";

@Component
export default class DraggableMultiSelect extends BaseMultiSelect {
  get mobileDragDelay() {
    return this.breakpointMdOrLess ? 300 : 0;
  }

  get hasTagRightClickListener() {
    return Boolean(this.$listeners && this.$listeners.tagRightClick);
  }

  handleTagTap(option, event) {
    if (this.breakpointMdOrLess && this.hasTagRightClickListener) {
      this.handleTagRightClick(option, event);
    }
  }

  handleTagContextMenu(option, event) {
    if (this.breakpointMdOrLess) {
      return;
    }
    this.handleTagRightClick(option, event);
  }
}
</script>

<style scoped>
.tagchip--warning {
  background: #fff5f5 !important;
  box-shadow: inset 0 0 0 1px #ef9a9a !important;
}

.tagchip--warning .chiptext {
  color: #b71c1c;
  font-weight: 500;
}

.option__title--warning {
  color: #b71c1c;
  font-weight: 500;
}
</style>
