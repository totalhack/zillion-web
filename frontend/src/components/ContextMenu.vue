<template>
    <v-menu v-model="showMenu" :position-x="x" :position-y="y" absolute offset-y>
        <v-list>
            <v-list-item @click="handleItemClick($event, item)" v-for="(item, index) in items" :key="index">
                <v-list-item-title>{{ item }}</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class ContextMenu extends Vue {
    @Prop({ default: [] }) options: any;
    @Prop({}) handler: any;

    private x: number = 0;
    private y: number = 0;
    private context: any = {};
    private showMenu: boolean = false;

    open(e, context) {
        e.preventDefault();
        this.showMenu = false;
        this.context = context;
        this.x = e.clientX;
        this.y = e.clientY;
        this.$nextTick(() => {
            this.showMenu = true;
        });
    }

    handleItemClick(e, item) {
        this.handler(item, this.context);
    }

    get items() {
        return this.options;
        // const itemList: any = [];
        // for (const option of this.options) {
        //     itemList.push({
        //         title: option
        //     });
        // }
        // return itemList;
    }
}
</script>

