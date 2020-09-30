import '@babel/polyfill';
// Import Component hooks before component definitions
import './component-hooks';
import Vue from 'vue';
import Vuetify from './plugins/vuetify';
import './plugins/vee-validate';
import './plugins/vue-head';
import './plugins/vue-multiselect';
import './plugins/vue-draggable';
import './plugins/vue-datepicker';

import App from './App.vue';
import router from './router';
import store from '@/store';
import './registerServiceWorker';

import 'vue-multiselect/dist/vue-multiselect.min.css';
import 'vue2-datepicker/index.css';
import './assets/css/main.css';

Vue.config.productionTip = false;
Vue.prototype.$debug = (process.env.VUE_APP_ENV === 'development');

const app = new Vue({
  router,
  store,
  vuetify: Vuetify,
  render: (h) => h(App),
}).$mount('#app');

if ((window as any).Cypress) {
  // only available during E2E tests
  (window as any).app = app;
}
