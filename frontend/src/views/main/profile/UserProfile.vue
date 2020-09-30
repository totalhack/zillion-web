<template>
  <v-container container--fluid class="content-container">
    <v-row>
      <v-col cols="12" md="8" lg="6" class="ma-0 pa-0">
        <v-card class="mx-3 pa-3">
          <v-card-title>
            <h5>User Profile</h5>
          </v-card-title>
          <v-card-text>
            <div class="my-4">
              <div class="subtitle-1 secondary--text text--lighten-3">Full Name</div>
              <div
                class="text-body-1 grey--text text--darken-3"
                v-if="userProfile && userProfile.full_name"
              >{{userProfile.full_name}}</div>
              <div class="text-body-1 grey--text text--darken-3" v-else>-----</div>
            </div>
            <div class="my-3">
              <div class="subtitle-1 secondary--text text--lighten-3">Email</div>
              <div
                class="text-body-1 grey--text text--darken-3"
                v-if="userProfile && userProfile.email"
              >{{userProfile.email}}</div>
              <div class="text-body-1 grey--text text--darken-3" v-else>-----</div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn to="/main/profile/edit">Edit</v-btn>
            <v-btn to="/main/profile/password">Change password</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Store } from 'vuex';
import { readUserProfile } from '@/store/main/getters';

@Component
export default class UserProfile extends Vue {
  get userProfile() {
    return readUserProfile(this.$store);
  }

  public goToEdit() {
    this.$router.push('/main/profile/edit');
  }

  public goToPassword() {
    this.$router.push('/main/profile/password');
  }
}
</script>
