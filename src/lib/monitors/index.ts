import { checkHttp, checkKeyword, checkHttpsCertificate } from './checker-http';
import { checkPort } from './checker-ports';
import { checkDatabase } from './checker-database';
import { checkPush } from './checker-push';
import { MONITOR_STATUS, ERROR_MESSAGES } from './types';
import { scheduleMonitor, stopMonitor, resetAllMonitors } from './scheduler';

export * from './types';
export * from './utils';
export * from './scheduler';

// 导出所有检查器
export const checkers = {
  http: checkHttp,
  keyword: checkKeyword,
  "https-cert": checkHttpsCertificate,
  port: checkPort,
  database: checkDatabase,
  push: checkPush
};

// 导出调度器
export const scheduler = {
  schedule: scheduleMonitor,
  stop: stopMonitor,
  resetAll: resetAllMonitors
};

// 导出常量
export const monitorStatus = MONITOR_STATUS;
export const errorMessages = ERROR_MESSAGES; 