import axios from 'axios';
import { apiUrl } from '@/env';
import {
  IUserProfile,
  IUserProfileUpdate,
  IUserProfileCreate,
  ICheckFormulaRequest,
  IReportRequest,
  IReportResult,
  IReportSaveRequest,
  IReportSaveResult,
} from './interfaces';

const DEFAULT_TIMEOUT = 30 * 1000; // in ms
const REPORT_TIMEOUT = 10 * 60 * 1000; // in ms

function defaultConfig(token: string) {
  return {
    timeout: DEFAULT_TIMEOUT,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export const api = {
  async logInGetToken(username: string, password: string) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    return axios.post(`${apiUrl}/api/v1/login/access-token`, params);
  },
  async getMe(token: string) {
    return axios.get<IUserProfile>(`${apiUrl}/api/v1/users/me`, defaultConfig(token));
  },
  async updateMe(token: string, data: IUserProfileUpdate) {
    return axios.put<IUserProfile>(`${apiUrl}/api/v1/users/me`, data, defaultConfig(token));
  },
  async getUsers(token: string) {
    return axios.get<IUserProfile[]>(`${apiUrl}/api/v1/users/`, defaultConfig(token));
  },
  async updateUser(token: string, userId: number, data: IUserProfileUpdate) {
    return axios.put(`${apiUrl}/api/v1/users/${userId}`, data, defaultConfig(token));
  },
  async createUser(token: string, data: IUserProfileCreate) {
    return axios.post(`${apiUrl}/api/v1/users/`, data, defaultConfig(token));
  },
  async passwordRecovery(email: string) {
    return axios.post(`${apiUrl}/api/v1/password-recovery/${email}`);
  },
  async resetPassword(password: string, token: string) {
    return axios.post(`${apiUrl}/api/v1/reset-password/`, {
      new_password: password,
      token,
    });
  },
  async getWarehouses(token: string) {
    return axios.get<object>(`${apiUrl}/api/v1/warehouse/`, defaultConfig(token));
  },
  async getWarehouseStructure(token: string, warehouseId: number) {
    return axios.get<object>(`${apiUrl}/api/v1/warehouse/${warehouseId}/structure`, defaultConfig(token));
  },
  async checkMetricFormula(token: string, warehouseId: number, data: ICheckFormulaRequest) {
    return axios.post<object>(
      `${apiUrl}/api/v1/warehouse/${warehouseId}/check_metric_formula`, data, defaultConfig(token)
    );
  },
  async checkDimensionFormula(token: string, warehouseId: number, data: ICheckFormulaRequest) {
    return axios.post<object>(
      `${apiUrl}/api/v1/warehouse/${warehouseId}/check_dimension_formula`, data, defaultConfig(token)
    );
  },
  async executeReport(token: string, warehouseId: number, data: IReportRequest, cancelTokenSource) {
    const config = defaultConfig(token);
    config['timeout'] = REPORT_TIMEOUT;
    config['cancelToken'] = cancelTokenSource.token;
    return axios.post<IReportResult>(`${apiUrl}/api/v1/warehouse/${warehouseId}/execute`, data, config);
  },
  async saveReport(token: string, warehouseId: number, data: IReportSaveRequest) {
    return axios.post<IReportSaveResult>(`${apiUrl}/api/v1/warehouse/${warehouseId}/save`, data, defaultConfig(token));
  },
  async getReportFromId(token: string, warehouseId: number, specId: number) {
    return axios.get<IReportSaveRequest>(
      `${apiUrl}/api/v1/warehouse/${warehouseId}/load?spec_id=${specId}`,
      defaultConfig(token)
    );
  },
  async getReportFromText(token: string, warehouseId: number, text: string) {
    return axios.post(
      `${apiUrl}/api/v1/warehouse/${warehouseId}/load_from_text`,
      { text },
      defaultConfig(token)
    );
  },
};
