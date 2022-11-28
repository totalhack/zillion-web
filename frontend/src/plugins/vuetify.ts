import Vue from 'vue';
import Vuetify from 'vuetify';

Vue.use(Vuetify);

export default new Vuetify({
  icons: {
    iconfont: 'md',
  },
  theme: {
    dark: false,
    themes: {
      light: {
        error: '#c83b3b',
        warning: '#d37a08',
      },
      dark: {
        error: '#c83b3b',
        warning: '#d37a08',
      },
    },

  },
});
