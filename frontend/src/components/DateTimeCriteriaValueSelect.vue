<script lang="ts">
import { Component } from 'vue-property-decorator';
import BaseDateCriteriaValueSelect from './BaseDateCriteriaValueSelect.vue';

@Component
export default class DateTimeCriteriaValueSelect extends BaseDateCriteriaValueSelect {
  static criteriaToOptionValue(criteria) {
    return this.ensureOptionValue(criteria);
  }

  static ensureOptionValue(value) {
    if (typeof (value) === 'string') {
      return value;
    }
    return null;
  }
}
</script>
