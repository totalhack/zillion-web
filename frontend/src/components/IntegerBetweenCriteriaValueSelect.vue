<script lang="ts">
import { Component, Watch } from 'vue-property-decorator';
import TextBetweenCriteriaValueSelect from './TextBetweenCriteriaValueSelect.vue';

@Component
export default class IntegerBetweenCriteriaValueSelect extends TextBetweenCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (Array.isArray(value) && value.length === 2) {
      return value;
    }
    return null;
  }

  getRules() {
    return [this.rules.required, this.rules.isInteger];
  }
}
</script>
