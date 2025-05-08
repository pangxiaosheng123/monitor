import { MonitorPortConfig, MonitorCheckResult, MONITOR_STATUS, ERROR_MESSAGES } from './types';
import { getNetworkErrorMessage } from './utils';
import net from 'net';

// 端口监控检查
export async function checkPort(config: MonitorPortConfig): Promise<MonitorCheckResult> {
  // 兼容性处理：确保配置存在且至少包含必要字段
  if (!config || typeof config !== 'object') {
    return {
      status: MONITOR_STATUS.DOWN,
      message: '配置无效: 缺少必要的配置信息',
      ping: null
    };
  }

  const { hostname, port } = config;
  
  // 验证必要的参数
  if (!hostname) {
    return {
      status: MONITOR_STATUS.DOWN,
      message: '配置无效: 缺少主机名',
      ping: null
    };
  }

  if (port === undefined || port === null) {
    return {
      status: MONITOR_STATUS.DOWN,
      message: '配置无效: 缺少端口号',
      ping: null
    };
  }

  const startTime = Date.now();
  const portNumber = typeof port === 'string' ? parseInt(port) : port;
  
  // 验证端口号
  if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
    return {
      status: MONITOR_STATUS.DOWN,
      message: `配置无效: 端口号 ${port} 不是有效的端口值`,
      ping: null
    };
  }
  
  return new Promise<MonitorCheckResult>((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;
    
    // 设置10秒超时
    socket.setTimeout(10000);
    
    socket.on('connect', () => {
      const responseTime = Date.now() - startTime;
      socket.destroy();
      if (!isResolved) {
        isResolved = true;
        resolve({
          status: MONITOR_STATUS.UP,
          message: `端口 ${portNumber} 开放`,
          ping: responseTime
        });
      }
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      if (!isResolved) {
        isResolved = true;
        resolve({
          status: MONITOR_STATUS.DOWN,
          message: ERROR_MESSAGES.TIMEOUT,
          ping: Date.now() - startTime
        });
      }
    });
    
    socket.on('error', (error) => {
      socket.destroy();
      if (!isResolved) {
        isResolved = true;
        resolve({
          status: MONITOR_STATUS.DOWN,
          message: getNetworkErrorMessage(error),
          ping: Date.now() - startTime
        });
      }
    });
    
    // 尝试连接
    try {
      socket.connect(portNumber, hostname);
    } catch (error) {
      if (!isResolved) {
        isResolved = true;
        resolve({
          status: MONITOR_STATUS.DOWN,
          message: getNetworkErrorMessage(error),
          ping: Date.now() - startTime
        });
      }
    }
  });
} 