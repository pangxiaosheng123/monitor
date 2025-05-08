import { redirect } from "next/navigation";
import { hasAdminUser } from '@/lib/auth';

export default async function Home() {
  try {
    // 检查是否有管理员用户
    const hasAdmin = await hasAdminUser();
    
    if (hasAdmin) {
      // 已有管理员，重定向到登录页
      redirect("/auth/login");
    } else {
      // 无管理员，重定向到系统初始化页面
      redirect("/setup");
    }
  } catch (error) {
    console.error("检查管理员状态时出错:", error);
    // 出错时默认重定向到系统初始化页面
    redirect("/setup");
  }
}
