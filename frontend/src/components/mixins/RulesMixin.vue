<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class RulesMixin extends Vue {
  rules = {
    required: (v) => (String(v).trim() !== '' && (Boolean(v) || v === 0)) || 'Required.',
    isInteger: (v) => (String(v).trim() !== '' && (!v || /^[+-]?\d+$/.test(v))) || 'Must be an integer',
    isNumber: (v) => (String(v).trim() !== '' && (!v || /^[+-]?\d+(\.\d+)?$/.test(v))) || 'Must be a number',
  };
}
</script>
