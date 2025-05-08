// 监控状态常量
export const MONITOR_STATUS = {
  DOWN: 0,
  UP: 1,
  PENDING: 2
};

// 监控错误消息
export const ERROR_MESSAGES = {
  CONNECTION_REFUSED: '连接被拒绝',
  TIMEOUT: '连接超时',
  HOST_NOT_FOUND: '无法解析主机名',
  INVALID_STATUS: '状态码不符合预期',
  KEYWORD_NOT_FOUND: '未找到关键词',
  NETWORK_ERROR: '网络错误',
  DATABASE_ERROR: '数据库错误',
  AUTHENTICATION_FAILED: '身份验证失败',
  UNKNOWN_ERROR: '未知错误'
};

// 定义监控配置接口
export interface MonitorHttpConfig {
  url: string;
  httpMethod?: string;
  statusCodes?: string;
  maxRedirects?: number;
  ignoreTls?: boolean;
  requestBody?: string;
  requestHeaders?: string | Record<string, string>;
  monitorId?: string;     // 监控项ID，用于发送通知
  monitorName?: string;   // 监控项名称，用于发送通知
  notifyCertExpiry?: boolean; // 是否启用证书到期通知
  certWarning?: string;   // 临时存储证书警告信息
}

export interface MonitorKeywordConfig extends MonitorHttpConfig {
  keyword: string;
}

export interface MonitorPortConfig {
  hostname: string;
  port: number | string;
}

export interface MonitorDatabaseConfig extends MonitorPortConfig {
  username?: string;
  password?: string;
  database?: string;
  query?: string;
}

export interface MonitorPushConfig {
  token: string;
  lastPushTime?: string | number | Date;
  pushInterval?: number;
}

// 监控检查结果接口
export interface MonitorCheckResult {
  status: number;
  message: string;
  ping: number | null;
  certificateDaysRemaining?: number;
} 