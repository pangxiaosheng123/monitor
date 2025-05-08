import { Cron } from 'croner';
import { prisma } from '../prisma';
import { getSetting, SETTINGS_KEYS } from '../settings';

// 数据清理任务，每天凌晨3点执行一次
let cleanupJob: Cron | null = null;

// 启动数据清理定时任务
export function startDataCleanupJob() {
  if (cleanupJob) {
    cleanupJob.stop();
  }
  
  // 每天凌晨3点运行
  cleanupJob = new Cron('0 3 * * *', {
    name: 'data-cleanup-job',
    protect: true,
  }, async () => {
    try {
      await cleanupOldData();
    } catch (error) {
      console.error('数据清理任务执行失败:', error);
    }
  });
  
  console.log('数据清理定时任务已启动');
  return cleanupJob;
}

// 停止数据清理定时任务
export function stopDataCleanupJob() {
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
    console.log('数据清理定时任务已停止');
    return true;
  }
  return false;
}

// 立即执行数据清理
export async function cleanupOldData(): Promise<number> {
  try {
    // 从设置中获取数据保留天数
    const retentionDaysStr = await getSetting(SETTINGS_KEYS.DATA_RETENTION_DAYS);
    const retentionDays = parseInt(retentionDaysStr) || 90;
    
    // 计算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // 删除截止日期之前的所有监控状态记录
    const result = await prisma.$executeRaw`
      DELETE FROM "MonitorStatus"
      WHERE "timestamp" < ${cutoffDate}
    `;
    
    console.log(`数据清理完成: 已删除 ${result} 条过期的监控记录 (保留期: ${retentionDays}天)`);
    return Number(result);
  } catch (error) {
    console.error('执行数据清理失败:', error);
    throw error;
  }
}

// 手动触发数据清理
export async function triggerManualCleanup(): Promise<number> {
  try {
    return await cleanupOldData();
  } catch (error) {
    console.error('手动数据清理失败:', error);
    return 0;
  }
} 