<script lang="ts">
import { Component } from 'vue-property-decorator';
import TextCriteriaValueSelect from './TextCriteriaValueSelect.vue';

@Component
export default class IntegerCriteriaValueSelect extends TextCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof (value) === 'string' || typeof (value) === 'number') {
      return value;
    }
    return null;
  }

  label = 'Enter Integer';

  getRules() {
    return [this.rules.required, this.rules.isInteger];
  }

  get criteriaValue() {
    return parseInt(this.syncedValue, 10);
  }
}
</script>
