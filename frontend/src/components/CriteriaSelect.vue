<template>
  <div @focus.capture.prevent.stop="handleFocus">
    <multiselect
      ref="multiselect"
      v-model="selectedOptions"
      :options="options"
      v-bind="multiSelectProps"
      @select="initComponent"
    >
      <template
        slot="selection"
        slot-scope="{ values, search, isOpen, remove }"
      >
        <div class="multiselect__tags-wrap" v-show="values.length > 0">
          <v-simple-table class="criteriatable pa-0">
            <template v-for="(option, index) of values">
              <tr
                :key="index"
                class="tagrow"
                style="height: 40px"
                :style="option.active ? '' : { opacity: 0.5 }"
              >
                <td cols="12" sm="4">
                  <v-chip class="tagchip mx-2 ml-0" label>
                    <span
                      class="pr-1"
                      style="cursor: pointer"
                      @mousedown.prevent
                      @click="doRemove(remove, option)"
                    >
                      <v-icon size="21">delete</v-icon>
                    </span>
                    <span
                      class="pr-1"
                      style="cursor: pointer"
                      @mousedown.prevent
                      @click="doPause(option)"
                    >
                      <v-icon size="22">pause</v-icon>
                    </span>
                    <span class="chiptext">{{ option.display_name }}</span>
                  </v-chip>
                </td>
                <td cols="12" sm="2">
                  <v-menu offset-y>
                    <template v-slot:activator="{ on, attrs, value }">
                      <v-chip
                        class="mx-2"
                        v-bind="attrs"
                        v-on="on"
                        @mousedown.prevent
                        label
                      >
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
          </v-simple-table>
        </div>
      </template>
      <template slot="option" slot-scope="props">
        <div class="option__desc">
          <span v-if="props.option.$isLabel">{{
            props.option.$groupLabel
          }}</span>
          <div v-else class="tooltip">
            <span class="option__title">{{ props.option.display_name }}</span>
            <span class="tooltiptext">{{
              props.option.description || "No description"
            }}</span>
          </div>
        </div>
      </template>
    </multiselect>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { sortBy, ValidationError } from '@/utils';
import BaseSelect from './BaseSelect.vue';
import DateTimeCriteriaValueSelect from './DateTimeCriteriaValueSelect.vue';
import DateTimeRangeCriteriaValueSelect from './DateTimeRangeCriteriaValueSelect.vue';
import DateCriteriaValueSelect from './DateCriteriaValueSelect.vue';
import DateRangeCriteriaValueSelect from './DateRangeCriteriaValueSelect.vue';
import FloatCriteriaValueSelect from './FloatCriteriaValueSelect.vue';
import FloatBetweenCriteriaValueSelect from './FloatBetweenCriteriaValueSelect.vue';
import IntegerCriteriaValueSelect from './IntegerCriteriaValueSelect.vue';
import IntegerBetweenCriteriaValueSelect from './IntegerBetweenCriteriaValueSelect.vue';
import TextCriteriaValueSelect from './TextCriteriaValueSelect.vue';
import TextBetweenCriteriaValueSelect from './TextBetweenCriteriaValueSelect.vue';
import TextAreaCriteriaValueSelect from './TextAreaCriteriaValueSelect.vue';
import TextAreaListCriteriaValueSelect from './TextAreaListCriteriaValueSelect.vue';

@Component({
  components: {
    DateTimeCriteriaValueSelect,
    DateTimeRangeCriteriaValueSelect,
    DateCriteriaValueSelect,
    DateRangeCriteriaValueSelect,
    FloatCriteriaValueSelect,
    FloatBetweenCriteriaValueSelect,
    IntegerCriteriaValueSelect,
    IntegerBetweenCriteriaValueSelect,
    TextCriteriaValueSelect,
    TextBetweenCriteriaValueSelect,
    TextAreaCriteriaValueSelect,
    TextAreaListCriteriaValueSelect,
  },
})
export default class CriteriaSelect extends BaseSelect {
  @Prop({ default: () => ({}) }) rawOptionsMap!: object;
  @Prop({
    default: () => (['=', '!=', '>', '>=', '<', '<=', 'in', 'not in', 'like', 'not like', 'between', 'not between', 'is null', 'is not null'])
  }) supportedOperations!: string[];
  @Prop({ default: 'Fields' }) defaultGroup!: string;
  @Prop({ default: 'Select Criteria' }) placeholder!: string;
  @Prop({ default: 1000 }) maxHeight!: number;
  @Prop({ default: 200 }) optionsLimit!: number;

  get multiSelectProps(): any {
    return {
      'multiple': true,
      'close-on-select': true,
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
    };
  }

  private textComponentOverrides: object = {
    'between': TextBetweenCriteriaValueSelect,
    'not between': TextBetweenCriteriaValueSelect,
    'in': TextAreaListCriteriaValueSelect,
    'not in': TextAreaListCriteriaValueSelect,
  };
  private integerComponentOverrides: object = {
    'between': IntegerBetweenCriteriaValueSelect,
    'not between': IntegerBetweenCriteriaValueSelect,
    'like': TextCriteriaValueSelect,
    'not like': TextCriteriaValueSelect,
    // TODO: add one specific to int
    'in': TextAreaListCriteriaValueSelect,
    'not in': TextAreaListCriteriaValueSelect,
  };
  private floatComponentOverrides: object = {
    'between': FloatBetweenCriteriaValueSelect,
    'not between': FloatBetweenCriteriaValueSelect,
    'like': TextCriteriaValueSelect,
    'not like': TextCriteriaValueSelect,
    // TODO: add one specific to float
    'in': TextAreaListCriteriaValueSelect,
    'not in': TextAreaListCriteriaValueSelect,
  };
  private dateComponentOverrides: object = {
    'between': DateRangeCriteriaValueSelect,
    'not between': DateRangeCriteriaValueSelect,
    'like': TextCriteriaValueSelect,
    'not like': TextCriteriaValueSelect,
    'in': TextAreaListCriteriaValueSelect,
    'not in': TextAreaListCriteriaValueSelect,
  };
  private dateTimeComponentOverrides: object = {
    'between': DateTimeRangeCriteriaValueSelect,
    'not between': DateTimeRangeCriteriaValueSelect,
    'like': TextCriteriaValueSelect,
    'not like': TextCriteriaValueSelect,
    'in': TextAreaListCriteriaValueSelect,
    'not in': TextAreaListCriteriaValueSelect,
  };

  updateOperation(option, operation) {
    if (option.operation !== operation) {
      option.operation = operation;
      this.setComponent(option);
      if (option.value !== null && (option as any).component) {
        // Try to reuse the value if the new component can handle it
        option.value = (option as any).component.ensureOptionValue(option.value);
      }
    }
  }

  setComponent(option) {
    const result = this.getComponent(option.name, option.type, option.operation);
    option.component = result.component;
  }

  getComponent(fieldName, fieldType, operation) {
    let componentOverrides = {};
    let defaultOperation = '=';
    let defaultComponent: any = TextCriteriaValueSelect;

    if (operation === 'is null' || operation === 'is not null') {
      return { component: null, operation };
    }

    switch (fieldType) {
      case 'integer':
      case 'smallinteger':
      case 'biginteger':
        componentOverrides = this.integerComponentOverrides;
        defaultComponent = IntegerCriteriaValueSelect;
        break;
      case 'float':
      case 'numeric':
        componentOverrides = this.floatComponentOverrides;
        defaultComponent = FloatCriteriaValueSelect;
        break;
      case 'date':
        componentOverrides = this.dateComponentOverrides;
        defaultOperation = 'between';
        defaultComponent = DateCriteriaValueSelect;
        break;
      case 'datetime':
        componentOverrides = this.dateTimeComponentOverrides;
        defaultOperation = 'between';
        defaultComponent = DateTimeCriteriaValueSelect;
        break;
      case 'string':
      case 'varchar':
      case 'text':
      default:
        componentOverrides = this.textComponentOverrides;
        break;
    }

    const op = operation || defaultOperation;
    let component = defaultComponent;
    if (op in componentOverrides) {
      component = componentOverrides[op];
    }

    return { component, operation: op };
  }

  initComponent(selected, id) {
    if (selected.component == null) {
      const componentResult = this.getComponent(selected.name, selected.type, null);
      selected.operation = componentResult.operation;
      selected.component = componentResult.component;
    }
  }

  get options() {
    const groups: object = {};
    for (const row of Object.values(this.rawOptionsMap)) {
      const option = Object.assign({}, row);
      option.group = option.meta?.group || this.defaultGroup;
      const group = option.group;
      if (!(group in groups)) {
        groups[group] = [];
      }

      groups[group].push({
        name: option.name,
        display_name: option.display_name,
        description: option.description,
        type: this.fieldType(option),
        operation: null,
        component: null,
        value: null,
        active: true,
      });
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
        if (selected.operation === 'is null') {
          result.push([selected.name, '=', null]);
          continue;
        }
        if (selected.operation === 'is not null') {
          result.push([selected.name, '!=', null]);
          continue;
        }

        // NOTE: $refs become arrays when used in v-for.
        const input = this.$refs[selected.name][0] as any;
        const vresult = input.validate();
        if (!vresult.valid) {
          throw new ValidationError(vresult?.error);
        }

        result.push([
          selected.name,
          selected.operation,
          input.criteriaValue,
        ]);
      }
    }
    return result;
  }

  set selected(criteriaList) {
    this.rawSelected = [];
    if (!criteriaList) {
      return;
    }

    const rawOptions = this.rawOptionsMap;
    for (const criteria of criteriaList) {
      const name = criteria[0];
      const operation = criteria[1];
      const value = criteria[2];
      const raw = rawOptions[name];
      if (!raw) {
        continue;
      }

      const option = {
        name: raw.name,
        display_name: raw.display_name,
        description: raw.description,
        type: this.fieldType(raw),
        operation,
        component: null,
        active: true,
        value: null,
      };
      this.setComponent(option);
      option.value = (option as any).component.criteriaToOptionValue(value);
      this.rawSelected.push(option);
    }
  }

  handleFocus(e) {
    if (e.explicitOriginalTarget.closest && !e.explicitOriginalTarget.closest('.tagrow')) {
      const ms = this.$refs.multiselect as any;
      if (!ms.isOpen) {
        ms.activate();
      }
    }
  }
}
</script>
