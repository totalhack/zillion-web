import { IUserProfile, IReportResult, IReportRequest } from '@/interfaces';

export interface AppNotification {
  content: string;
  color?: string;
  showProgress?: boolean;
  timeout?: number | string;
}

export interface MainState {
  token: string;
  isLoggedIn: boolean | null;
  logInError: boolean;
  userProfile: IUserProfile | null;
  explorerMiniDrawer: boolean;
  explorerShowDrawer: boolean;
  explorerExpandOnHover: boolean;
  explorerShowSettingsDrawer: boolean;
  explorerShowLoadingOverlay: boolean;
  explorerReportState: string;
  explorerResultLayout: string;
  notifications: AppNotification[];
  warehouses: object;
  activeWarehouseId: number | null;
  warehouseStructures: object;
  reportResult: IReportResult | null;
  reportRequest: IReportRequest | null;
  reportCancelToken: any | null;
}
