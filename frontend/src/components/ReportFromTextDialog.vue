<template>
    <v-row justify="center">
        <v-dialog v-model="dialog" persistent max-width="600px">
            <v-card>
                <v-card-title>
                    <span class="headline">NLP Report</span>
                </v-card-title>
                <v-card-text>
                    <v-container>
                        <v-row>
                            <v-col cols="10">
                                <span class="v-text-field--placeholder">
                                    Natural Language Query:
                                </span>
                                <v-textarea ref="textInput" v-model="text" placeholder="x by y this week" rows="1" autofocus
                                    auto-grow @keydown.enter="keyListenerHandler">
                                </v-textarea>
                            </v-col>
                            <v-col class="d-flex justify-center align-center" cols="2">
                                <v-icon small class="mb-1" @click.stop="clearText">delete</v-icon>
                                <span class="ml-1">Clear</span>
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-col cols="12">
                                <v-checkbox v-model="autoRun" label="Auto Run Mode"
                                    hint="Automatically run the report after load" persistent-hint></v-checkbox>
                            </v-col>
                        </v-row>
                    </v-container>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="grey darken-3" text @click="dialog = false">Cancel</v-btn>
                    <v-btn color="grey darken-3" text @click="save">Load</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class ReportFromTextDialog extends Vue {
    private dialog: boolean = false;
    private text: string | null = null;
    private autoRun: boolean = false;
    private _keyListener: any;

    clear() {
        this.text = null;
        this.autoRun = false;
    }

    clearText() {
        this.text = null;
    }

    read() {
        return {
            text: this.text,
            autorun: this.autoRun
        };
    }

    open() {
        this.dialog = true;
    }

    save() {
        if (this.text && this.text.trim().length > 0) {
            this.$emit('input', this.read());
        }
        this.dialog = false;
    }

    async mounted() {
        this.addKeyListener();
    }

    keyListenerHandler(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            this.save();
        }
    }

    private addKeyListener() {
        this._keyListener = this.keyListenerHandler.bind(this);
        document.addEventListener('keydown', this._keyListener);
    }

}
</script>
