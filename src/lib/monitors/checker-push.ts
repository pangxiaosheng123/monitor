import { MonitorCheckResult, MonitorPushConfig, MONITOR_STATUS, ERROR_MESSAGES } from './types';

export async function checkPush(config: MonitorPushConfig): Promise<MonitorCheckResult> {
  try {
    // 兼容性处理：确保配置存在且至少包含必要字段
    if (!config || typeof config !== 'object') {
      return {
        status: MONITOR_STATUS.DOWN,
        message: '配置无效: 缺少必要的配置信息',
        ping: null
      };
    }

    const { lastPushTime, pushInterval } = config;
    
    // 检查最后一次推送时间
    if (!lastPushTime) {
      return {
        status: MONITOR_STATUS.PENDING,
        message: '等待推送',
        ping: null
      };
    }
    
    const lastPush = new Date(lastPushTime).getTime();
    const currentTime = Date.now();
    
    // 检查lastPush是否是一个有效的时间戳
    if (isNaN(lastPush)) {
      return {
        status: MONITOR_STATUS.PENDING,
        message: '推送时间格式无效，等待新的推送',
        ping: null
      };
    }
    
    // 计算时间差（毫秒）
    const timeDiff = currentTime - lastPush;
    
    // 获取允许的时间间隔（秒转毫秒）
    const interval = (pushInterval || 60) * 1000;
    
    // 如果最后推送时间在允许的时间间隔内，则认为服务正常
    if (timeDiff <= interval) {
      return {
        status: MONITOR_STATUS.UP,
        message: `最近推送时间: ${new Date(lastPush).toLocaleString()}`,
        ping: null
      };
    } else {
      // 计算超时时间
      const timeoutSeconds = Math.floor(timeDiff / 1000);
      const minutes = Math.floor(timeoutSeconds / 60);
      const seconds = timeoutSeconds % 60;
      
      const timeoutMessage = minutes > 0 
        ? `超时 ${minutes} 分 ${seconds} 秒` 
        : `超时 ${seconds} 秒`;
      
      return {
        status: MONITOR_STATUS.DOWN,
        message: `推送超时: ${timeoutMessage}`,
        ping: null
      };
    }
  } catch (error) {
    return {
      status: MONITOR_STATUS.DOWN,
      message: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      ping: null
    };
  }
} 