<template>
  <v-container container--fluid class="content-container">
    <v-card class="mx-0 pa-3">
      <v-card-title>
        <h5>Edit User</h5>
      </v-card-title>
      <v-card-text>
        <template>
          <div class="my-3">
            <div class="subtitle-1 secondary--text text--lighten-2">Username</div>
            <div class="text-body-1 text--darken-2" v-if="user">{{ user.email }}</div>
            <div class="text-body-1 text--darken-2" v-else>-----</div>
          </div>
          <v-form v-model="valid" ref="form" lazy-validation>
            <v-text-field label="Full Name" v-model="fullName" required></v-text-field>
            <v-text-field
              label="E-mail"
              type="email"
              v-model="email"
              v-validate="'required|email'"
              data-vv-name="email"
              :error-messages="errors.collect('email')"
              required
            ></v-text-field>
            <div class="subtitle-2 secondary--text text--lighten-3">
              User is superuser
              <span v-if="isSuperuser">(currently is a superuser)</span>
              <span v-else>(currently is not a superuser)</span>
            </div>
            <v-checkbox color="grey darken-3" label="Is Superuser" v-model="isSuperuser"></v-checkbox>
            <div class="subtitle-2 secondary--text text--lighten-3">
              User is active
              <span v-if="isActive">(currently active)</span>
              <span v-else>(currently not active)</span>
            </div>
            <v-checkbox color="grey darken-3" label="Is Active" v-model="isActive"></v-checkbox>
            <v-select
              v-model="warehouseIds"
              :items="warehouses"
              item-text="name"
              item-value="id"
              label="Warehouse Access"
              hint="Superusers can access all warehouses automatically."
              persistent-hint
              multiple
              chips
              deletable-chips
            ></v-select>
            <v-layout align-center>
              <v-flex shrink>
                <v-checkbox color="grey darken-3" v-model="setPassword" class="mr-2"></v-checkbox>
              </v-flex>
              <v-flex>
                <v-text-field
                  :disabled="!setPassword"
                  type="password"
                  ref="password"
                  label="Set Password"
                  data-vv-name="password"
                  data-vv-delay="100"
                  v-validate="{ required: setPassword }"
                  v-model="password1"
                  :error-messages="errors.first('password')"
                ></v-text-field>
                <v-text-field
                  v-show="setPassword"
                  type="password"
                  label="Confirm Password"
                  data-vv-name="password_confirmation"
                  data-vv-delay="100"
                  data-vv-as="password"
                  v-validate="{ required: setPassword, confirmed: 'password' }"
                  v-model="password2"
                  :error-messages="errors.first('password_confirmation')"
                ></v-text-field>
              </v-flex>
            </v-layout>
          </v-form>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="cancel">Cancel</v-btn>
        <v-btn @click="reset">Reset</v-btn>
        <v-btn @click="submit" :disabled="!valid">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { IUserProfileUpdate } from "@/interfaces";
import { dispatchGetUser, dispatchUpdateUser } from "@/store/admin/actions";
import { readAdminOneUser } from "@/store/admin/getters";
import { dispatchHydrateWarehouses } from "@/store/main/actions";
import { readWarehouses } from "@/store/main/getters";

@Component
export default class EditUser extends Vue {
  public valid = true;
  public fullName: string = "";
  public email: string = "";
  public isActive: boolean = true;
  public isSuperuser: boolean = false;
  public warehouseIds: number[] = [];
  public setPassword = false;
  public password1: string = "";
  public password2: string = "";

  public async mounted() {
    await dispatchHydrateWarehouses(this.$store);
    await dispatchGetUser(this.$store, +this.$route.params.id);
    this.hydrateForm();
  }

  public reset() {
    this.setPassword = false;
    this.password1 = "";
    this.password2 = "";
    this.$validator.reset();
    this.hydrateForm();
  }

  public hydrateForm() {
    if (!this.user) {
      return;
    }

    this.fullName = this.user.full_name;
    this.email = this.user.email;
    this.isActive = this.user.is_active;
    this.isSuperuser = this.user.is_superuser;
    this.warehouseIds = [...(this.user.warehouse_ids || [])];
  }

  public cancel() {
    this.$router.back();
  }

  public async submit() {
    if (await this.$validator.validateAll()) {
      const updatedProfile: IUserProfileUpdate = {};
      if (this.fullName) {
        updatedProfile.full_name = this.fullName;
      }
      if (this.email) {
        updatedProfile.email = this.email;
      }
      updatedProfile.is_active = this.isActive;
      updatedProfile.is_superuser = this.isSuperuser;
      updatedProfile.warehouse_ids = this.warehouseIds;
      if (this.setPassword) {
        updatedProfile.password = this.password1;
      }
      await dispatchUpdateUser(this.$store, { id: this.user!.id, user: updatedProfile });
      this.$router.push("/main/admin/users");
    }
  }

  get user() {
    return readAdminOneUser(this.$store)(+this.$route.params.id);
  }

  get warehouses() {
    return Object.values(readWarehouses(this.$store));
  }

  @Watch("user")
  onUserChanged() {
    this.hydrateForm();
  }
}
</script>
