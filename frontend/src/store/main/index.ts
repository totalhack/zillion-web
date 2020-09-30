import { mutations } from './mutations';
import { getters } from './getters';
import { actions } from './actions';
import { MainState } from './state';

const defaultState: MainState = {
  isLoggedIn: null,
  token: '',
  logInError: false,
  userProfile: null,
  explorerMiniDrawer: true,
  explorerShowDrawer: true,
  explorerExpandOnHover: true,
  explorerShowSettingsDrawer: false,
  explorerShowLoadingOverlay: false,
  explorerReportState: '',
  explorerResultLayout: 'wide',
  notifications: [],
  warehouses: {},
  activeWarehouseId: null,
  warehouseStructures: {},
  reportResult: null,
  reportRequest: null,
  reportCancelToken: null,
};

export const mainModule = {
  state: defaultState,
  mutations,
  actions,
  getters,
};
