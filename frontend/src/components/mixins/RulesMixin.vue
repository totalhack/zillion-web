<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class RulesMixin extends Vue {
  rules = {
    required: (v) => !!v || 'Required.',
    isInteger: (v) => (!v || /^[+-]?\d+$/.test(v)) || 'Must be an integer',
    isNumber: (v) => (!v || /^[+-]?\d+(\.\d+)?$/.test(v)) || 'Must be a number',
  };
}
</script>
