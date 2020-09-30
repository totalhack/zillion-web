<script lang="ts">
import { Component, PropSync, Mixins, Vue } from 'vue-property-decorator';
import RulesMixin from '@/components/mixins/RulesMixin.vue';

@Component
export default class BaseCriteriaValueSelect extends Mixins(RulesMixin) {
  static criteriaToOptionValue(criteria) {
    return criteria;
  }

  static ensureOptionValue(value) {
    return value;
  }

  inputRefs: string[] = [];

  @PropSync('value') syncedValue: any;
  label!: string;

  onInput(newValue) {
    this.syncedValue = newValue;
  }

  getRules(): any {
    return [this.rules.required];
  }

  validate() {
    let result = true;
    for (const inputRef of this.inputRefs) {
      const input: any = this.$refs[inputRef];
      input.validate(true);
      if (!input.valid) {
        // We don't break so all inputs are checked and reflect
        // the proper validation status.
        result = false;
      }
    }
    return result;
  }

  get criteriaValue() {
    return this.syncedValue;
  }
}
</script>
