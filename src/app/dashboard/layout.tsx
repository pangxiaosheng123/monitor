import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { buildAuthOptions } from '../api/auth/[...nextauth]/route';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // 获取自定义authOptions确保与登录使用相同的配置
    const authOptions = await buildAuthOptions();
    
    // 检查用户是否已登录
    const session = await getServerSession(authOptions);
    
    // 如果没有有效会话，则重定向到登录页
    if (!session || !session.user) {
      console.log('未检测到有效会话，重定向到登录页');
      return redirect('/auth/login?from=dashboard');
    }
    
    // 用户已登录，渲染仪表盘内容
    return <>{children}</>;
  } catch (error) {
    console.error('处理仪表盘会话出错:', error);
    
    // 出错时也重定向到登录页，但添加错误参数便于调试
    return redirect('/auth/login?error=session_error');
  }
} 