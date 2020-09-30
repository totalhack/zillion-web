<script lang="ts">
import { Component } from 'vue-property-decorator';
import TextCriteriaValueSelect from './TextCriteriaValueSelect.vue';

@Component
export default class FloatCriteriaValueSelect extends TextCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof (value) === 'string' || typeof (value) === 'number') {
      return value;
    }
    return null;
  }

  label = 'Enter Number';

  getRules() {
    return [this.rules.required, this.rules.isNumber];
  }

  get criteriaValue() {
    return parseFloat(this.syncedValue);
  }
}
</script>
