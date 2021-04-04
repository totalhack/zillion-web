export interface IUserProfile {
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  full_name: string;
  id: number;
}

export interface IUserProfileUpdate {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface IUserProfileCreate {
  email: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface ICheckFormulaRequest {
  name: string;
  formula: string;
  rounding: number | null;
  technical: string | null;
}

export interface IReportRequest {
  metrics?: string[];
  dimensions?: string[];
  criteria?: any[];
  row_filters?: any[];
  rollup?: string;
  order_by?: any[];
  limit?: number;
  limit_first?: boolean;
}

export interface IReportResult {
  columns: string[];
  data: any[];
  rollup_marker: string;
  display_name_map: object;
  query_summaries: string[];
  duration: number;
}

export interface IReportSaveRequest {
  metrics?: string[];
  dimensions?: string[];
  criteria?: any[];
  row_filters?: any[];
  rollup?: string;
  order_by?: any[];
  limit?: number;
  limit_first?: boolean;
  meta?: object;
}

export interface IReportSaveResult {
  spec_id: number;
}
