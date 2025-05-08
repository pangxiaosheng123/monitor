import { NextResponse } from 'next/server';
import { getOrCreateJwtSecret } from '@/lib/system-config';
import { hasAdminUser, createUser } from '@/lib/auth';

// 定义初始化请求数据类型
interface InitRequestData {
  username?: string;
  password?: string;
  [key: string]: string | undefined;
}

// 简单数据验证函数
function validateInitData(data: InitRequestData) {
  const errors: string[] = [];
  
  if (!data.username) {
    errors.push('管理员账户名不能为空');
  }
  
  if (!data.password) {
    errors.push('密码不能为空');
  } else if (data.password.length < 6) {
    errors.push('密码长度至少为6个字符');
  }
  
  return { isValid: errors.length === 0, errors };
}

// 系统初始化API
export async function POST(req: Request) {
  try {
    // 解析请求体
    const body: InitRequestData = await req.json();
    
    // 验证请求数据
    const { isValid, errors } = validateInitData(body);
    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        message: '请求数据验证失败',
        errors 
      }, { status: 400 });
    }
    
    // 由于验证已通过，可以安全地断言不为undefined
    const username = body.username as string;
    const password = body.password as string;
    
    // 检查是否已存在管理员
    const adminExists = await hasAdminUser();
    if (adminExists) {
      return NextResponse.json({ 
        success: false, 
        message: '系统已初始化，管理员账户已存在' 
      }, { status: 409 });
    }
    
    // 创建JWT密钥
    await getOrCreateJwtSecret();
    
    // 创建管理员账户
    await createUser(null, username, password, true);
    
    return NextResponse.json({
      success: true,
      message: '系统初始化成功，管理员账户和JWT密钥已创建'
    });
  } catch (error) {
    console.error('系统初始化错误:', error);
    
    return NextResponse.json({ 
      success: false,
      message: '系统初始化失败' 
    }, { status: 500 });
  }
}

// 获取系统初始化状态
export async function GET() {
  try {
    // 检查是否有管理员和JWT密钥
    const adminExists = await hasAdminUser();
    
    return NextResponse.json({
      success: true,
      initialized: adminExists,
      message: adminExists ? '系统已初始化' : '系统尚未初始化'
    });
  } catch (error) {
    console.error('获取系统状态错误:', error);
    
    return NextResponse.json({ 
      success: false,
      message: '获取系统状态失败' 
    }, { status: 500 });
  }
} 