<template>
  <router-view></router-view>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { store } from '@/store';
import { dispatchCheckLoggedIn } from '@/store/main/actions';
import { readIsLoggedIn } from '@/store/main/getters';

const startRouteGuard = async (to, from, next) => {
  await dispatchCheckLoggedIn(store);
  if (readIsLoggedIn(store)) {
    if (to.path === '/login' || to.path === '/') {
      next('/main/explorer');
    } else {
      next();
    }
  } else if (readIsLoggedIn(store) === false) {
    if (to.path === '/' || (to.path as string).startsWith('/main')) {
      if (!to.fullPath || to.fullPath === '/' || to.fullPath === '/login') {
        next('/login');
      } else {
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        });
      }
    } else {
      next();
    }
  }
};

@Component
export default class Start extends Vue {
  public beforeRouteEnter(to, from, next) {
    startRouteGuard(to, from, next);
  }

  public beforeRouteUpdate(to, from, next) {
    startRouteGuard(to, from, next);
  }
}
</script>
