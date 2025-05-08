import axios from 'axios';
import { Monitor } from '@prisma/client';
import net from 'net';
import tls from 'tls';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';

export interface CheckResult {
  status: number; // 0: DOWN, 1: UP, 2: PENDING
  message: string;
  ping?: number;
  details?: any;
}

// 检查HTTP/HTTPS网站
async function checkHttp(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const response = await axios({
      method: monitor.method || 'GET',
      url: monitor.target,
      timeout: (monitor.timeout || 10) * 1000,
      headers: monitor.headers || {},
      data: monitor.body,
      validateStatus: () => true
    });

    const ping = Date.now() - startTime;
    const expectedCode = monitor.expectedCode || 200;

    // 检查状态码
    if (response.status !== expectedCode) {
      return {
        status: 0,
        message: `HTTP状态码不匹配: 期望 ${expectedCode}, 实际 ${response.status}`,
        ping,
        details: { statusCode: response.status }
      };
    }

    // 如果配置了关键词，检查响应内容
    if (monitor.keyword) {
      const content = response.data.toString();
      if (!content.includes(monitor.keyword)) {
        return {
          status: 0,
          message: `未找到关键词: ${monitor.keyword}`,
          ping,
          details: { keyword: monitor.keyword }
        };
      }
    }

    return {
      status: 1,
      message: '检查通过',
      ping,
      details: {
        statusCode: response.status,
        contentLength: response.headers['content-length']
      }
    };
  } catch (error) {
    return {
      status: 0,
      message: `请求失败: ${error.message}`,
      ping: Date.now() - startTime,
      details: { error: error.message }
    };
  }
}

// 检查HTTPS证书
async function checkHttpsCertificate(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const url = new URL(monitor.target);
    const socket = tls.connect({
      host: url.hostname,
      port: url.port || 443,
      servername: url.hostname
    });

    return new Promise((resolve) => {
      socket.on('secureConnect', () => {
        const cert = socket.getPeerCertificate();
        const expiryDate = new Date(cert.valid_to);
        const daysToExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        socket.end();
        
        if (daysToExpiry <= 0) {
          resolve({
            status: 0,
            message: `证书已过期`,
            ping: Date.now() - startTime,
            details: {
              expiryDate: cert.valid_to,
              daysToExpiry
            }
          });
        } else if (daysToExpiry <= 7) {
          resolve({
            status: 0,
            message: `证书即将过期: ${daysToExpiry}天后`,
            ping: Date.now() - startTime,
            details: {
              expiryDate: cert.valid_to,
              daysToExpiry
            }
          });
        } else {
          resolve({
            status: 1,
            message: `证书有效: 剩余${daysToExpiry}天`,
            ping: Date.now() - startTime,
            details: {
              expiryDate: cert.valid_to,
              daysToExpiry,
              issuer: cert.issuer
            }
          });
        }
      });

      socket.on('error', (error) => {
        resolve({
          status: 0,
          message: `证书检查失败: ${error.message}`,
          ping: Date.now() - startTime,
          details: { error: error.message }
        });
      });
    });
  } catch (error) {
    return {
      status: 0,
      message: `证书检查失败: ${error.message}`,
      ping: Date.now() - startTime,
      details: { error: error.message }
    };
  }
}

// 检查TCP端口
async function checkPort(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const [host, port] = monitor.target.split(':');
    
    socket.setTimeout((monitor.timeout || 10) * 1000);

    socket.on('connect', () => {
      socket.end();
      resolve({
        status: 1,
        message: '端口开放',
        ping: Date.now() - startTime
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        status: 0,
        message: '连接超时',
        ping: Date.now() - startTime
      });
    });

    socket.on('error', (error) => {
      resolve({
        status: 0,
        message: `连接失败: ${error.message}`,
        ping: Date.now() - startTime,
        details: { error: error.message }
      });
    });

    socket.connect(parseInt(port), host);
  });
}

// 检查MySQL数据库
async function checkMysql(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const connection = await mysql.createConnection({
      ...JSON.parse(monitor.target),
      connectTimeout: (monitor.timeout || 10) * 1000
    });

    await connection.execute('SELECT 1');
    await connection.end();

    return {
      status: 1,
      message: '数据库连接正常',
      ping: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 0,
      message: `数据库连接失败: ${error.message}`,
      ping: Date.now() - startTime,
      details: { error: error.message }
    };
  }
}

// 检查Redis
async function checkRedis(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const config = JSON.parse(monitor.target);
    const redis = new Redis({
      ...config,
      connectTimeout: (monitor.timeout || 10) * 1000
    });

    await redis.ping();
    await redis.quit();

    return {
      status: 1,
      message: 'Redis连接正常',
      ping: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 0,
      message: `Redis连接失败: ${error.message}`,
      ping: Date.now() - startTime,
      details: { error: error.message }
    };
  }
}

// 执行监控检查
export async function executeMonitorCheck(monitor: Monitor): Promise<CheckResult> {
  try {
    let result: CheckResult;

    switch (monitor.type) {
      case 'http':
      case 'https':
        result = await checkHttp(monitor);
        break;
      case 'https-cert':
        result = await checkHttpsCertificate(monitor);
        break;
      case 'port':
        result = await checkPort(monitor);
        break;
      case 'mysql':
        result = await checkMysql(monitor);
        break;
      case 'redis':
        result = await checkRedis(monitor);
        break;
      default:
        return {
          status: 0,
          message: `不支持的监控类型: ${monitor.type}`
        };
    }

    // 如果配置了重试次数且检查失败，进行重试
    if (result.status === 0 && monitor.retries > 0) {
      for (let i = 0; i < monitor.retries; i++) {
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const retryResult = await executeMonitorCheck({
          ...monitor,
          retries: 0 // 防止重试时再次重试
        });

        if (retryResult.status === 1) {
          return {
            ...retryResult,
            message: `重试成功 (${i + 1}/${monitor.retries}): ${retryResult.message}`
          };
        }
      }

      return {
        ...result,
        message: `重试${monitor.retries}次后仍然失败: ${result.message}`
      };
    }

    return result;
  } catch (error) {
    return {
      status: 0,
      message: `检查执行出错: ${error.message}`
    };
  }
} 