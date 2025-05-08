import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserLoginRecords } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 验证用户是否已登录
    const authOptions = await buildAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '未授权的请求' },
        { status: 401 }
      );
    }
    
    // 获取分页参数
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // 获取登录记录
    const { records, total } = await getUserLoginRecords(session.user.id, limit, offset);
    
    // 格式化返回数据
    const formattedRecords = records.map(record => ({
      id: record.id,
      ipAddress: record.ipAddress || '未知',
      userAgent: record.userAgent || '未知',
      success: record.success,
      time: record.createdAt,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords,
        pagination: {
          total,
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取登录记录失败:', error);
    return NextResponse.json(
      { error: '获取登录记录失败' },
      { status: 500 }
    );
  }
} 