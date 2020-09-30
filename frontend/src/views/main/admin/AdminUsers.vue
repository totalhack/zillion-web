<template>
  <v-container container--fluid class="content-container">
    <v-card class="mx-0 pa-3">
      <v-card-title>
        <h5>Manage Users</h5>
        <v-spacer></v-spacer>
        <v-btn to="/main/admin/users/create">Create User</v-btn>
      </v-card-title>
      <v-data-table :headers="headers" :items="users">
        <template v-slot:item.name="{ item }">{{ item.name }}</template>
        <template v-slot:item.email="{ item }">{{ item.email }}</template>
        <template v-slot:item.full_name="{ item }">{{ item.full_name }}</template>
        <template v-slot:item.isActive="{ item }">
          <v-simple-checkbox v-model="item.is_active" disabled></v-simple-checkbox>
        </template>
        <template v-slot:item.isSuperuser="{ item }">
          <v-simple-checkbox v-model="item.is_superuser" disabled></v-simple-checkbox>
        </template>
        <template v-slot:item.id="{ item }">
          <v-tooltip top>
            <span>Edit</span>
            <template v-slot:activator="{ on }">
              <v-btn
                v-on="on"
                text
                :to="{name: 'main-admin-users-edit', params: {id: item.id}}"
                class="pa-0"
                style="min-width:0"
              >
                <v-icon>edit</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Store } from 'vuex';
import { IUserProfile } from '@/interfaces';
import { readAdminUsers } from '@/store/admin/getters';
import { dispatchGetUsers } from '@/store/admin/actions';

@Component
export default class AdminUsers extends Vue {
  public headers = [
    {
      text: 'Name',
      sortable: true,
      value: 'name',
      align: 'left',
    },
    {
      text: 'Email',
      sortable: true,
      value: 'email',
      align: 'left',
    },
    {
      text: 'Full Name',
      sortable: true,
      value: 'full_name',
      align: 'left',
    },
    {
      text: 'Is Active',
      sortable: true,
      value: 'isActive',
      align: 'left',
    },
    {
      text: 'Is Superuser',
      sortable: true,
      value: 'isSuperuser',
      align: 'left',
    },
    {
      text: 'Actions',
      value: 'id',
    },
  ];

  get users() {
    return readAdminUsers(this.$store);
  }

  public async mounted() {
    await dispatchGetUsers(this.$store);
  }
}
</script>
