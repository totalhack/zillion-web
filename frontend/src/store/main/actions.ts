import { api } from '@/api';
import router from '@/router';
import { getLocalToken, removeLocalToken, saveLocalToken } from '@/utils';
import axios, { AxiosError } from 'axios';
import { getStoreAccessors } from 'typesafe-vuex';
import { ActionContext } from 'vuex';
import { State } from '../state';
import Vue from 'vue';
import {
  readExplorerShowSettingsDrawer,
  readReportCancelToken,
  readActiveWarehouseId,
  readWarehouseStructures,
  readWarehouses
} from './getters';
import {
  commitAddNotification,
  commitRemoveNotification,
  commitClearNotifications,
  commitSetLoggedIn,
  commitSetLogInError,
  commitSetToken,
  commitSetUserProfile,
  commitSetWarehouses,
  commitSetActiveWarehouseId,
  commitSetWarehouseStructure,
  commitSetReportRequest,
  commitSetReportResult,
  commitSetExplorerShowSettingsDrawer,
  commitSetExplorerShowLoadingOverlay,
  commitSetExplorerReportState,
  commitSetExplorerResultLayout,
  commitSetReportCancelToken,
} from './mutations';
import { AppNotification, MainState } from './state';

type MainContext = ActionContext<MainState, State>;

export const actions = {
  async actionLogIn(context: MainContext, payload: { username: string; password: string }) {
    try {
      const response = await api.logInGetToken(payload.username, payload.password);
      const token = response.data.access_token;
      if (token) {
        saveLocalToken(token);
        commitSetToken(context, token);
        commitSetLoggedIn(context, true);
        commitSetLogInError(context, false);
        await dispatchGetUserProfile(context);
        await dispatchRouteLoggedIn(context);
      } else {
        await dispatchLogOut(context);
      }
    } catch (err) {
      commitSetLogInError(context, true);
      await dispatchLogOut(context);
    }
  },
  async actionGetUserProfile(context: MainContext) {
    try {
      const response = await api.getMe(context.state.token);
      if (response.data) {
        commitSetUserProfile(context, response.data);
      }
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async actionUpdateUserProfile(context: MainContext, payload) {
    try {
      const loadingNotification = { content: 'Saving', showProgress: true };
      commitAddNotification(context, loadingNotification);
      const response = (await Promise.all([
        api.updateMe(context.state.token, payload),
        await new Promise((resolve, reject) => setTimeout(() => resolve(), 500)),
      ]))[0];
      commitSetUserProfile(context, response.data);
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { content: 'Profile successfully updated', color: 'success' });
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async actionCheckLoggedIn(context: MainContext) {
    if (!context.state.isLoggedIn) {
      let token = context.state.token;
      if (!token) {
        const localToken = getLocalToken();
        if (localToken) {
          commitSetToken(context, localToken);
          token = localToken;
        }
      }
      if (token) {
        try {
          const response = await api.getMe(token);
          commitSetLoggedIn(context, true);
          commitSetUserProfile(context, response.data);
        } catch (error) {
          await dispatchRemoveLogIn(context);
        }
      } else {
        await dispatchRemoveLogIn(context);
      }
    }
  },
  async actionRemoveLogIn(context: MainContext) {
    removeLocalToken();
    commitSetToken(context, '');
    commitSetLoggedIn(context, false);
  },
  async actionLogOut(context: MainContext) {
    await dispatchRemoveLogIn(context);
    await dispatchRouteLogOut(context);
  },
  async actionUserLogOut(context: MainContext) {
    await dispatchLogOut(context);
  },
  actionRouteLogOut(context: MainContext) {
    if (router.currentRoute.path !== '/login') {
      router.push('/login');
    }
  },
  async actionCheckApiError(context: MainContext, payload: AxiosError) {
    if (axios.isCancel(payload)) {
      console.log('Request canceled:', payload.message);
    } else {
      if (payload.response?.status === 401) {
        await dispatchLogOut(context);
      } else {
        let msg: string;
        let timeout: number | null = null;
        if (!payload.response) {
          msg = 'Error: no response from backend';
        } else {
          if (Vue.prototype.$debug) {
            timeout = -1;
          }
          if (typeof (payload.response?.data) === 'string') {
            msg = 'Error: ' + payload.response?.data;
          } else {
            msg = 'Error: ' + JSON.stringify(payload.response?.data, null, 2);
          }
        }
        const notification = { content: msg, color: 'error' };
        if (timeout) {
          notification['timeout'] = timeout;
        }
        commitAddNotification(context, notification);
      }
    }
  },
  actionRouteLoggedIn(context: MainContext) {
    if (router.currentRoute.path === '/login' || router.currentRoute.path === '/') {
      router.push('/main/explorer');
    }
  },
  async addNotification(context: MainContext, payload: AppNotification) {
    commitAddNotification(context, payload);
  },
  async clearNotifications(context: MainContext) {
    commitClearNotifications(context);
  },
  async addWarning(context: MainContext, payload: string) {
    commitAddNotification(context, { content: payload, color: 'warning' });
  },
  async addError(context: MainContext, payload: string) {
    commitAddNotification(context, { content: payload, color: 'error' });
  },
  async removeNotification(context: MainContext, payload: { notification: AppNotification, timeout: number }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        commitRemoveNotification(context, payload.notification);
        resolve(true);
      }, payload.timeout);
    });
  },
  async passwordRecovery(context: MainContext, payload: { username: string }) {
    const loadingNotification = { content: 'Sending password recovery email', showProgress: true };
    try {
      commitAddNotification(context, loadingNotification);
      const response = (await Promise.all([
        api.passwordRecovery(payload.username),
        await new Promise((resolve, reject) => setTimeout(() => resolve(), 500)),
      ]))[0];
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { content: 'Password recovery email sent', color: 'success' });
      await dispatchLogOut(context);
    } catch (error) {
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { color: 'error', content: 'Incorrect username' });
    }
  },
  async resetPassword(context: MainContext, payload: { password: string, token: string }) {
    const loadingNotification = { content: 'Resetting password', showProgress: true };
    try {
      commitAddNotification(context, loadingNotification);
      const response = (await Promise.all([
        api.resetPassword(payload.password, payload.token),
        await new Promise((resolve, reject) => setTimeout(() => resolve(), 500)),
      ]))[0];
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { content: 'Password successfully reset', color: 'success' });
      await dispatchLogOut(context);
    } catch (error) {
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { color: 'error', content: 'Error resetting password' });
    }
  },
  async setActiveWarehouseId(context: MainContext, payload: number) {
    const structures = readWarehouseStructures(context);
    if (!structures[payload]) {
      await dispatchHydrateWarehouseStructure(context, payload);
    }
    commitSetActiveWarehouseId(context, payload);
  },
  async setDefaultWarehouseId(context: MainContext) {
    const whs = Object.values(readWarehouses(context));
    if (whs.length) {
      // Just use the first warehouse as the default
      dispatchSetActiveWarehouseId(context, whs[0].id);
    }
  },
  async hydrateWarehouseStructure(context: MainContext, payload: number) {
    try {
      const response = await api.getWarehouseStructure(context.state.token, payload);
      if (response.data) {
        commitSetWarehouseStructure(context, response.data);
      }
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async hydrateWarehouses(context: MainContext) {
    try {
      const response = await api.getWarehouses(context.state.token);
      if (response.data) {
        commitSetWarehouses(context, response.data);
      }
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async hydrateExplorerStore(context: MainContext) {
    await dispatchHydrateWarehouses(context);
  },
  async hydrateWarehouseStore(context: MainContext) {
    let whs = Object.values(readWarehouses(context));
    if (!whs.length) {
      await dispatchHydrateWarehouses(context);
      whs = Object.values(readWarehouses(context));
    }

    const structures = readWarehouseStructures(context);

    for (const wh of whs) {
      if (!structures[wh.id]) {
        await dispatchHydrateWarehouseStructure(context, wh.id);
      }
    }
  },
  async checkFormula(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, 'Trying to check formula without an active warehouse');
        return;
      }
      const response = await api.checkFormula(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, 'No data in checkFormula response');
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async executeReport(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, 'Trying to execute report without an active warehouse');
        return;
      }

      commitSetExplorerReportState(context, 'Querying backend...');
      dispatchExplorerOpenLoadingOverlay(context);

      let cancelToken = readReportCancelToken(context);
      if (cancelToken) {
        // XXX There may be an existing request in progress.
        // Probably need to do something smarter here.
        cancelToken.cancel();
      }
      cancelToken = axios.CancelToken.source();

      dispatchSetReportCancelToken(context, cancelToken);
      const response = await api.executeReport(context.state.token, warehouseId, payload, cancelToken);
      dispatchSetReportCancelToken(context, null);

      dispatchExplorerSetReportState(context, 'Processing response...');
      if (response.data) {
        // XXX: Vue or the UI seems to choke and not update the reactive
        // report state text unless we defer this with setTimeout...?
        setTimeout(() => {
          dispatchSetReportRequest(context, payload);
          dispatchSetReportResult(context, response.data);
          if (response.data.data === undefined) {
            console.warn('Unexpected response:');
            console.warn(response);
          }
          if (response.data.data.length) {
            dispatchExplorerCloseSettingsDrawer(context);
          }
        }, 0);
      } else {
        dispatchExplorerCloseLoadingOverlay(context);
        dispatchExplorerSetReportState(context, '');
      }
      return true;
    } catch (error) {
      // TODO: consider changing to catch more cases:
      // https://github.com/axios/axios#handling-errors
      await dispatchCheckApiError(context, error);
      dispatchSetReportCancelToken(context, null);
      dispatchExplorerCloseLoadingOverlay(context);
      dispatchExplorerSetReportState(context, '');
      return false;
    }
  },
  async saveReport(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, 'Trying to save report without an active warehouse');
        return;
      }
      const response = await api.saveReport(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, 'No data in saveReport response');
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  cancelReport(context: MainContext) {
    const cancelToken = readReportCancelToken(context);
    if (cancelToken) {
      cancelToken.cancel();
      dispatchSetReportCancelToken(context, null);
    }
  },
  async getReportFromId(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, 'Trying to load report without an active warehouse');
        return;
      }
      const response = await api.getReportFromId(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, 'No data in getReportFromId response');
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  setReportRequest(context: MainContext, payload) {
    commitSetReportRequest(context, payload);
  },
  setReportResult(context: MainContext, payload) {
    commitSetReportResult(context, payload);
  },
  setReportCancelToken(context: MainContext, payload) {
    commitSetReportCancelToken(context, payload);
  },
  explorerToggleSettingsDrawer(context: MainContext) {
    commitSetExplorerShowSettingsDrawer(context, !readExplorerShowSettingsDrawer(context));
  },
  explorerOpenSettingsDrawer(context: MainContext) {
    commitSetExplorerShowSettingsDrawer(context, true);
  },
  explorerCloseSettingsDrawer(context: MainContext) {
    commitSetExplorerShowSettingsDrawer(context, false);
  },
  explorerOpenLoadingOverlay(context: MainContext) {
    commitSetExplorerShowLoadingOverlay(context, true);
  },
  explorerCloseLoadingOverlay(context: MainContext) {
    commitSetExplorerShowLoadingOverlay(context, false);
  },
  explorerSetResultLayout(context: MainContext, payload) {
    commitSetExplorerResultLayout(context, payload);
  },
  explorerSetReportState(context: MainContext, payload) {
    commitSetExplorerReportState(context, payload);
  },
};

const { dispatch } = getStoreAccessors<MainState | any, State>('');

export const dispatchCheckApiError = dispatch(actions.actionCheckApiError);
export const dispatchCheckLoggedIn = dispatch(actions.actionCheckLoggedIn);
export const dispatchGetUserProfile = dispatch(actions.actionGetUserProfile);
export const dispatchLogIn = dispatch(actions.actionLogIn);
export const dispatchLogOut = dispatch(actions.actionLogOut);
export const dispatchUserLogOut = dispatch(actions.actionUserLogOut);
export const dispatchRemoveLogIn = dispatch(actions.actionRemoveLogIn);
export const dispatchRouteLoggedIn = dispatch(actions.actionRouteLoggedIn);
export const dispatchRouteLogOut = dispatch(actions.actionRouteLogOut);
export const dispatchUpdateUserProfile = dispatch(actions.actionUpdateUserProfile);
export const dispatchAddNotification = dispatch(actions.addNotification);
export const dispatchClearNotifications = dispatch(actions.clearNotifications);
export const dispatchAddWarning = dispatch(actions.addWarning);
export const dispatchAddError = dispatch(actions.addError);
export const dispatchRemoveNotification = dispatch(actions.removeNotification);
export const dispatchPasswordRecovery = dispatch(actions.passwordRecovery);
export const dispatchResetPassword = dispatch(actions.resetPassword);
export const dispatchHydrateWarehouses = dispatch(actions.hydrateWarehouses);
export const dispatchHydrateWarehouseStructure = dispatch(actions.hydrateWarehouseStructure);
export const dispatchHydrateExplorerStore = dispatch(actions.hydrateExplorerStore);
export const dispatchHydrateWarehouseStore = dispatch(actions.hydrateWarehouseStore);
export const dispatchSetActiveWarehouseId = dispatch(actions.setActiveWarehouseId);
export const dispatchSetDefaultWarehouseId = dispatch(actions.setDefaultWarehouseId);
export const dispatchCheckFormula = dispatch(actions.checkFormula);
export const dispatchExecuteReport = dispatch(actions.executeReport);
export const dispatchSaveReport = dispatch(actions.saveReport);
export const dispatchCancelReport = dispatch(actions.cancelReport);
export const dispatchSetReportRequest = dispatch(actions.setReportRequest);
export const dispatchSetReportResult = dispatch(actions.setReportResult);
export const dispatchSetReportCancelToken = dispatch(actions.setReportCancelToken);
export const dispatchGetReportFromId = dispatch(actions.getReportFromId);
export const dispatchExplorerToggleSettingsDrawer = dispatch(actions.explorerToggleSettingsDrawer);
export const dispatchExplorerOpenSettingsDrawer = dispatch(actions.explorerOpenSettingsDrawer);
export const dispatchExplorerCloseSettingsDrawer = dispatch(actions.explorerCloseSettingsDrawer);
export const dispatchExplorerOpenLoadingOverlay = dispatch(actions.explorerOpenLoadingOverlay);
export const dispatchExplorerCloseLoadingOverlay = dispatch(actions.explorerCloseLoadingOverlay);
export const dispatchExplorerSetResultLayout = dispatch(actions.explorerSetResultLayout);
export const dispatchExplorerSetReportState = dispatch(actions.explorerSetReportState);
