import { Cron } from 'croner';
import { prisma } from '../prisma';
import { checkers } from './index';
import { MONITOR_STATUS, MonitorHttpConfig, MonitorKeywordConfig, MonitorPortConfig, MonitorDatabaseConfig, MonitorPushConfig } from './types';
import crypto from 'crypto';
import { sendStatusChangeNotifications } from './notification-service';

// 定义监控项数据类型
interface MonitorData {
  id: string;
  type: string;
  active: boolean;
  interval: number;
  config: unknown;
  upsideDown: boolean;
  lastStatus?: number | null;
  name: string;
}

// 存储所有监控计划的映射
const monitorJobs = new Map<string, Cron>();

// 添加或更新监控计划
export async function scheduleMonitor(monitorId: string) {
  try {
    // 先取消之前的计划（如果存在）
    if (monitorJobs.has(monitorId)) {
      monitorJobs.get(monitorId)?.stop();
      monitorJobs.delete(monitorId);
    }

    // 获取监控项信息
    const monitor = await prisma.$queryRaw`
      SELECT * FROM "Monitor" WHERE id = ${monitorId}
    `;

    // 由于原始查询返回数组，获取第一个结果
    const monitorData = Array.isArray(monitor) ? monitor[0] as MonitorData : null;

    if (!monitorData) {
      console.error(`监控项 ${monitorId} 不存在`);
      return false;
    }

    // 如果监控项被禁用，则不执行调度
    if (!monitorData.active) {
      return false;
    }

    // 计算下次检查时间
    const nextCheckAt = new Date(Date.now() + monitorData.interval * 1000);
    
    // 更新监控项的下次检查时间
    await prisma.$executeRaw`
      UPDATE "Monitor" 
      SET "nextCheckAt" = ${nextCheckAt} 
      WHERE id = ${monitorId}
    `;

    // 使用Croner创建新的计划任务
    let job;
    if (monitorData.interval <= 60) {
      // 如果间隔小于等于60秒，使用秒级cron表达式
      job = new Cron(`*/${monitorData.interval} * * * * *`, {
        name: `monitor-${monitorId}`,
        protect: true // 防止任务重叠执行
      }, async () => {
        try {
          await executeMonitorCheck(monitorId);
        } catch (error) {
          console.error(`监控检查异常 ${monitorId}:`, error);
          // 记录监控失败状态
          await recordMonitorStatus(monitorId, MONITOR_STATUS.DOWN, '监控任务执行异常', null, monitorData.lastStatus || null);
        }
      });
    } else if (monitorData.interval <= 3600) {
      // 如果间隔大于60秒但小于等于3600秒(1小时)，使用分钟级cron表达式
      const intervalMinutes = Math.ceil(monitorData.interval / 60);
      job = new Cron(`0 */${intervalMinutes} * * * *`, {
        name: `monitor-${monitorId}`,
        protect: true // 防止任务重叠执行
      }, async () => {
        try {
          await executeMonitorCheck(monitorId);
        } catch (error) {
          console.error(`监控检查异常 ${monitorId}:`, error);
          // 记录监控失败状态
          await recordMonitorStatus(monitorId, MONITOR_STATUS.DOWN, '监控任务执行异常', null, monitorData.lastStatus || null);
        }
      });
    } else {
      // 如果间隔大于3600秒(1小时)
      const HOURS_IN_DAY = 24;
      const totalHours = Math.ceil(monitorData.interval / 3600);
      // 对小时数取模，确保不超过24小时
      const intervalHours = totalHours % HOURS_IN_DAY || HOURS_IN_DAY; // 如果能被24整除，则使用24
      // 生成一个0-59之间的随机数作为分钟数，避免整点负载集中
      const randomMinute = Math.floor(Math.random() * 60);
      
      job = new Cron(`0 ${randomMinute} */${intervalHours} * * *`, {
        name: `monitor-${monitorId}`,
        protect: true // 防止任务重叠执行
      }, async () => {
        try {
          await executeMonitorCheck(monitorId);
        } catch (error) {
          console.error(`监控检查异常 ${monitorId}:`, error);
          // 记录监控失败状态
          await recordMonitorStatus(monitorId, MONITOR_STATUS.DOWN, '监控任务执行异常', null, monitorData.lastStatus || null);
        }
      });
    }

    // 存储计划任务实例
    monitorJobs.set(monitorId, job);
    
    // 立即执行一次监控检查
    try {
      await executeMonitorCheck(monitorId);
    } catch (error) {
      console.error(`初始监控检查异常 ${monitorId}:`, error);
    }

    return true;
  } catch (error) {
    console.error(`调度监控失败 ${monitorId}:`, error);
    return false;
  }
}

// 停止监控计划
export function stopMonitor(monitorId: string): boolean {
  if (monitorJobs.has(monitorId)) {
    monitorJobs.get(monitorId)?.stop();
    monitorJobs.delete(monitorId);
    return true;
  }
  return false;
}

// 重置并重新调度所有激活的监控项
export async function resetAllMonitors() {
  try {
    console.log('开始重置所有监控计划...');
    
    // 停止所有现有的监控计划
    for (const job of monitorJobs.values()) {
      job.stop();
    }
    monitorJobs.clear();
    console.log('已停止所有现有监控计划');

    // 获取所有激活的监控项
    const activeMonitors = await prisma.$queryRaw`
      SELECT * FROM "Monitor" WHERE active = true
    `;
    console.log(`找到 ${Array.isArray(activeMonitors) ? activeMonitors.length : 0} 个激活的监控项`);

    // 重新调度每个激活的监控项
    for (const monitor of activeMonitors as MonitorData[]) {
      await scheduleMonitor(monitor.id);
    }
    console.log('所有监控项已重新调度');

    return Array.isArray(activeMonitors) ? activeMonitors.length : 0;
  } catch (error) {
    console.error('重置监控计划失败:', error);
    return 0;
  }
}

// 执行监控检查
async function executeMonitorCheck(monitorId: string) {
  // 获取监控项信息
  const monitor = await prisma.$queryRaw`
    SELECT * FROM "Monitor" WHERE id = ${monitorId}
  `;

  // 由于原始查询返回数组，获取第一个结果
  const monitorData = Array.isArray(monitor) ? monitor[0] as MonitorData : null;

  if (!monitorData || !monitorData.active) {
    return;
  }

  let status = MONITOR_STATUS.DOWN;
  let message = '';
  let ping: number | null = null;

  try {
    // 对于 Push 类型监控，特殊处理
    if (monitorData.type === 'push') {
      // 获取最新状态
      const latestStatuses = await prisma.$queryRaw`
        SELECT * FROM "MonitorStatus" 
        WHERE "monitorId" = ${monitorId} 
        ORDER BY "timestamp" DESC 
        LIMIT 2
      `;
      
      // 获取 Push 配置
      const config = monitorData.config as unknown as MonitorPushConfig;
      
      // 检查最后推送时间是否在有效期内
      const lastPushTime = config.lastPushTime ? new Date(config.lastPushTime).getTime() : 0;
      const currentTime = Date.now();
      const interval = (config.pushInterval || 60) * 1000; // 秒转毫秒
      
      // 如果最后推送时间在允许的时间间隔内，则认为服务正常（状态为UP）
      const isPushValid = lastPushTime && (currentTime - lastPushTime) <= interval;
      const newStatus = isPushValid ? MONITOR_STATUS.UP : MONITOR_STATUS.DOWN;
      
      // 获取前两次状态
      const lastStatus = Array.isArray(latestStatuses) && latestStatuses.length > 0 ? 
                          latestStatuses[0].status : null;
      const secondLastStatus = Array.isArray(latestStatuses) && latestStatuses.length > 1 ? 
                          latestStatuses[1].status : null;
      
      // 对于 Push 类型，只有以下情况才记录状态和发送通知：
      // 1. 当前状态为失败（DOWN）
      // 2. 当前状态为成功（UP），且上一次状态为失败（DOWN）- 即从失败恢复为成功
      // 3. 当前状态为成功（UP），上一次状态也是成功（UP），但上上次是失败（DOWN）- 初次恢复后状态检查
      if (newStatus === MONITOR_STATUS.DOWN) {
        // 失败状态，记录并发送通知
        message = `推送超时: 最后推送时间 ${lastPushTime ? new Date(lastPushTime).toLocaleString() : '未知'}`;
        await recordMonitorStatus(monitorId, newStatus, message, null, lastStatus);
      } else if (newStatus === MONITOR_STATUS.UP && lastStatus === MONITOR_STATUS.DOWN) {
        // 从失败恢复为成功，发送恢复通知
        message = `推送恢复正常: 最后推送时间 ${new Date(lastPushTime).toLocaleString()}`;
        
        // 手动发送恢复通知，不记录新状态
        await sendStatusChangeNotifications(monitorId, newStatus, message, MONITOR_STATUS.DOWN);
      } else if (newStatus === MONITOR_STATUS.UP && lastStatus === MONITOR_STATUS.UP && secondLastStatus === MONITOR_STATUS.DOWN) {
        // 特殊情况：当前和上次都是成功，但上上次是失败 - 说明之前从失败恢复为成功但没发通知
        message = `推送恢复正常: 最后推送时间 ${new Date(lastPushTime).toLocaleString()}`;
        
        // 手动发送恢复通知，不记录新状态
        await sendStatusChangeNotifications(monitorId, newStatus, message, MONITOR_STATUS.DOWN);
      }
      
      // 更新监控项状态
      const lastCheckAt = new Date();
      const nextCheckAt = new Date(lastCheckAt.getTime() + monitorData.interval * 1000);
      
      await prisma.$executeRaw`
        UPDATE "Monitor" 
        SET "lastCheckAt" = ${lastCheckAt}, 
            "nextCheckAt" = ${nextCheckAt}, 
            "lastStatus" = ${newStatus}
        WHERE id = ${monitorId}
      `;
      
      return; // 返回，不执行下面的常规检查逻辑
    }
    
    // 对于非 Push 类型，执行常规检查
    switch (monitorData.type) {
      case 'http':
        // 为HTTP检查添加监控ID和名称，支持证书通知功能
        const httpConfig = {
          ...(monitorData.config as unknown as MonitorHttpConfig),
          monitorId: monitorData.id,
          monitorName: monitorData.name
        };
        const httpResult = await checkers.http(httpConfig);
        status = httpResult.status;
        message = httpResult.message;
        ping = httpResult.ping;
        break;
      case 'keyword':
        const keywordResult = await checkers.keyword(monitorData.config as unknown as MonitorKeywordConfig);
        status = keywordResult.status;
        message = keywordResult.message;
        ping = keywordResult.ping;
        break;
      case 'https-cert':
        // 为证书检查添加监控ID和名称，用于定时通知
        const certConfig = {
          ...(monitorData.config as unknown as MonitorHttpConfig),
          monitorId: monitorData.id,
          monitorName: monitorData.name
        };
        const certResult = await checkers["https-cert"](certConfig);
        status = certResult.status;
        message = certResult.message;
        ping = certResult.ping;
        break;
      case 'port':
        const portResult = await checkers.port(monitorData.config as unknown as MonitorPortConfig);
        status = portResult.status;
        message = portResult.message;
        ping = portResult.ping;
        break;
      case 'mysql':
      case 'redis':
        const dbResult = await checkers.database(monitorData.type, monitorData.config as unknown as MonitorDatabaseConfig);
        status = dbResult.status;
        message = dbResult.message;
        ping = dbResult.ping;
        break;
      default:
        message = `不支持的监控类型: ${monitorData.type}`;
    }
  } catch (error) {
    console.error(`监控检查失败 ${monitorId}:`, error);
    message = `监控检查异常: ${(error instanceof Error) ? error.message : '未知错误'}`;
  }

  // 考虑反转状态选项
  if (monitorData.upsideDown) {
    status = status === MONITOR_STATUS.UP ? MONITOR_STATUS.DOWN : MONITOR_STATUS.UP;
  }

  // 记录监控状态
  await recordMonitorStatus(monitorId, status, message, ping, monitorData.lastStatus || null);

  // 更新最后检查时间和下次检查时间
  const lastCheckAt = new Date();
  const nextCheckAt = new Date(lastCheckAt.getTime() + monitorData.interval * 1000);
  
  await prisma.$executeRaw`
    UPDATE "Monitor" 
    SET "lastCheckAt" = ${lastCheckAt}, 
        "nextCheckAt" = ${nextCheckAt}, 
        "lastStatus" = ${status}
    WHERE id = ${monitorId}
  `;
}

// 记录监控状态历史
async function recordMonitorStatus(
  monitorId: string, 
  status: number, 
  message: string, 
  ping: number | null,
  prevStatus: number | null
) {
  const timestamp = new Date();
  
  await prisma.$executeRaw`
    INSERT INTO "MonitorStatus" ("id", "monitorId", "status", "message", "ping", "timestamp")
    VALUES (${crypto.randomUUID()}, ${monitorId}, ${status}, ${message}, ${ping}, ${timestamp})
  `;

  // 触发状态变更通知
  try {
    await sendStatusChangeNotifications(monitorId, status, message, prevStatus);
  } catch (error) {
    console.error(`发送监控 ${monitorId} 状态变更通知失败:`, error);
    // 通知发送失败不影响监控状态记录
  }
} 