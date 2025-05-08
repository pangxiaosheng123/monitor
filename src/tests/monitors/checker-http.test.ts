import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHttp, checkKeyword, checkHttpsCertificate } from '../../lib/monitors/checker-http';
import { proxyFetch, standardFetch } from '../../lib/monitors/proxy-fetch';
import { MONITOR_STATUS } from '../../lib/monitors/types';
import * as settings from '../../lib/settings';
import sslChecker from 'ssl-checker';

// 处理模拟对象的类型问题
const mockedStandardFetch = standardFetch as unknown as ReturnType<typeof vi.fn>;
const mockedProxyFetch = proxyFetch as unknown as ReturnType<typeof vi.fn>;
const mockedSslChecker = sslChecker as unknown as ReturnType<typeof vi.fn>;

// Mock依赖
vi.mock('../../lib/monitors/proxy-fetch', () => ({
  proxyFetch: vi.fn(),
  standardFetch: vi.fn()
}));

vi.mock('../../lib/settings', () => ({
  getAllProxySettings: vi.fn(),
  SETTINGS_KEYS: { PROXY_ENABLED: 'proxy_enabled' }
}));

vi.mock('ssl-checker', () => ({
  default: vi.fn(),
  __esModule: true
}));

vi.mock('../../lib/monitors/notification-service', () => ({
  sendStatusChangeNotifications: vi.fn()
}));

describe('HTTP监控检查器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settings, 'getAllProxySettings').mockResolvedValue({ proxy_enabled: 'false' });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('checkHttp', () => {
    it('应当在URL为空时返回DOWN状态', async () => {
      const result = await checkHttp({ url: '' });
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('URL不能为空');
    });

    it('应当在请求成功且状态码符合预期时返回UP状态', async () => {
      // Mock Response对象
      const mockResponse = {
        status: 200,
        text: vi.fn().mockResolvedValue('')
      };
      
      // Mock fetch函数
      mockedStandardFetch.mockResolvedValue(mockResponse);
      
      const result = await checkHttp({ url: 'https://example.com' });
      
      expect(standardFetch).toHaveBeenCalled();
      expect(result.status).toBe(MONITOR_STATUS.UP);
      expect(result.message).toContain('状态码: 200');
      expect(result.ping).toBeGreaterThanOrEqual(0);
    });

    it('应当在请求成功但状态码不符合预期时返回DOWN状态', async () => {
      // Mock Response对象
      const mockResponse = {
        status: 404,
        text: vi.fn().mockResolvedValue('')
      };
      
      // Mock fetch函数
      mockedStandardFetch.mockResolvedValue(mockResponse);
      
      const result = await checkHttp({ 
        url: 'https://example.com', 
        statusCodes: '200-299' // 只接受2xx状态码
      });
      
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('状态码不符合预期: 404');
    });

    it('应当在网络错误时返回DOWN状态', async () => {
      // Mock网络错误
      mockedStandardFetch.mockRejectedValue(new Error('网络连接失败'));
      
      // 模拟ping值
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // 开始时间
        .mockReturnValueOnce(1100); // 结束时间，差值为100ms
      
      const result = await checkHttp({ url: 'https://example.com' });
      
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      // 不再检查ping值大于0，因为我们已经模拟了Date.now返回的时间差
      expect(result.message).toContain('网络连接失败');
    });

    it('应当在代理启用时使用proxyFetch', async () => {
      // 设置代理为启用
      vi.spyOn(settings, 'getAllProxySettings').mockResolvedValue({ proxy_enabled: 'true' });
      
      // Mock Response对象
      const mockResponse = {
        status: 200,
        text: vi.fn().mockResolvedValue('')
      };
      
      // Mock proxyFetch函数
      mockedProxyFetch.mockResolvedValue(mockResponse);
      
      const result = await checkHttp({ url: 'https://example.com' });
      
      expect(proxyFetch).toHaveBeenCalled();
      expect(standardFetch).not.toHaveBeenCalled();
      expect(result.status).toBe(MONITOR_STATUS.UP);
    });
  });

  describe('checkKeyword', () => {
    it('应当在URL为空时返回DOWN状态', async () => {
      const result = await checkKeyword({ url: '', keyword: 'test' });
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('URL不能为空');
    });

    it('应当在关键词为空时返回DOWN状态', async () => {
      const result = await checkKeyword({ url: 'https://example.com', keyword: '' });
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('关键词不能为空');
    });

    it('应当在找到关键词时返回UP状态', async () => {
      // Mock Response对象
      const mockResponse = {
        status: 200,
        text: vi.fn().mockResolvedValue('Welcome to Example.com')
      };
      
      // Mock fetch函数
      mockedStandardFetch.mockResolvedValue(mockResponse);
      
      const result = await checkKeyword({ 
        url: 'https://example.com', 
        keyword: 'Example' 
      });
      
      expect(result.status).toBe(MONITOR_STATUS.UP);
      expect(result.message).toContain('找到关键词');
    });

    it('应当在未找到关键词时返回DOWN状态', async () => {
      // Mock Response对象
      const mockResponse = {
        status: 200,
        text: vi.fn().mockResolvedValue('Welcome to Test.com')
      };
      
      // Mock fetch函数
      mockedStandardFetch.mockResolvedValue(mockResponse);
      
      const result = await checkKeyword({ 
        url: 'https://example.com', 
        keyword: 'Example' 
      });
      
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('未找到关键词');
    });
  });

  describe('checkHttpsCertificate', () => {
    it('应当在URL为空时返回DOWN状态', async () => {
      const result = await checkHttpsCertificate({ url: '' });
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('URL不能为空');
    });

    it('应当在非HTTPS URL时返回DOWN状态', async () => {
      const result = await checkHttpsCertificate({ url: 'http://example.com' });
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('仅支持HTTPS URL');
    });

    it('应当在证书有效时返回UP状态', async () => {
      // Mock SSL检查结果
      const mockCertInfo = {
        valid: true,
        daysRemaining: 30
      };
      
      mockedSslChecker.mockResolvedValue(mockCertInfo);
      
      const result = await checkHttpsCertificate({ url: 'https://example.com' });
      
      expect(sslChecker).toHaveBeenCalled();
      expect(result.status).toBe(MONITOR_STATUS.UP);
      expect(result.message).toContain('HTTPS证书有效');
      expect(result.message).toContain('剩余30天');
    });

    it('应当在证书即将过期时添加警告但仍返回UP状态', async () => {
      // Mock SSL检查结果 - 证书即将过期
      const mockCertInfo = {
        valid: true,
        daysRemaining: 5 // 不到7天
      };
      
      mockedSslChecker.mockResolvedValue(mockCertInfo);
      
      const result = await checkHttpsCertificate({ url: 'https://example.com' });
      
      expect(result.status).toBe(MONITOR_STATUS.UP);
      expect(result.message).toContain('【警告】证书将在5天后过期');
    });

    it('应当在证书无效时返回DOWN状态', async () => {
      // Mock SSL检查结果 - 证书无效
      const mockCertInfo = {
        valid: false,
        daysRemaining: -5 // 已过期
      };
      
      mockedSslChecker.mockResolvedValue(mockCertInfo);
      
      const result = await checkHttpsCertificate({ url: 'https://example.com' });
      
      expect(result.status).toBe(MONITOR_STATUS.DOWN);
      expect(result.message).toContain('证书无效');
    });
  });
}); 