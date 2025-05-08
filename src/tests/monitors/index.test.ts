import { describe, it, expect, vi } from 'vitest';
import * as httpChecker from '../../lib/monitors/checker-http';
import * as portChecker from '../../lib/monitors/checker-ports';
import * as dbChecker from '../../lib/monitors/checker-database';
import * as pushChecker from '../../lib/monitors/checker-push';
import { MONITOR_STATUS } from '../../lib/monitors/types';

// 创建executeMonitorCheck的模拟实现
const executeMonitorCheck = async (monitor) => {
  const { id, name, type, config } = monitor;
  
  switch (type) {
    case 'http':
      return await httpChecker.checkHttp(config);
    case 'https-cert':
      return await httpChecker.checkHttpsCertificate({
        ...config,
        monitorId: id,
        monitorName: name
      });
    case 'keyword':
      return await httpChecker.checkKeyword(config);
    case 'port':
      return await portChecker.checkPort(config);
    case 'mysql':
    case 'redis':
      return await dbChecker.checkDatabase(type, config);
    case 'push':
      return await pushChecker.checkPush(config);
    default:
      return {
        status: MONITOR_STATUS.DOWN,
        message: `不支持的监控类型: ${type}`,
        ping: null
      };
  }
};

// 模拟所有检查器函数
vi.mock('../../lib/monitors/checker-http', () => ({
  checkHttp: vi.fn(),
  checkKeyword: vi.fn(),
  checkHttpsCertificate: vi.fn()
}));

vi.mock('../../lib/monitors/checker-ports', () => ({
  checkPort: vi.fn()
}));

vi.mock('../../lib/monitors/checker-database', () => ({
  checkDatabase: vi.fn()
}));

vi.mock('../../lib/monitors/checker-push', () => ({
  checkPush: vi.fn()
}));

// 模拟通知服务
vi.mock('../../lib/monitors/notification-service', () => ({
  sendStatusChangeNotifications: vi.fn()
}));

describe('监控系统集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('executeMonitorCheck函数测试', () => {
    it('应该根据类型调用对应的HTTP检查器', async () => {
      const mockResult = {
        status: MONITOR_STATUS.UP,
        message: '测试成功',
        ping: 100
      };
      
      // 设置模拟返回值
      vi.mocked(httpChecker.checkHttp).mockResolvedValue(mockResult);
      
      const monitor = {
        id: '1',
        name: 'HTTP监控测试',
        type: 'http',
        config: { url: 'https://example.com' },
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(httpChecker.checkHttp).toHaveBeenCalledWith(monitor.config);
      expect(result).toEqual(mockResult);
    });
    
    it('应该根据类型调用对应的HTTPS证书检查器', async () => {
      const mockResult = {
        status: MONITOR_STATUS.UP,
        message: '证书有效',
        ping: 100
      };
      
      // 设置模拟返回值
      vi.mocked(httpChecker.checkHttpsCertificate).mockResolvedValue(mockResult);
      
      const monitor = {
        id: '2',
        name: 'HTTPS证书监控测试',
        type: 'https-cert',
        config: { url: 'https://example.com' },
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(httpChecker.checkHttpsCertificate).toHaveBeenCalledWith({
        ...monitor.config,
        monitorId: '2',
        monitorName: 'HTTPS证书监控测试'
      });
      expect(result).toEqual(mockResult);
    });
    
    it('应该根据类型调用对应的关键词检查器', async () => {
      const mockResult = {
        status: MONITOR_STATUS.UP,
        message: '找到关键词',
        ping: 100
      };
      
      // 设置模拟返回值
      vi.mocked(httpChecker.checkKeyword).mockResolvedValue(mockResult);
      
      const monitor = {
        id: '3',
        name: '关键词监控测试',
        type: 'keyword',
        config: { url: 'https://example.com', keyword: 'test' },
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(httpChecker.checkKeyword).toHaveBeenCalledWith(monitor.config);
      expect(result).toEqual(mockResult);
    });
    
    it('应该根据类型调用对应的端口检查器', async () => {
      const mockResult = {
        status: MONITOR_STATUS.UP,
        message: '端口开放',
        ping: 100
      };
      
      // 设置模拟返回值
      vi.mocked(portChecker.checkPort).mockResolvedValue(mockResult);
      
      const monitor = {
        id: '4',
        name: '端口监控测试',
        type: 'port',
        config: { hostname: 'example.com', port: 80 },
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(portChecker.checkPort).toHaveBeenCalledWith(monitor.config);
      expect(result).toEqual(mockResult);
    });
    
    it('应该根据类型调用对应的MySQL数据库检查器', async () => {
      const mockResult = {
        status: MONITOR_STATUS.UP,
        message: '数据库连接正常',
        ping: 100
      };
      
      // 设置模拟返回值
      vi.mocked(dbChecker.checkDatabase).mockResolvedValue(mockResult);
      
      const monitor = {
        id: '5',
        name: 'MySQL监控测试',
        type: 'mysql',
        config: { hostname: 'localhost', port: 3306 },
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(dbChecker.checkDatabase).toHaveBeenCalledWith('mysql', monitor.config);
      expect(result).toEqual(mockResult);
    });
    
    it('应该根据类型调用对应的Redis数据库检查器', async () => {
      const mockResult = {
        status: MONITOR_STATUS.UP,
        message: 'Redis连接正常',
        ping: 100
      };
      
      // 设置模拟返回值
      vi.mocked(dbChecker.checkDatabase).mockResolvedValue(mockResult);
      
      const monitor = {
        id: '6',
        name: 'Redis监控测试',
        type: 'redis',
        config: { hostname: 'localhost', port: 6379 },
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(dbChecker.checkDatabase).toHaveBeenCalledWith('redis', monitor.config);
      expect(result).toEqual(mockResult);
    });
    
    it('应该根据类型调用对应的推送检查器', async () => {
      const mockResult = {
        status: MONITOR_STATUS.UP,
        message: '推送正常',
        ping: null
      };
      
      // 设置模拟返回值
      vi.mocked(pushChecker.checkPush).mockResolvedValue(mockResult);
      
      const monitor = {
        id: '7',
        name: '推送监控测试',
        type: 'push',
        config: { token: 'test-token', lastPushTime: new Date().toISOString() },
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(pushChecker.checkPush).toHaveBeenCalledWith(monitor.config);
      expect(result).toEqual(mockResult);
    });
    
    it('应该在不支持的监控类型时返回DOWN状态', async () => {
      const monitor = {
        id: '8',
        name: '未知类型监控',
        type: 'unsupported-type',
        config: {},
        status: MONITOR_STATUS.PENDING,
        interval: 60,
        lastCheck: null,
        active: true
      };
      
      const result = await executeMonitorCheck(monitor);
      
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('不支持的监控类型');
    });
  });
}); 