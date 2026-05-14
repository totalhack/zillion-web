import type Vue from "vue";
import type { Store } from "vuex";

declare module "vue/types/options" {
  interface ComponentOptions<V extends Vue> {
    store?: Store<any>;
  }
}

declare module "vue/types/vue" {
  interface Vue {
    $store: Store<any>;
  }
}
