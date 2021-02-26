import Vue from 'vue';
import { IUserProfile, IReportResult, IReportRequest } from '@/interfaces';
import { MainState, AppNotification } from './state';
import { getStoreAccessors } from 'typesafe-vuex';
import { State } from '../state';

export const mutations = {
  setToken(state: MainState, payload: string) {
    state.token = payload;
  },
  setLoggedIn(state: MainState, payload: boolean) {
    state.isLoggedIn = payload;
  },
  setLogInError(state: MainState, payload: boolean) {
    state.logInError = payload;
  },
  setUserProfile(state: MainState, payload: IUserProfile) {
    state.userProfile = payload;
  },
  setExplorerMiniDrawer(state: MainState, payload: boolean) {
    state.explorerMiniDrawer = payload;
  },
  setExplorerShowDrawer(state: MainState, payload: boolean) {
    state.explorerShowDrawer = payload;
  },
  setExplorerShowSettingsDrawer(state: MainState, payload: boolean) {
    state.explorerShowSettingsDrawer = payload;
  },
  setExplorerShowLoadingOverlay(state: MainState, payload: boolean) {
    state.explorerShowLoadingOverlay = payload;
  },
  setExplorerReportState(state: MainState, payload: string) {
    state.explorerReportState = payload;
  },
  setExplorerResultLayout(state: MainState, payload: string) {
    state.explorerResultLayout = payload;
  },
  addNotification(state: MainState, payload: AppNotification) {
    state.notifications.push(payload);
  },
  removeNotification(state: MainState, payload: AppNotification) {
    state.notifications = state.notifications.filter((notification) => notification !== payload);
  },
  clearNotifications(state: MainState) {
    state.notifications = state.notifications.filter((notification) => false);
  },
  setWarehouses(state: MainState, payload: object) {
    // Freeze prevents reactivity - https://github.com/vuejs/vue/issues/2637
    state.warehouses = Object.freeze(payload);
  },
  setActiveWarehouseId(state: MainState, payload: number) {
    state.activeWarehouseId = payload;
  },
  setWarehouseStructure(state: MainState, payload: any) {
    Vue.set(state.warehouseStructures, payload.id, payload.warehouse);
  },
  setReportResult(state: MainState, payload: IReportResult) {
    state.reportResult = Object.freeze(payload);
  },
  setReportRequest(state: MainState, payload: IReportRequest) {
    state.reportRequest = Object.freeze(payload);
  },
  setReportCancelToken(state: MainState, payload) {
    state.reportCancelToken = payload;
  },
};

const { commit } = getStoreAccessors<MainState | any, State>('');

export const commitSetExplorerMiniDrawer = commit(mutations.setExplorerMiniDrawer);
export const commitSetExplorerShowDrawer = commit(mutations.setExplorerShowDrawer);
export const commitSetExplorerShowSettingsDrawer = commit(mutations.setExplorerShowSettingsDrawer);
export const commitSetExplorerShowLoadingOverlay = commit(mutations.setExplorerShowLoadingOverlay);
export const commitSetExplorerReportState = commit(mutations.setExplorerReportState);
export const commitSetExplorerResultLayout = commit(mutations.setExplorerResultLayout);
export const commitSetLoggedIn = commit(mutations.setLoggedIn);
export const commitSetLogInError = commit(mutations.setLogInError);
export const commitSetToken = commit(mutations.setToken);
export const commitSetUserProfile = commit(mutations.setUserProfile);
export const commitAddNotification = commit(mutations.addNotification);
export const commitRemoveNotification = commit(mutations.removeNotification);
export const commitClearNotifications = commit(mutations.clearNotifications);
export const commitSetWarehouses = commit(mutations.setWarehouses);
export const commitSetActiveWarehouseId = commit(mutations.setActiveWarehouseId);
export const commitSetWarehouseStructure = commit(mutations.setWarehouseStructure);
export const commitSetReportResult = commit(mutations.setReportResult);
export const commitSetReportRequest = commit(mutations.setReportRequest);
export const commitSetReportCancelToken = commit(mutations.setReportCancelToken);
