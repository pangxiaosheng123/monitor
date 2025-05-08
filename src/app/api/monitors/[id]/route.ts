import { NextResponse } from 'next/server';
import { monitorOperations } from '@/lib/db';
import { ExtendedMonitor, SimpleNotificationBinding } from '@/types/monitor';
import { validateAuth } from '@/lib/auth-helpers';

// GET /api/monitors/[id] - 获取单个监控项详情
export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;

    // 确保params被完全解析
    const { id } = await Promise.resolve(context.params);
    const monitor = await monitorOperations.getMonitorById(id) as unknown as ExtendedMonitor;

    if (!monitor) {
      return NextResponse.json(
        { error: '监控项不存在' },
        { status: 404 }
      );
    }

    // 转换通知设置格式，以便前端使用
    const notificationBindings = monitor.notificationBindings?.map(binding => ({
      notificationId: binding.notificationChannelId,
      enabled: binding.enabled
    } as SimpleNotificationBinding)) || [];

    return NextResponse.json({
      ...monitor,
      notificationBindings
    });
  } catch (error) {
    console.error('获取监控项详情失败:', error);
    return NextResponse.json(
      { error: '获取监控项详情失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// PUT /api/monitors/[id] - 更新监控项
export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    // 确保params被完全解析
    const { id } = await Promise.resolve(context.params);
    const data = await request.json();
    
    // 验证必填字段
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: '名称和监控类型为必填项' },
        { status: 400 }
      );
    }
    
    // 将通知绑定关系与其他数据分开处理
    const { notificationBindings, ...monitorData } = data;
    
    // 设置完整更新数据
    const updateData = {
      ...monitorData,
      notificationBindings
    };
    
    // 更新监控项
    const monitor = await monitorOperations.updateMonitor(id, updateData);
    
    // 如果监控处于激活状态，则重新调度监控
    if (monitor.active) {
      try {
        const { scheduleMonitor } = await import('@/lib/monitors/scheduler');
        await scheduleMonitor(id);
      } catch (error) {
        console.error('更新后重新调度监控失败:', error);
        // 更新成功但调度失败不影响返回结果
      }
    }
    
    return NextResponse.json({
      message: '监控项更新成功',
      monitor
    });
  } catch (error) {
    console.error('更新监控项失败:', error);
    return NextResponse.json(
      { error: '更新监控项失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// DELETE /api/monitors/[id] - 删除监控项
export async function DELETE(_request: Request, context: { params: { id: string } }) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    // 确保params被完全解析
    const { id } = await Promise.resolve(context.params);

    // 先停止监控，再删除记录
    try {
      const { stopMonitor } = await import('@/lib/monitors/scheduler');
      stopMonitor(id);
    } catch (error) {
      console.error('停止监控失败:', error);
      // 停止失败不影响删除操作
    }
    
    // 删除监控项
    await monitorOperations.deleteMonitor(id);

    return NextResponse.json({
      message: '监控项删除成功'
    });
  } catch (error) {
    console.error('删除监控项失败:', error);
    return NextResponse.json(
      { error: '删除监控项失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// PATCH /api/monitors/[id] - 更新监控项状态
export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    // 确保params被完全解析
    const { id } = await Promise.resolve(context.params);
    const data = await request.json();
    
    // 验证active字段
    if (data.active === undefined) {
      return NextResponse.json(
        { error: '状态参数缺失' },
        { status: 400 }
      );
    }
    
    // 更新监控项状态
    const monitor = await monitorOperations.updateMonitor(id, { active: data.active });
    
    // 根据状态启动或停止监控
    if (data.active) {
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
      message: data.active ? '监控已恢复' : '监控已暂停',
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