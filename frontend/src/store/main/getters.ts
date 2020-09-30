import { MainState } from './state';
import { getStoreAccessors } from 'typesafe-vuex';
import { State } from '../state';

export const getters = {
  hasAdminAccess: (state: MainState) => {
    return (
      state.userProfile &&
      state.userProfile.is_superuser && state.userProfile.is_active);
  },
  loginError: (state: MainState) => state.logInError,
  explorerShowDrawer: (state: MainState) => state.explorerShowDrawer,
  explorerMiniDrawer: (state: MainState) => state.explorerMiniDrawer,
  explorerExpandOnHover: (state: MainState) => state.explorerExpandOnHover,
  explorerShowSettingsDrawer: (state: MainState) => state.explorerShowSettingsDrawer,
  explorerShowLoadingOverlay: (state: MainState) => state.explorerShowLoadingOverlay,
  explorerReportState: (state: MainState) => state.explorerReportState,
  explorerResultLayout: (state: MainState) => state.explorerResultLayout,
  userProfile: (state: MainState) => state.userProfile,
  token: (state: MainState) => state.token,
  isLoggedIn: (state: MainState) => state.isLoggedIn,
  firstNotification: (state: MainState) => state.notifications.length > 0 && state.notifications[0],
  warehouses: (state: MainState) => state.warehouses,
  activeWarehouseId: (state: MainState) => state.activeWarehouseId,
  warehouseStructures: (state: MainState) => state.warehouseStructures,
  dimensions: (state: MainState) => {
    if (!state.activeWarehouseId) {
      return {};
    }
    const wh = state.warehouseStructures[state.activeWarehouseId];
    if (!wh) {
      return {};
    }

    // Get all dimensions in Warehouse and Datasources
    const dimensions = {};
    Object.assign(dimensions, wh.dimensions);
    for (const ds of wh.datasources) {
      if (!ds.dimensions) {
        continue;
      }
      Object.assign(dimensions, ds.dimensions);
    }
    return dimensions;
  },
  metrics: (state: MainState) => {
    if (!state.activeWarehouseId) {
      return {};
    }
    const wh = state.warehouseStructures[state.activeWarehouseId];
    if (!wh) {
      return {};
    }

    // Get all metrics in Warehouse and Datasources
    const metrics = {};
    Object.assign(metrics, wh.metrics);
    for (const ds of wh.datasources) {
      if (!ds.metrics) {
        continue;
      }
      Object.assign(metrics, ds.metrics);
    }
    return metrics;
  },
  reportResult: (state: MainState) => state.reportResult,
  reportRequest: (state: MainState) => state.reportRequest,
  reportCancelToken: (state: MainState) => state.reportCancelToken,
};

const { read } = getStoreAccessors<MainState, State>('');

export const readExplorerMiniDrawer = read(getters.explorerMiniDrawer);
export const readExplorerShowDrawer = read(getters.explorerShowDrawer);
export const readExplorerExpandOnHover = read(getters.explorerExpandOnHover);
export const readExplorerShowSettingsDrawer = read(getters.explorerShowSettingsDrawer);
export const readExplorerShowLoadingOverlay = read(getters.explorerShowLoadingOverlay);
export const readExplorerReportState = read(getters.explorerReportState);
export const readExplorerResultLayout = read(getters.explorerResultLayout);
export const readHasAdminAccess = read(getters.hasAdminAccess);
export const readIsLoggedIn = read(getters.isLoggedIn);
export const readLoginError = read(getters.loginError);
export const readToken = read(getters.token);
export const readUserProfile = read(getters.userProfile);
export const readFirstNotification = read(getters.firstNotification);
export const readWarehouses = read(getters.warehouses);
export const readActiveWarehouseId = read(getters.activeWarehouseId);
export const readWarehouseStructures = read(getters.warehouseStructures);
export const readDimensions = read(getters.dimensions);
export const readMetrics = read(getters.metrics);
export const readReportResult = read(getters.reportResult);
export const readReportRequest = read(getters.reportRequest);
export const readReportCancelToken = read(getters.reportCancelToken);
