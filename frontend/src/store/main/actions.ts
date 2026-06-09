import { api } from "@/api";
import { IReportResult } from "@/interfaces";
import {
  IChunkExecutionPlan,
  IHistoricalComparisonPlan,
  buildHistoricalComparisonPlan,
  buildHistoricalComparisonRequest,
  buildChunkExecutionPlan,
  buildChunkExecutionRequest,
  buildChunkExecutionWarnings,
  getHiddenWeightMetricNames,
  mergeHistoricalComparisonReportResults,
  mergeChunkedReportResults,
  stripExecutionRequestMeta,
} from "@/reportWindowing";
import router from "@/router";
import { getLocalToken, removeLocalToken, saveLocalToken } from "@/utils";
import axios, { AxiosError } from "axios";
import { getStoreAccessors } from "typesafe-vuex";
import { ActionContext } from "vuex";
import { State } from "../state";
import Vue from "vue";
import {
  readExplorerShowSettingsDrawer,
  readReportCancelToken,
  readActiveWarehouseId,
  readDimensions,
  readMetrics,
  readWarehouseStructures,
  readWarehouses,
} from "./getters";
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
  commitSetUnsupportedGrainMetrics,
  commitSetReportRequest,
  commitSetReportResult,
  commitSetExplorerShowSettingsDrawer,
  commitSetExplorerShowLoadingOverlay,
  commitSetExplorerReportState,
  commitSetExplorerReportProgress,
  commitSetExplorerResultLayout,
  commitSetReportCancelToken,
} from "./mutations";
import { AppNotification, MainState } from "./state";

type MainContext = ActionContext<MainState, State>;

function stabilizeReportDurationSeconds(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e10) / 1e10;
}

function getElapsedReportDurationSeconds(startedAtMs: number): number {
  return stabilizeReportDurationSeconds((performance.now() - startedAtMs) / 1000);
}

function formatUnsupportedGrainDetail(detail: any): string {
  if (Array.isArray(detail)) {
    return detail.map((item) => formatUnsupportedGrainDetail(item)).join("; ");
  }

  if (detail && typeof detail === "object") {
    return Object.entries(detail)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${formatUnsupportedGrainDetail(value)}`)
      .join("; ");
  }

  return String(detail);
}

function formatUnsupportedGrainNotification(context: MainContext, unsupportedGrainMetrics: any): string {
  const metrics = readMetrics(context) as Record<string, any>;

  if (!unsupportedGrainMetrics) {
    return "Some metrics could not meet the requested grain.";
  }

  if (Array.isArray(unsupportedGrainMetrics)) {
    return [
      "Some metrics could not meet the requested grain:",
      ...unsupportedGrainMetrics.map((message) => `- ${String(message)}`),
    ].join("\n");
  }

  const entries = Object.entries(unsupportedGrainMetrics);
  if (!entries.length) {
    return "Some metrics could not meet the requested grain.";
  }

  const lines = entries.map(([metricName, detail]) => {
    const displayName = metrics[metricName]?.display_name || metricName;
    return `- ${displayName}: ${formatUnsupportedGrainDetail(detail)}`;
  });

  return ["Some metrics could not meet the requested grain:", ...lines].join("\n");
}

function normalizeUnsupportedValue(value: string): string {
  return value.replace(/[{}\[\]']/g, "").trim();
}

function extractUnsupportedGrainMessages(message: string): string[] {
  const normalizedMessage = String(message).trim();
  if (!normalizedMessage.startsWith("[")) {
    return [normalizedMessage];
  }

  const doubleQuotedMatches = Array.from(normalizedMessage.matchAll(/"((?:[^"\\]|\\.)*)"/g)).map((match) => match[1]);
  if (doubleQuotedMatches.length) {
    return doubleQuotedMatches;
  }

  const singleQuotedMatches = Array.from(normalizedMessage.matchAll(/'((?:[^'\\]|\\.)*)'/g)).map((match) => match[1]);
  return singleQuotedMatches.length ? singleQuotedMatches : [normalizedMessage];
}

function parseSingleUnsupportedGrainDetail(message: string) {
  const normalizedMessage = String(message)
    .trim()
    .replace(/^\[\s*["']?/, "")
    .replace(/["']?\s*\]$/, "");
  const match = normalizedMessage.match(
    /^metric\s+(.+?)\s+can not meet grain\s+(.+?)\s+due to unsupported dimensions:\s+(.+)$/i
  );
  if (!match) {
    return null;
  }

  const metricName = normalizeUnsupportedValue(match[1]);
  const requestedGrain = normalizeUnsupportedValue(match[2]);
  const unsupportedDimensions = normalizeUnsupportedValue(match[3]);
  return {
    metricName,
    requestedGrain,
    unsupportedDimensions,
  };
}

function parseUnsupportedGrainDetails(message: string) {
  return extractUnsupportedGrainMessages(message)
    .map((entry) => parseSingleUnsupportedGrainDetail(entry))
    .filter((entry) => entry !== null);
}

function formatUnsupportedGrainApiError(context: MainContext, detail: string): string {
  const parsedEntries = parseUnsupportedGrainDetails(detail);
  if (!parsedEntries.length) {
    return `Error: ${detail}`;
  }

  const metrics = readMetrics(context) as Record<string, any>;
  const groups = parsedEntries.reduce((result, parsed) => {
    const key = `${parsed.requestedGrain}::${parsed.unsupportedDimensions}`;
    if (!result[key]) {
      result[key] = {
        requestedGrain: parsed.requestedGrain,
        unsupportedDimensions: parsed.unsupportedDimensions,
        metricDisplayNames: [],
      };
    }

    result[key].metricDisplayNames.push(metrics[parsed.metricName]?.display_name || parsed.metricName);
    return result;
  }, {} as Record<string, { requestedGrain: string; unsupportedDimensions: string; metricDisplayNames: string[] }>);

  return Object.values(groups)
    .map((group) => {
      const metricLabel = group.metricDisplayNames.length === 1 ? "Metric" : "Metrics";
      return `${metricLabel}: ${group.metricDisplayNames.join(", ")} cannot run at grain ${
        group.requestedGrain
      } due to unsupported dimensions: ${group.unsupportedDimensions}.`;
    })
    .join("\n");
}

function getUnsupportedGrainHighlight(data: any) {
  const detail = typeof data === "string" ? data : data?.detail;
  if (typeof detail !== "string") {
    return {};
  }
  return parseUnsupportedGrainDetails(detail).reduce((result, parsed) => {
    result[parsed.metricName] = {
      requested_grain: parsed.requestedGrain,
      unsupported_dimensions: parsed.unsupportedDimensions,
    };
    return result;
  }, {} as Record<string, any>);
}

function isSafePostLoginRedirect(redirect: unknown): redirect is string {
  return typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//");
}

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
      const loadingNotification = { content: "Saving", showProgress: true };
      commitAddNotification(context, loadingNotification);
      const response = (
        await Promise.all([
          api.updateMe(context.state.token, payload),
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)),
        ])
      )[0];
      commitSetUserProfile(context, response.data);
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { content: "Profile successfully updated", color: "success" });
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
    commitSetToken(context, "");
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
    if (router.currentRoute.path !== "/login") {
      router.push("/login");
    }
  },
  async actionCheckApiError(context: MainContext, payload: AxiosError) {
    if (axios.isCancel(payload)) {
      console.log("Request canceled:", payload.message);
    } else {
      if (payload.response?.status === 401) {
        await dispatchLogOut(context);
      } else {
        let msg: string;
        let timeout: number | null = null;
        if (!payload.response) {
          msg = "Error: no response from backend";
        } else {
          if (Vue.prototype.$debug) {
            timeout = -1;
          }
          const responseData: any = payload.response?.data;
          if (responseData?.error_type === "unsupported_grain") {
            msg = formatUnsupportedGrainApiError(context, responseData.detail);
          } else if (typeof responseData === "string") {
            msg = "Error: " + responseData;
          } else {
            msg = "Error: " + JSON.stringify(responseData, null, 2);
          }
        }
        const notification = { content: msg, color: "error" };
        if (timeout) {
          notification["timeout"] = timeout;
        }
        commitAddNotification(context, notification);
      }
    }
  },
  actionRouteLoggedIn(context: MainContext) {
    const redirect = router.currentRoute.query?.redirect;
    if (isSafePostLoginRedirect(redirect)) {
      router.push(redirect);
    } else if (router.currentRoute.path === "/login" || router.currentRoute.path === "/") {
      router.push("/main/explorer");
    }
  },
  async addNotification(context: MainContext, payload: AppNotification) {
    commitAddNotification(context, payload);
  },
  async clearNotifications(context: MainContext) {
    commitClearNotifications(context);
  },
  async addWarning(context: MainContext, payload: string) {
    commitAddNotification(context, { content: payload, color: "warning" });
  },
  async addError(context: MainContext, payload: string) {
    commitAddNotification(context, { content: payload, color: "error" });
  },
  async removeNotification(context: MainContext, payload: { notification: AppNotification; timeout: number }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        commitRemoveNotification(context, payload.notification);
        resolve(true);
      }, payload.timeout);
    });
  },
  async passwordRecovery(context: MainContext, payload: { username: string }) {
    const loadingNotification = { content: "Sending password recovery email", showProgress: true };
    try {
      commitAddNotification(context, loadingNotification);
      const response = (
        await Promise.all([
          api.passwordRecovery(payload.username),
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)),
        ])
      )[0];
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { content: "Password recovery email sent", color: "success" });
      await dispatchLogOut(context);
    } catch (error) {
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { color: "error", content: "Incorrect username" });
    }
  },
  async resetPassword(context: MainContext, payload: { password: string; token: string }) {
    const loadingNotification = { content: "Resetting password", showProgress: true };
    try {
      commitAddNotification(context, loadingNotification);
      const response = (
        await Promise.all([
          api.resetPassword(payload.password, payload.token),
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)),
        ])
      )[0];
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { content: "Password successfully reset", color: "success" });
      await dispatchLogOut(context);
    } catch (error) {
      commitRemoveNotification(context, loadingNotification);
      commitAddNotification(context, { color: "error", content: "Error resetting password" });
    }
  },
  async setActiveWarehouseId(context: MainContext, payload: number) {
    const warehouses = readWarehouses(context);
    if (!warehouses[payload]) {
      dispatchAddError(context, `Warehouse ${payload} is unavailable or you do not have access to it`);
      return false;
    }

    const structures = readWarehouseStructures(context);
    if (!structures[payload]) {
      await dispatchHydrateWarehouseStructure(context, payload);
      if (!readWarehouseStructures(context)[payload]) {
        return false;
      }
    }
    commitSetActiveWarehouseId(context, payload);
    return true;
  },
  async setDefaultWarehouseId(context: MainContext) {
    const whs = Object.values(readWarehouses(context));
    if (whs.length) {
      // Just use the first warehouse as the default
      await dispatchSetActiveWarehouseId(context, whs[0].id);
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
  async checkMetricFormula(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, "Trying to check formula without an active warehouse");
        return;
      }
      const response = await api.checkMetricFormula(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, "No data in checkMetricFormula response");
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async checkDimensionFormula(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, "Trying to check formula without an active warehouse");
        return;
      }
      const response = await api.checkDimensionFormula(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, "No data in checkDimensionFormula response");
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async executeReport(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, "Trying to execute report without an active warehouse");
        return;
      }

      const executionPayload = stripExecutionRequestMeta(payload);
      const dimensions = readDimensions(context) as Record<string, any>;
      const metrics = readMetrics(context) as Record<string, any>;
      let chunkPlan: IChunkExecutionPlan | null = null;
      let historicalComparisonPlan: IHistoricalComparisonPlan | null = null;

      try {
        chunkPlan = buildChunkExecutionPlan(payload, dimensions);
        historicalComparisonPlan = buildHistoricalComparisonPlan(payload, dimensions);
      } catch (error) {
        dispatchAddError(context, (error as Error).message);
        return false;
      }

      const reportStartedAtMs = performance.now();

      commitSetExplorerReportState(
        context,
        historicalComparisonPlan
          ? "Preparing historical comparison..."
          : chunkPlan
          ? "Preparing chunked report..."
          : "Querying backend..."
      );
      commitSetExplorerReportProgress(context, chunkPlan || historicalComparisonPlan ? 0 : null);
      dispatchExplorerOpenLoadingOverlay(context);
      commitSetUnsupportedGrainMetrics(context, {});

      let cancelToken = readReportCancelToken(context);
      if (cancelToken) {
        // XXX There may be an existing request in progress.
        // Probably need to do something smarter here.
        cancelToken.cancel();
      }
      cancelToken = axios.CancelToken.source();

      dispatchSetReportCancelToken(context, cancelToken);

      if (chunkPlan) {
        const hiddenWeightMetricNames = getHiddenWeightMetricNames(executionPayload, metrics);
        const chunkWarnings = buildChunkExecutionWarnings(executionPayload);
        for (const warning of chunkWarnings) {
          dispatchAddNotification(context, { content: warning, color: "warning" });
        }

        const chunkResults: IReportResult[] = [];
        for (let index = 0; index < chunkPlan.windows.length; index += 1) {
          const currentWindow = chunkPlan.windows[index];
          const progress = Math.round((index / chunkPlan.windows.length) * 100);
          commitSetExplorerReportProgress(context, progress);
          commitSetExplorerReportState(
            context,
            `Pulling window ${index + 1}/${chunkPlan.windows.length}: ${currentWindow[0]} to ${currentWindow[1]}`
          );

          const chunkRequest = buildChunkExecutionRequest(payload, chunkPlan, currentWindow, hiddenWeightMetricNames);
          const response = await api.executeReport(context.state.token, warehouseId, chunkRequest, cancelToken);
          chunkResults.push(response.data);
        }

        dispatchSetReportCancelToken(context, null);
        commitSetExplorerReportProgress(context, 100);
        dispatchExplorerSetReportState(context, "Combining windows...");

        const mergedChunkReport = mergeChunkedReportResults(
          chunkResults,
          payload,
          metrics,
          dimensions,
          chunkPlan,
          hiddenWeightMetricNames
        );
        mergedChunkReport.reportResult = Object.assign({}, mergedChunkReport.reportResult, {
          duration: getElapsedReportDurationSeconds(reportStartedAtMs),
        });
        commitSetUnsupportedGrainMetrics(context, mergedChunkReport.reportResult?.unsupported_grain_metrics || {});

        setTimeout(() => {
          dispatchSetReportRequest(context, mergedChunkReport.effectiveRequest);
          dispatchSetReportResult(context, mergedChunkReport.reportResult);
          if (mergedChunkReport.reportResult.data === undefined) {
            console.warn("Unexpected merged chunked response:");
            console.warn(mergedChunkReport.reportResult);
          }
          if (mergedChunkReport.reportResult.data.length) {
            dispatchExplorerCloseSettingsDrawer(context);
          } else {
            dispatchExplorerCloseLoadingOverlay(context);
            dispatchExplorerSetReportState(context, "");
          }
        }, 0);

        if (mergedChunkReport.reportResult.is_partial) {
          dispatchAddNotification(context, {
            content: formatUnsupportedGrainNotification(
              context,
              mergedChunkReport.reportResult.unsupported_grain_metrics
            ),
            color: "warning",
            timeout: -1,
          });
        }

        if (mergedChunkReport.simpleAverageMetricDisplayNames.length) {
          dispatchAddNotification(context, {
            content: `Chunked execution used simple averages for mean metrics without available weights: ${mergedChunkReport.simpleAverageMetricDisplayNames.join(
              ", "
            )}`,
            color: "warning",
          });
        }

        return true;
      }

      if (historicalComparisonPlan) {
        const hiddenWeightMetricNames = getHiddenWeightMetricNames(executionPayload, metrics);
        const totalRequests = historicalComparisonPlan.periods.length + 1;
        const historicalResults: IReportResult[] = [];

        commitSetExplorerReportState(
          context,
          `Pulling historical period 1/${totalRequests}: ${historicalComparisonPlan.currentRangeStart} to ${historicalComparisonPlan.currentRangeEnd}`
        );
        const currentResponse = await api.executeReport(
          context.state.token,
          warehouseId,
          executionPayload,
          cancelToken
        );
        commitSetExplorerReportProgress(context, Math.round((1 / totalRequests) * 100));

        for (let index = 0; index < historicalComparisonPlan.periods.length; index += 1) {
          const period = historicalComparisonPlan.periods[index];
          commitSetExplorerReportState(
            context,
            `Pulling historical period ${index + 2}/${totalRequests}: ${period.rangeStart} to ${period.rangeEnd}`
          );

          const comparisonRequest = buildHistoricalComparisonRequest(
            payload,
            historicalComparisonPlan,
            period,
            hiddenWeightMetricNames
          );
          const response = await api.executeReport(context.state.token, warehouseId, comparisonRequest, cancelToken);
          historicalResults.push(response.data);
          commitSetExplorerReportProgress(context, Math.round(((index + 2) / totalRequests) * 100));
        }

        dispatchSetReportCancelToken(context, null);
        dispatchExplorerSetReportState(context, "Combining historical comparison...");

        const mergedHistoricalReport = mergeHistoricalComparisonReportResults(
          currentResponse.data,
          historicalResults,
          payload,
          metrics,
          dimensions,
          historicalComparisonPlan,
          hiddenWeightMetricNames
        );
        mergedHistoricalReport.reportResult = Object.assign({}, mergedHistoricalReport.reportResult, {
          duration: getElapsedReportDurationSeconds(reportStartedAtMs),
        });
        commitSetUnsupportedGrainMetrics(context, mergedHistoricalReport.reportResult?.unsupported_grain_metrics || {});

        setTimeout(() => {
          dispatchSetReportRequest(context, payload);
          dispatchSetReportResult(context, mergedHistoricalReport.reportResult);
          if (mergedHistoricalReport.reportResult.data === undefined) {
            console.warn("Unexpected merged historical response:");
            console.warn(mergedHistoricalReport.reportResult);
          }
          if (mergedHistoricalReport.reportResult.data.length) {
            dispatchExplorerCloseSettingsDrawer(context);
          } else {
            dispatchExplorerCloseLoadingOverlay(context);
            dispatchExplorerSetReportState(context, "");
          }
        }, 0);

        if (mergedHistoricalReport.reportResult.is_partial) {
          dispatchAddNotification(context, {
            content: formatUnsupportedGrainNotification(
              context,
              mergedHistoricalReport.reportResult.unsupported_grain_metrics
            ),
            color: "warning",
            timeout: -1,
          });
        }

        if (mergedHistoricalReport.simpleAverageMetricDisplayNames.length) {
          dispatchAddNotification(context, {
            content: `Historical comparison used simple averages for mean metrics without available weights: ${mergedHistoricalReport.simpleAverageMetricDisplayNames.join(
              ", "
            )}`,
            color: "warning",
          });
        }

        return true;
      }

      const response = await api.executeReport(context.state.token, warehouseId, executionPayload, cancelToken);
      dispatchSetReportCancelToken(context, null);
      commitSetUnsupportedGrainMetrics(context, response.data?.unsupported_grain_metrics || {});

      dispatchExplorerSetReportState(context, "Processing response...");
      if (response.data) {
        // XXX: Vue or the UI seems to choke and not update the reactive
        // report state text unless we defer this with setTimeout...?
        setTimeout(() => {
          dispatchSetReportRequest(context, executionPayload);
          dispatchSetReportResult(context, response.data);
          if (response.data.data === undefined) {
            console.warn("Unexpected response:");
            console.warn(response);
          }
          if (response.data.data.length) {
            dispatchExplorerCloseSettingsDrawer(context);
          } else {
            // HACK: thought other events would trigger this.
            dispatchExplorerCloseLoadingOverlay(context);
            dispatchExplorerSetReportState(context, "");
          }
        }, 0);
      } else {
        dispatchExplorerCloseLoadingOverlay(context);
        dispatchExplorerSetReportState(context, "");
      }

      if (response.data.is_partial) {
        dispatchAddNotification(context, {
          content: formatUnsupportedGrainNotification(context, response.data.unsupported_grain_metrics),
          color: "warning",
          timeout: -1,
        });
      }

      return true;
    } catch (error) {
      // TODO: consider changing to catch more cases:
      // https://github.com/axios/axios#handling-errors
      const unsupportedGrainHighlight = getUnsupportedGrainHighlight((error as any)?.response?.data);
      commitSetUnsupportedGrainMetrics(context, unsupportedGrainHighlight);
      await dispatchCheckApiError(context, error);
      dispatchSetReportCancelToken(context, null);
      dispatchExplorerCloseLoadingOverlay(context);
      dispatchExplorerSetReportState(context, "");
      commitSetExplorerReportProgress(context, null);
      return false;
    }
  },
  async saveReport(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, "Trying to save report without an active warehouse");
        return;
      }
      const response = await api.saveReport(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, "No data in saveReport response");
    } catch (error) {
      const responseData: any = (error as any)?.response?.data;
      if (responseData?.error_type === "unsupported_grain") {
        const unsupportedGrainHighlight = getUnsupportedGrainHighlight(responseData);
        commitSetUnsupportedGrainMetrics(context, unsupportedGrainHighlight);
        return {
          error_type: "unsupported_grain",
          detail: responseData.detail,
          unsupported_grain_metrics: unsupportedGrainHighlight,
        };
      }
      await dispatchCheckApiError(context, error);
    }
  },
  cancelReport(context: MainContext) {
    const cancelToken = readReportCancelToken(context);
    if (cancelToken) {
      cancelToken.cancel();
      dispatchSetReportCancelToken(context, null);
    }
    commitSetExplorerReportProgress(context, null);
  },
  async getReportFromId(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, "Trying to load report without an active warehouse");
        return;
      }
      const response = await api.getReportFromId(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, "No data in getReportFromId response");
    } catch (error) {
      await dispatchCheckApiError(context, error);
    }
  },
  async getReportFromText(context: MainContext, payload) {
    try {
      const warehouseId = readActiveWarehouseId(context);
      if (!warehouseId) {
        dispatchAddError(context, "Trying to load report without an active warehouse");
        return;
      }
      const response = await api.getReportFromText(context.state.token, warehouseId, payload);
      if (response.data) {
        return response.data;
      }
      dispatchAddError(context, "No data in getReportFromText response");
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
    commitSetExplorerReportProgress(context, null);
  },
  explorerSetResultLayout(context: MainContext, payload) {
    commitSetExplorerResultLayout(context, payload);
  },
  explorerSetReportState(context: MainContext, payload) {
    commitSetExplorerReportState(context, payload);
  },
};

const { dispatch } = getStoreAccessors<MainState | any, State>("");

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
export const dispatchCheckMetricFormula = dispatch(actions.checkMetricFormula);
export const dispatchCheckDimensionFormula = dispatch(actions.checkDimensionFormula);
export const dispatchExecuteReport = dispatch(actions.executeReport);
export const dispatchSaveReport = dispatch(actions.saveReport);
export const dispatchCancelReport = dispatch(actions.cancelReport);
export const dispatchSetReportRequest = dispatch(actions.setReportRequest);
export const dispatchSetReportResult = dispatch(actions.setReportResult);
export const dispatchSetReportCancelToken = dispatch(actions.setReportCancelToken);
export const dispatchGetReportFromId = dispatch(actions.getReportFromId);
export const dispatchGetReportFromText = dispatch(actions.getReportFromText);
export const dispatchExplorerToggleSettingsDrawer = dispatch(actions.explorerToggleSettingsDrawer);
export const dispatchExplorerOpenSettingsDrawer = dispatch(actions.explorerOpenSettingsDrawer);
export const dispatchExplorerCloseSettingsDrawer = dispatch(actions.explorerCloseSettingsDrawer);
export const dispatchExplorerOpenLoadingOverlay = dispatch(actions.explorerOpenLoadingOverlay);
export const dispatchExplorerCloseLoadingOverlay = dispatch(actions.explorerCloseLoadingOverlay);
export const dispatchExplorerSetResultLayout = dispatch(actions.explorerSetResultLayout);
export const dispatchExplorerSetReportState = dispatch(actions.explorerSetReportState);
