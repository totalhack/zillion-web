<template>
  <v-text-field v-model="limit" :rules="[rules.isInteger]" hide-details="auto"></v-text-field>
</template>

<script lang="ts">
import { Component, Mixins, Vue } from 'vue-property-decorator';
import RulesMixin from '@/components/mixins/RulesMixin.vue';

@Component
export default class LimitSelect extends Mixins(RulesMixin) {
  private limit: number | null = 10000;

  get selected() {
    return this.limit || null;
  }

  set selected(limit) {
    this.limit = limit;
  }
}
</script>
