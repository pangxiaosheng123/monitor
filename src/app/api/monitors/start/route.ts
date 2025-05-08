import { NextResponse } from 'next/server';
import { scheduleMonitor } from '@/lib/monitors/scheduler';
import { validateAuth } from '@/lib/auth-helpers';

// POST /api/monitors/start - 启动监控
export async function POST(request: Request) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: '监控项ID为必填项' },
        { status: 400 }
      );
    }

    // 调度该监控项
    const result = await scheduleMonitor(id);
    
    if (result) {
      return NextResponse.json({ message: '监控启动成功' });
    } else {
      return NextResponse.json(
        { error: '监控启动失败，该监控可能不存在或已被禁用' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('启动监控失败:', error);
    return NextResponse.json(
      { error: '启动监控失败，请稍后重试' },
      { status: 500 }
    );
  }
} 