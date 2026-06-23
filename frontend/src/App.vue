<template>
  <div id="app">
    <v-app>
      <v-main v-if="loggedIn === null">
        <v-container fill-height>
          <v-layout align-center justify-center>
            <v-flex>
              <div class="text-center">
                <div class="headline my-5">Loading...</div>
                <v-progress-circular size="100" indeterminate></v-progress-circular>
              </div>
            </v-flex>
          </v-layout>
        </v-container>
      </v-main>
      <router-view v-else />
      <v-dialog v-model="showServiceWorkerUpdatePrompt" max-width="520" persistent>
        <v-card>
          <v-card-title class="headline">Update available</v-card-title>
          <v-card-text>
            A newer frontend build is available for this tab. Ignore for now to keep working with the current page, or
            fetch updates to reload with the latest code.
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn text @click="dismissServiceWorkerUpdatePrompt">Ignore for now</v-btn>
            <v-btn color="primary" text @click="refreshWithServiceWorkerUpdate">Fetch updates</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <NotificationsManager></NotificationsManager>
    </v-app>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import NotificationsManager from "@/components/NotificationsManager.vue";
import { readIsLoggedIn } from "@/store/main/getters";
import { dispatchCheckLoggedIn } from "@/store/main/actions";
import { onServiceWorkerUpdate, refreshForServiceWorkerUpdate } from "@/registerServiceWorker";

@Component({
  components: {
    NotificationsManager,
  },
})
export default class App extends Vue {
  public showServiceWorkerUpdatePrompt: boolean = false;
  private removeServiceWorkerUpdateListener: (() => void) | null = null;

  get loggedIn() {
    return readIsLoggedIn(this.$store);
  }

  public async created() {
    this.removeServiceWorkerUpdateListener = onServiceWorkerUpdate(() => {
      this.showServiceWorkerUpdatePrompt = true;
    });
    await dispatchCheckLoggedIn(this.$store);
  }

  public beforeDestroy() {
    this.removeServiceWorkerUpdateListener?.();
  }

  public dismissServiceWorkerUpdatePrompt() {
    this.showServiceWorkerUpdatePrompt = false;
  }

  public refreshWithServiceWorkerUpdate() {
    this.showServiceWorkerUpdatePrompt = false;
    refreshForServiceWorkerUpdate();
  }
}
</script>
