import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkPush } from '../../lib/monitors/checker-push';
import { MONITOR_STATUS } from '../../lib/monitors/types';

describe('推送监控检查器测试', () => {
  // 保存原始的Date构造函数和Date.now方法
  const RealDate = global.Date;
  const realNow = Date.now;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 设置固定时间为2023-01-01 12:00:00
    const fixedTime = new RealDate('2023-01-01T12:00:00Z').getTime();
    
    // 修改Date.now方法
    global.Date.now = vi.fn(() => fixedTime);
  });

  afterEach(() => {
    vi.resetAllMocks();
    
    // 恢复原始的Date.now方法
    global.Date.now = realNow;
  });

  it('应当在配置无效时返回DOWN状态', async () => {
    // @ts-expect-error - 故意传入无效配置
    const result = await checkPush(null);
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('配置无效');
  });

  it('应当在缺少最后推送时间时返回PENDING状态', async () => {
    const result = await checkPush({ token: 'test-token' });
    expect(result.status).toBe(MONITOR_STATUS.PENDING);
    expect(result.message).toContain('等待推送');
  });

  it('应当在最后推送时间无效时返回PENDING状态', async () => {
    const result = await checkPush({ 
      token: 'test-token',
      lastPushTime: 'invalid-date'
    });
    expect(result.status).toBe(MONITOR_STATUS.PENDING);
    expect(result.message).toContain('推送时间格式无效');
  });

  it('应当在最后推送时间在允许间隔内时返回UP状态', async () => {
    // 模拟最后推送时间为30秒前
    const lastPushTime = new RealDate('2023-01-01T11:59:30Z').toISOString();
    
    const result = await checkPush({
      token: 'test-token',
      lastPushTime,
      pushInterval: 60 // 允许60秒间隔
    });
    
    expect(result.status).toBe(MONITOR_STATUS.UP);
    expect(result.message).toContain('最近推送时间');
  });

  it('应当在最后推送时间超过允许间隔时返回DOWN状态', async () => {
    // 模拟最后推送时间为90秒前
    const lastPushTime = new RealDate('2023-01-01T11:58:30Z').toISOString();
    
    const result = await checkPush({
      token: 'test-token',
      lastPushTime,
      pushInterval: 60 // 允许60秒间隔
    });
    
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('推送超时');
  });

  it('应当在未指定pushInterval时使用默认值60秒', async () => {
    // 模拟最后推送时间为30秒前
    const lastPushTime = new RealDate('2023-01-01T11:59:30Z').toISOString();
    
    const result = await checkPush({
      token: 'test-token',
      lastPushTime
      // 未指定pushInterval，应使用默认值60秒
    });
    
    expect(result.status).toBe(MONITOR_STATUS.UP);
    expect(result.message).toContain('最近推送时间');
  });

  it('应当在最后推送时间超过默认间隔时返回DOWN状态', async () => {
    // 模拟最后推送时间为120秒前
    const lastPushTime = new RealDate('2023-01-01T11:58:00Z').toISOString();
    
    const result = await checkPush({
      token: 'test-token',
      lastPushTime
      // 未指定pushInterval，应使用默认值60秒
    });
    
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('推送超时');
  });

  it('应当正确计算并显示超时时间', async () => {
    // 模拟最后推送时间为90秒前
    const lastPushTime = new RealDate('2023-01-01T11:58:30Z').toISOString();
    
    const result = await checkPush({
      token: 'test-token',
      lastPushTime,
      pushInterval: 60
    });
    
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('超时 1 分 30 秒');
  });

  it('应当在发生异常时返回DOWN状态', async () => {
    // 模拟一个异常
    global.Date.now = vi.fn(() => {
      throw new Error('测试错误');
    });
    
    const result = await checkPush({
      token: 'test-token',
      lastPushTime: '2023-01-01T11:58:30Z'
    });
    
    expect(result.status).toBe(MONITOR_STATUS.DOWN);
    expect(result.message).toContain('测试错误');
  });
}); 