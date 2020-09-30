<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">Save Report</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="title" label="Report Title" placeholder="My Report Title"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="autoRun"
                  label="Auto Run Mode"
                  hint="Adds a flag to the link causing the report to run on page load"
                  persistent-hint
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey darken-3" text @click="dialog = false">Cancel</v-btn>
          <v-btn color="grey darken-3" text @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class ReportSaveDialog extends Vue {
  private dialog: boolean = false;
  private title: string | null = null;
  private autoRun: boolean = false;

  clear() {
    this.title = null;
    this.autoRun = false;
  }

  read() {
    return {
      title: this.title,
      autorun: this.autoRun,
    };
  }

  open(defaultTitle) {
    this.clear();
    if (defaultTitle) {
      this.title = defaultTitle;
    }
    this.dialog = true;
  }

  save() {
    this.$emit('input', this.read());
    this.dialog = false;
  }

}
</script>
