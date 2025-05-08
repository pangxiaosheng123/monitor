import { NextRequest, NextResponse } from 'next/server';
import { toggleNotificationChannelDefault } from '@/lib/settings';
import { validateAuth } from '@/lib/auth-helpers';

// 切换通知渠道的默认状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;
    
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少通知渠道ID' },
        { status: 400 }
      );
    }
    
    await toggleNotificationChannelDefault(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('切换通知渠道默认状态失败:', error);
    return NextResponse.json(
      { success: false, error: '切换通知渠道默认状态失败' },
      { status: 500 }
    );
  }
} 