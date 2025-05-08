import { NextRequest, NextResponse } from 'next/server';
import { updateAdminPassword } from '@/lib/settings';
import { validateAuth } from '@/lib/auth-helpers';

// 更新管理员密码
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const { userId, currentPassword, newPassword } = await request.json();
    
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '缺少必要的字段' },
        { status: 400 }
      );
    }
    
    await updateAdminPassword(userId, currentPassword, newPassword);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // 获取错误消息
    const message = error instanceof Error ? error.message : '更新密码失败';
    
    console.error('更新密码失败:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
} 