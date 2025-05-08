import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuth } from '@/lib/auth-helpers';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;

    // 获取用户信息
    const authOptions = await buildAuthOptions();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权的请求' },
        { status: 401 }
      );
    }

    // 获取监控ID参数
    const monitorId = params.id;

    // 验证用户是否有权限访问该监控项
    const monitor = await prisma.monitor.findUnique({
      where: {
        id: monitorId,
        // 如果是管理员，可以访问所有监控项
        ...(session.user.isAdmin ? {} : { createdById: session.user.id })
      }
    });

    if (!monitor) {
      return NextResponse.json(
        { error: '无权访问此监控项' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '2h';
    
    // 计算时间范围
    const now = new Date();
    let timeAgo = new Date();
    
    switch(range) {
      case '2h':
        timeAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        break;
      case '24h':
        timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    }
    
    // 获取监控历史记录
    const history = await prisma.monitorStatus.findMany({
      where: {
        monitorId: monitorId,
        timestamp: {
          gte: timeAgo
        }
      },
      orderBy: {
        timestamp: 'asc'
      },
      select: {
        id: true,
        status: true,
        message: true,
        ping: true,
        timestamp: true
      }
    });
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('获取监控历史记录失败:', error);
    return NextResponse.json(
      { error: '获取监控历史记录失败' },
      { status: 500 }
    );
  }
} 