import { NextResponse } from 'next/server';
import { stopMonitor } from '@/lib/monitors/scheduler';
import { validateAuth } from '@/lib/auth-helpers';

// POST /api/monitors/stop - 停止监控
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

    // 停止该监控项
    const result = stopMonitor(id);
    
    return NextResponse.json({ 
      message: result ? '监控停止成功' : '监控不在运行状态或不存在' 
    });
  } catch (error) {
    console.error('停止监控失败:', error);
    return NextResponse.json(
      { error: '停止监控失败，请稍后重试' },
      { status: 500 }
    );
  }
} 