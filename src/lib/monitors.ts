import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * 监控配置接口
 */
export interface MonitorConfig {
  url?: string;
  hostname?: string;
  port?: number;
  httpMethod?: string;
  statusCodes?: string;
  maxRedirects?: number;
  requestBody?: string;
  requestHeaders?: string;
  keyword?: string;
  ignoreTls?: boolean;
  username?: string;
  password?: string;
  database?: string;
  query?: string;
  pushToken?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * 创建监控项
 */
export async function createMonitor(
  name: string,
  type: string,
  config: MonitorConfig,
  interval: number = 60,
  retries: number = 0,
  retryInterval: number = 60,
  resendInterval: number = 0,
  upsideDown: boolean = false,
  description?: string
) {
  return await prisma.monitor.create({
    data: {
      name,
      type,
      config: config as Prisma.JsonObject,
      interval,
      retries,
      retryInterval,
      resendInterval,
      upsideDown,
      description
    }
  });
}

/**
 * 获取所有监控项
 */
export async function getAllMonitors() {
  return await prisma.monitor.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * 根据ID获取监控项
 */
export async function getMonitorById(id: string) {
  return await prisma.monitor.findUnique({
    where: { id }
  });
}

/**
 * 更新监控项
 */
export async function updateMonitor(
  id: string,
  data: {
    name?: string;
    type?: string;
    config?: MonitorConfig;
    interval?: number;
    retries?: number;
    retryInterval?: number;
    resendInterval?: number;
    upsideDown?: boolean;
    active?: boolean;
    description?: string;
  }
) {
  return await prisma.monitor.update({
    where: { id },
    data: {
      ...data,
      config: data.config ? data.config as Prisma.JsonObject : undefined
    }
  });
}

/**
 * 删除监控项
 */
export async function deleteMonitor(id: string) {
  return await prisma.monitor.delete({
    where: { id }
  });
}

/**
 * 添加监控状态记录
 */
export async function addStatusRecord(
  monitorId: string,
  success: boolean,
  responseTime?: number,
  message?: string
) {
  return await prisma.monitorStatus.create({
    data: {
      monitorId,
      status: success ? 1 : 0, // 状态：0=down, 1=up
      ping: responseTime,
      message
    }
  });
}

/**
 * 生成用于Push监控的随机令牌
 * @returns 32位随机字符串
 */
export function generatePushToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  
  // 生成32位随机字符串
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return token;
}