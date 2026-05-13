<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent scrollable max-width="600px">
      <v-card class="report-save-dialog__card">
        <v-card-title>
          <span class="headline">Save Report</span>
        </v-card-title>
        <v-card-text class="report-save-dialog__body">
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="title" label="Report Title" placeholder="My Report Title"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox
                  v-model="autoRun"
                  label="Auto Run Mode"
                  hint="Adds a flag so the report to run on page load"
                  persistent-hint
                ></v-checkbox>
              </v-col>
              <v-col cols="12" sm="6">
                <v-checkbox
                  v-model="update"
                  v-show="showUpdate()"
                  label="Update Report"
                  hint="Save over the existing report."
                  persistent-hint
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="report-save-dialog__actions">
          <v-spacer></v-spacer>
          <v-btn color="grey darken-3" text @click="dialog = false">Cancel</v-btn>
          <v-btn color="grey darken-3" text @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";

@Component
export default class ReportSaveDialog extends Vue {
  private dialog: boolean = false;
  private title: string | null = null;
  private autoRun: boolean = false;
  private update: boolean = false;

  @Watch("dialog")
  onDialogChanged(value: boolean) {
    this.$emit("visibility-change", value);
  }

  showUpdate() {
    const urlParams = new URLSearchParams(window.location.search);
    const warehouse = urlParams.get("warehouse");
    const report = urlParams.get("report");
    if (warehouse && report) {
      return true;
    }
    return false;
  }

  clear() {
    this.title = null;
    this.autoRun = false;
    this.update = false;
  }

  read() {
    return {
      title: this.title,
      autorun: this.autoRun,
      update: this.update,
    };
  }

  open(defaultTitle) {
    this.clear();
    if (defaultTitle) {
      this.title = defaultTitle;
    }
    this.dialog = true;
  }

  close() {
    this.dialog = false;
  }

  save() {
    this.$emit("input", this.read());
    this.close();
  }
}
</script>

<style>
.report-save-dialog__card {
  display: flex;
  flex-direction: column;
  width: min(600px, calc(100vw - 24px));
  max-width: 100%;
  max-height: calc(100dvh - 24px);
}

.report-save-dialog__body {
  overflow-y: auto;
}

.report-save-dialog__actions {
  flex-shrink: 0;
  background: white;
}

@media (max-width: 600px) {
  .report-save-dialog__card {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }
}
</style>
