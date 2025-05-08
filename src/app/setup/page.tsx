import SetupForm from '@/app/auth/components/setup-form';
import { hasAdminUser } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function SetupPage() {
  try {
    // 检查是否已有管理员（第一优先级）
    const hasAdmin = await hasAdminUser();
    
    // 如果已有管理员，无论如何都重定向到登录页
    if (hasAdmin) {
      console.log("系统已初始化（有管理员），重定向到登录页");
      return redirect('/auth/login');
    }
    
    // 检查用户是否已登录（第二优先级）
    const session = await getServerSession();
    
    // 如果已经登录，直接跳转到仪表盘
    if (session) {
      console.log("用户已登录，重定向到仪表盘");
      return redirect('/dashboard');
    }
  } catch (error) {
    console.error("检查管理员状态出错:", error);
    // 出错时也重定向到登录页，确保安全
    return redirect('/auth/login');
  }
  
  // 未登录且无管理员，显示系统初始化表单
  console.log("显示系统初始化表单");
  return (
    <SetupForm />
  );
}