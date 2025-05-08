import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkPort } from '../../lib/monitors/checker-ports';
import { MONITOR_STATUS } from '../../lib/monitors/types';

// 创建模拟Socket对象
const mockSocketObject = {
  setTimeout: vi.fn(),
  on: vi.fn(),
  connect: vi.fn(),
  destroy: vi.fn(),
  connectCallback: undefined as (() => void) | undefined,
  errorCallback: undefined as ((error: Error) => void) | undefined,
  timeoutCallback: undefined as (() => void) | undefined
};

// 模拟net模块
vi.mock('net', () => {
  return {
    default: {
      Socket: vi.fn(() => mockSocketObject)
    },
    Socket: vi.fn(() => mockSocketObject)
  };
});

describe('端口监控检查器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 重置回调
    mockSocketObject.connectCallback = undefined;
    mockSocketObject.errorCallback = undefined;
    mockSocketObject.timeoutCallback = undefined;
    
    // 模拟Socket方法
    mockSocketObject.on.mockImplementation((event, callback) => {
      if (event === 'connect') {
        mockSocketObject.connectCallback = callback;
      } else if (event === 'error') {
        mockSocketObject.errorCallback = callback;
      } else if (event === 'timeout') {
        mockSocketObject.timeoutCallback = callback;
      }
      return mockSocketObject;
    });

    // 模拟Date.now以获得可预测的ping值
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // 开始时间
      .mockReturnValueOnce(1100); // 结束时间，差值为100ms
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('应当在配置无效时返回DOWN状态', async () => {
    // @ts-expect-error 故意传入无效配置
    const result = await checkPort(null);
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('配置无效');
  });

  it('应当在缺少主机名时返回DOWN状态', async () => {
    const result = await checkPort({ hostname: '', port: 80 });
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('缺少主机名');
  });

  it('应当在缺少端口号时返回DOWN状态', async () => {
    // @ts-expect-error 故意传入缺少端口的配置
    const result = await checkPort({ hostname: 'example.com' });
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('缺少端口号');
  });

  it('应当在端口号无效时返回DOWN状态', async () => {
    const result = await checkPort({ hostname: 'example.com', port: -1 });
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('不是有效的端口值');
  });

  it('应当在端口连接成功时返回UP状态', async () => {
    const portCheck = checkPort({ hostname: 'example.com', port: 80 });
    
    // 模拟连接成功
    if (mockSocketObject.connectCallback) {
      mockSocketObject.connectCallback();
    }
    
    const result = await portCheck;
    
    expect(mockSocketObject.setTimeout).toHaveBeenCalledWith(10000);
    expect(mockSocketObject.connect).toHaveBeenCalledWith(80, 'example.com');
    expect(result.status).toBe(MONITOR_STATUS.UP);
    expect(result.message).toContain('端口 80 开放');
    // 只要ping是数字即可，不需要检查大于0
    expect(typeof result.ping).toBe('number');
  });

  it('应当在端口连接超时时返回DOWN状态', async () => {
    const portCheck = checkPort({ hostname: 'example.com', port: 80 });
    
    // 模拟连接超时
    if (mockSocketObject.timeoutCallback) {
      mockSocketObject.timeoutCallback();
    }
    
    const result = await portCheck;
    
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('连接超时');
  });

  it('应当在端口连接错误时返回DOWN状态', async () => {
    const portCheck = checkPort({ hostname: 'example.com', port: 80 });
    
    // 模拟连接错误
    if (mockSocketObject.errorCallback) {
      mockSocketObject.errorCallback(new Error('ECONNREFUSED'));
    }
    
    const result = await portCheck;
    
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
  });

  it('应当支持字符串形式的端口号', async () => {
    const portCheck = checkPort({ hostname: 'example.com', port: '80' });
    
    // 模拟连接成功
    if (mockSocketObject.connectCallback) {
      mockSocketObject.connectCallback();
    }
    
    const result = await portCheck;
    
    expect(mockSocketObject.connect).toHaveBeenCalledWith(80, 'example.com');
    expect(result.status).toBe(MONITOR_STATUS.UP);
  });
}); 