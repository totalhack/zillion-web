<template>
  <div @focus.capture.prevent.stop="handleFocus">
    <multiselect ref="multiselect" v-model="selectedOptions" :options="options" v-bind="multiSelectProps"
      @tag="emitTag">
      <template slot="selection" slot-scope="{ values, search, isOpen, remove }">
        <div class="multiselect__tags-wrap" v-show="values.length > 0">
          <template v-for="(option, index) of values">
            <slot name="tag" :option="option" :search="search" :remove="remove">
              <v-chip class="tagchip ma-2 ml-0" :style="option.active ? '' : { opacity: 0.5 }" label>
                <span class="pr-1" style="cursor: pointer" @mousedown.prevent @click="doRemove(remove, option)">
                  <v-icon size="21">delete</v-icon>
                </span>
                <span class="pr-1" style="cursor: pointer" @mousedown.prevent @click="doPause(option)">
                  <v-icon size="22">pause</v-icon>
                </span>
                <span class="chiptext" @dblclick="handleTagDblClick(option, $event)">{{ option.display_name }}</span>
              </v-chip>
            </slot>
          </template>
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
import { Component, Prop, Vue } from 'vue-property-decorator';
import { sortBy } from '@/utils';
import { omit } from 'lodash';
import BaseSelect from './BaseSelect.vue';

@Component
export default class BaseMultiSelect extends BaseSelect {
  @Prop({ default: {} }) rawOptionsMap!: object;
  @Prop({ default: 'Options' }) defaultGroup!: string;
  @Prop({ default: 'Select Options' }) placeholder!: string;
  @Prop({ default: 1000 }) maxHeight!: number;
  @Prop({ default: 2500 }) optionsLimit!: number;
  @Prop({ default: false }) taggable!: boolean;
  @Prop({ default: 'Press enter to create' }) tagPlaceholder!: string;
  @Prop({ default: 'Created Options' }) createdOptionsGroup!: string;

  // Hack to get vue-multiselect to re-render after progammatically
  // adding a tag: https://michaelnthiessen.com/force-re-render/
  private componentKey: number = 0;

  get multiSelectProps() {
    return {
      'multiple': true,
      'close-on-select': false,
      'clear-on-select': false,
      'max-height': this.maxHeight,
      'options-limit': this.optionsLimit,
      'track-by': 'name',
      'label': 'display_name',
      'placeholder': this.placeholder,
      'group-values': 'groupValues',
      'group-label': 'group',
      'group-select': false,
      'option-height': 24,
      'show-labels': false,
      'blockKeys': ['Delete'],
      'taggable': this.taggable,
      'tag-placeholder': this.tagPlaceholder,
      'key': this.componentKey,
    };
  }

  emitTag(tag) {
    // Propagate the tag event so parents can handle it if necessary
    this.$emit('tag', tag);
  }

  handleTagDblClick(option, event) {
    this.$emit('tagDblClick', { option, event });
  }

  forceRerender() {
    this.componentKey += 1;
  }

  get options() {
    const groups: object = {};
    for (const row of Object.values(this.rawOptionsMap)) {
      const option: any = Object.assign({}, row);
      option.group = option.meta?.group || this.defaultGroup;
      const group = option.group;
      if (!(group in groups)) {
        groups[group] = [];
      }
      option.active = true;
      groups[group].push(option);
    }

    const result: object[] = [];
    for (const group in groups) {
      if (!group) {
        continue;
      }
      const sorted = groups[group].sort(sortBy('display_name'));
      result.push({
        group,
        groupValues: sorted,
      });
    }

    return result;
  }

  get selected() {
    const result: any[] = [];
    for (const selected of (this.rawSelected || []) as any[]) {
      if (selected.active) {
        if (selected.group === this.createdOptionsGroup) {
          result.push(omit(selected, ['active', 'group']));
        } else {
          result.push(selected.name);
        }
      }
    }
    return result;
  }

  set selected(selectedList) {
    const result: any[] = [];
    const rawOptions = this.rawOptionsMap;
    for (const option of selectedList) {
      let raw: any = {};
      if (typeof option === 'string') {
        raw = Object.assign({}, rawOptions[option]);
        raw.active = true;
      } else {
        raw = this.getCreatedOption(option);
        this.addCreatedToOptions(raw);
      }
      result.push(raw);
    }
    this.rawSelected = result;
  }

  getCreatedOption(option) {
    if (this.createdOptionsGroup === 'Ad Hoc Dimensions') {
      return Object.assign(
        {
          name: null,
          display_name: null,
          description: null,
          formula: null,
          group: this.createdOptionsGroup,
          active: true,
        },
        option,
      );
    }

    return Object.assign(
      {
        name: null,
        display_name: null,
        description: null,
        formula: null,
        rounding: null,
        technical: null,
        required_grain: null,
        group: this.createdOptionsGroup,
        active: true,
      },
      option,
    );
  }

  hasCreatedOption(name) {
    const ms = this.$refs.multiselect as any;
    for (const row of ms.options) {
      if (row.group !== this.createdOptionsGroup) {
        continue;
      }
      for (const value of row.groupValues) {
        if (value.name === name) {
          return true;
        }
      }
    }
    return false;
  }

  addCreatedToOptions(option) {
    const ms = this.$refs.multiselect as any;
    const lastGroup = ms.options[ms.options.length - 1];
    // Assumes created options will always be in the last group. Adds the group
    // if missing.
    if (lastGroup.group !== this.createdOptionsGroup) {
      ms.options.push({
        group: this.createdOptionsGroup,
        groupValues: [],
      });
    }
    option.group = this.createdOptionsGroup;
    ms.options[ms.options.length - 1].groupValues.push(option);
    this.forceRerender();
  }

  addCreatedOption(option) {
    // TODO: prevent duplicates
    this.addCreatedToOptions(option);
    if (!this.rawSelected) {
      // In case this hasn't been initialized
      this.rawSelected = [];
    }
    this.rawSelected.push(option);
  }

  updateCreatedOption(option) {
    const ms = this.$refs.multiselect as any;
    for (const row of ms.options) {
      if (row.group !== this.createdOptionsGroup) {
        continue;
      }
      for (const value of row.groupValues) {
        if (value.name === option.name) {
          Object.assign(value, option);
          value.group = this.createdOptionsGroup;
          this.forceRerender();
          return true;
        }
      }
    }
    return false;
  }

  handleFocus(e) {
    if (e.explicitOriginalTarget.closest &&
      !e.explicitOriginalTarget.closest('.tagchip') &&
      !e.explicitOriginalTarget.closest('.multiselect__select')) {
      const ms = this.$refs.multiselect as any;
      if (!ms.isOpen) {
        ms.activate();
      }
    }
  }
}
</script>
