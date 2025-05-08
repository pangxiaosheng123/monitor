import { NextResponse } from 'next/server';
import { resetAllMonitors } from '@/lib/monitors/scheduler';
import { validateAuth } from '@/lib/auth-helpers';

// POST /api/monitors/reset - 重置所有监控
export async function POST() {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    // 重置并重新启动所有激活的监控项
    const count = await resetAllMonitors();
    
    return NextResponse.json({ 
      message: `监控重置成功，已启动 ${count} 个监控项` 
    });
  } catch (error) {
    console.error('重置监控失败:', error);
    return NextResponse.json(
      { error: '重置监控失败，请稍后重试' },
      { status: 500 }
    );
  }
} 