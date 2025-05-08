import { NextResponse } from 'next/server';
import { monitorOperations } from '@/lib/db';
import { validateAuth } from '@/lib/auth-helpers';

/**
 * 批量操作监控项
 * 
 * 请求体:
 * {
 *   ids: string[],    // 监控项ID数组
 *   action: string,   // 操作类型: 'start'|'stop'|'delete'
 * }
 */
export async function POST(request: Request) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const data = await request.json();
    const { ids, action } = data;

    // 验证参数
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的监控项ID列表' },
        { status: 400 }
      );
    }

    if (!action || !['start', 'stop', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: '请提供有效的操作类型: start, stop 或 delete' },
        { status: 400 }
      );
    }

    // 处理不同的批量操作
    if (action === 'delete') {
      // 先停止监控
      if (ids.length > 0) {
        try {
          const { stopMonitor } = await import('@/lib/monitors/scheduler');
          ids.forEach(id => {
            try {
              stopMonitor(id);
            } catch (err) {
              console.error(`停止监控 ${id} 失败:`, err);
              // 继续处理其他监控项
            }
          });
        } catch (error) {
          console.error('导入停止监控函数失败:', error);
        }
      }

      // 删除监控项
      const results = await Promise.allSettled(
        ids.map(id => monitorOperations.deleteMonitor(id))
      );

      // 统计成功和失败的数量
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      return NextResponse.json({
        message: `成功删除 ${succeeded} 个监控项${failed > 0 ? `，${failed} 个删除失败` : ''}`,
        succeeded,
        failed
      });
    } else {
      // 启动或停止监控
      const active = action === 'start';
      
      // 更新监控项状态
      const updateResults = await Promise.allSettled(
        ids.map(id => monitorOperations.updateMonitor(id, { active }))
      );
      
      // 处理监控调度
      if (active) {
        try {
          const { scheduleMonitor } = await import('@/lib/monitors/scheduler');
          
          // 启动监控
          const scheduleResults = await Promise.allSettled(
            ids.map(id => scheduleMonitor(id))
          );
          
          // 统计成功和失败的数量
          const succeeded = scheduleResults.filter(r => r.status === 'fulfilled').length;
          const failed = scheduleResults.length - succeeded;
          
          return NextResponse.json({
            message: `成功启动 ${succeeded} 个监控项${failed > 0 ? `，${failed} 个启动失败` : ''}`,
            succeeded,
            failed
          });
        } catch (error) {
          console.error('导入启动监控函数失败:', error);
          return NextResponse.json(
            { error: '启动监控失败，请稍后重试' },
            { status: 500 }
          );
        }
      } else {
        try {
          const { stopMonitor } = await import('@/lib/monitors/scheduler');
          
          // 停止监控
          ids.forEach(id => {
            try {
              stopMonitor(id);
            } catch (err) {
              console.error(`停止监控 ${id} 失败:`, err);
              // 继续处理其他监控项
            }
          });
          
          // 统计成功和失败的数量
          const succeeded = updateResults.filter(r => r.status === 'fulfilled').length;
          const failed = updateResults.length - succeeded;
          
          return NextResponse.json({
            message: `成功停止 ${succeeded} 个监控项${failed > 0 ? `，${failed} 个停止失败` : ''}`,
            succeeded,
            failed
          });
        } catch (error) {
          console.error('导入停止监控函数失败:', error);
          return NextResponse.json(
            { error: '停止监控失败，请稍后重试' },
            { status: 500 }
          );
        }
      }
    }
  } catch (error) {
    console.error('批量操作监控项失败:', error);
    return NextResponse.json(
      { error: '批量操作失败，请稍后重试' },
      { status: 500 }
    );
  }
} 