import { NextResponse } from 'next/server';
import { monitorOperations } from '@/lib/db';
import { ExtendedMonitor, MonitorFormData, SimpleNotificationBinding } from '@/types/monitor';
import { validateAuth } from '@/lib/auth-helpers';
import { checkHttp, checkKeyword, checkHttpsCertificate } from '@/lib/monitors/checker-http';
import { checkPort } from '@/lib/monitors/checker-ports';
import { checkDatabase } from '@/lib/monitors/checker-database';
import { checkPush } from '@/lib/monitors/checker-push';
import { MonitorDatabaseConfig } from '@/lib/monitors/types';

// POST /api/monitors - 创建新监控项
export async function POST(request: Request) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const data: MonitorFormData = await request.json();
    
    // 验证必填字段
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: '监控名称和类型为必填项' },
        { status: 400 }
      );
    }
    
    // 根据监控类型验证其他必填字段
    if (['http', 'keyword', 'https-cert'].includes(data.type)) {
      if (!data.config?.url) {
        return NextResponse.json(
          { error: 'URL为必填项' },
          { status: 400 }
        );
      }
      
      if (data.type === 'keyword' && !data.config.keyword) {
        return NextResponse.json(
          { error: '关键字为必填项' },
          { status: 400 }
        );
      }
      
      if (data.type === 'https-cert' && !String(data.config.url).startsWith('https://')) {
        return NextResponse.json(
          { error: 'HTTPS证书监控必须使用HTTPS URL（以https://开头）' },
          { status: 400 }
        );
      }
    }
    
    if (['port', 'mysql', 'postgres', 'sqlserver', 'redis'].includes(data.type)) {
      if (!data.config?.hostname || !data.config.port) {
        return NextResponse.json(
          { error: '主机名和端口为必填项' },
          { status: 400 }
        );
      }
    }
    
    // 提取监控设置
    const interval = typeof data.interval === 'string' ? parseInt(data.interval) : (data.interval || 60);
    const retries = typeof data.retries === 'string' ? parseInt(data.retries) : (data.retries || 0);
    const retryInterval = typeof data.retryInterval === 'string' ? parseInt(data.retryInterval) : (data.retryInterval || 60);
    const resendInterval = typeof data.resendInterval === 'string' ? parseInt(data.resendInterval) : (data.resendInterval || 0);
    
    // 创建监控项数据结构
    const monitorData = {
      name: data.name,
      type: data.type,
      config: data.config || {},
      interval,
      retries,
      retryInterval,
      resendInterval,
      upsideDown: data.upsideDown || false,
      description: data.description || "",
      active: data.active !== false,
      notificationBindings: data.notificationBindings || []
    };
    
    // 创建监控项
    const monitor = await monitorOperations.createMonitor(monitorData);
    
    // 立即调度监控项开始检查
    try {
      const { scheduleMonitor } = await import('@/lib/monitors/scheduler');
      await scheduleMonitor(monitor.id);
    } catch (error) {
      console.error('启动新创建的监控失败:', error);
      // 创建成功但启动失败不影响返回结果
    }
    
    return NextResponse.json({ 
      message: '监控项创建成功',
      monitor
    });
  } catch (error) {
    console.error('创建监控项失败:', error);
    return NextResponse.json(
      { error: '创建监控项失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// GET /api/monitors - 获取所有监控项
export async function GET() {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const monitors = await monitorOperations.getAllMonitors() as unknown as ExtendedMonitor[];
    
    // 转换通知设置格式，以便前端使用
    const formattedMonitors = monitors.map(monitor => {
      const notificationBindings = monitor.notificationBindings?.map(binding => ({
        notificationId: binding.notificationChannelId,
        enabled: binding.enabled
      } as SimpleNotificationBinding)) || [];
      
      return {
        ...monitor,
        notificationBindings
      };
    });
    
    return NextResponse.json(formattedMonitors);
  } catch (error) {
    console.error('获取监控项列表失败:', error);
    return NextResponse.json(
      { error: '获取监控项列表失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// PATCH /api/monitors/[id]/status - 更新监控项状态
export async function PATCH(request: Request) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const data = await request.json();
    const { id, active } = data;
    
    if (!id || active === undefined) {
      return NextResponse.json(
        { error: '监控ID和状态为必填项' },
        { status: 400 }
      );
    }
    
    const monitor = await monitorOperations.updateMonitor(id, { active });
    
    // 根据状态启动或停止监控
    if (active) {
      try {
        const { scheduleMonitor } = await import('@/lib/monitors/scheduler');
        await scheduleMonitor(id);
      } catch (error) {
        console.error('启动监控失败:', error);
        // 更新成功但启动失败不影响返回结果
      }
    } else {
      try {
        const { stopMonitor } = await import('@/lib/monitors/scheduler');
        stopMonitor(id);
      } catch (error) {
        console.error('停止监控失败:', error);
        // 更新成功但停止失败不影响返回结果
      }
    }
    
    return NextResponse.json({
      message: active ? '监控已启动' : '监控已停止',
      monitor
    });
  } catch (error) {
    console.error('更新监控状态失败:', error);
    return NextResponse.json(
      { error: '更新监控状态失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 获取适当的检查器函数
export function getCheckerForType(type: string) {
  switch (type) {
    case 'http':
      return checkHttp;
    case 'keyword':
      return checkKeyword;
    case 'https-cert':
      return checkHttpsCertificate;
    case 'port':
      return checkPort;
    case 'mysql':
      return (config: MonitorDatabaseConfig) => checkDatabase('mysql', config);
    case 'redis':
      return (config: MonitorDatabaseConfig) => checkDatabase('redis', config);
    case 'push':
      return checkPush;
    default:
      throw new Error(`不支持的监控类型: ${type}`);
  }
} 