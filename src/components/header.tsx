"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SettingsDialog } from "./settings-dialog";
import Link from "next/link";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const productsDropdownRef = useRef<HTMLDivElement>(null);

  // 产品推荐列表
  const recommendedProducts = [
    { title: "ShowDoc", url: "https://www.showdoc.com.cn/", description: "API文档、技术文档工具", icon: "book" },
    { title: "RunApi", url: "https://www.runapi.com.cn/", description: "接口管理与测试平台", icon: "code" },
    { title: "大风云", url: "https://www.dfyun.com.cn/", description: "性价比巨高的CDN服务", icon: "cloud" },
    { title: "Push", url: "https://push.showdoc.com.cn/", description: "消息推送服务", icon: "bell" },
    { title: "极速箱", url: "https://www.jisuxiang.com/", description: "高颜值开发工具集合", icon: "bell" }
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("退出登录失败", error);
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (productsDropdownRef.current && !productsDropdownRef.current.contains(event.target as Node)) {
        setIsProductsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav className="glass-effect fixed top-0 left-80 right-0 h-16 border-b border-primary/10 z-50">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-xl font-bold text-primary">酷监控</span>
            <span className="dark:text-white/80 text-light-text-secondary">状态速览</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
              onClick={toggleTheme}
              aria-label="切换主题"
            >
              <i className="fas fa-lightbulb"></i>
            </button>
            
            <button 
              className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="设置"
            >
              <i className="fas fa-cog"></i>
            </button>
                        
            {/* GitHub链接 */}
            <Link 
              href="https://github.com/star7th/coolmonitor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
              aria-label="GitHub仓库"
            >
              <i className="fab fa-github"></i>
            </Link>
            
            {/* 产品推荐下拉框 */}
            <div className="relative" ref={productsDropdownRef}>
              <button 
                className="p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
                onClick={() => setIsProductsOpen(!isProductsOpen)}
                aria-label="更多产品推荐"
              >
                <i className="fas fa-th-large"></i>
              </button>
              
              {isProductsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-2xl dark:bg-dark-nav bg-light-nav border-2 border-primary/25 z-[999] overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-primary/10 dark:bg-dark-card bg-light-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium dark:text-white text-light-text-primary">更多产品推荐</p>
                    </div>
                  </div>
                  
                  <div className="py-2 max-h-80 overflow-y-auto">
                    {recommendedProducts.map((product, index) => (
                      <Link 
                        key={index}
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-4 py-3 hover:bg-primary/10 text-sm flex items-start space-x-3 dark:text-white text-light-text-primary transition-colors"
                      >
                        <div className="mt-0.5">
                          <i className={`fas fa-${product.icon} w-5 text-primary`}></i>
                        </div>
                        <div>
                          <div className="font-medium">{product.title}</div>
                          <div className="text-xs dark:text-white/60 text-light-text-secondary mt-0.5">{product.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            
            {/* 用户下拉菜单 */}
            <div className="relative" ref={dropdownRef}>
              <button 
                className="flex items-center space-x-2 p-2 rounded-button hover:bg-primary/10 transition-colors dark:text-white text-light-text-primary"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <i className="fas fa-user"></i>
                {session?.user?.email && (
                  <span className="text-sm hidden md:inline-block">{session.user.email}</span>
                )}
                <i className="fas fa-chevron-down text-xs"></i>
              </button>
              
              {isDropdownOpen && (
                <div ref={dropdownRef} className="absolute right-0 mt-2 w-64 rounded-lg shadow-2xl dark:bg-dark-nav bg-light-nav border-2 border-primary/25 z-[999] overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-primary/10 dark:bg-dark-card bg-light-card">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <i className="fas fa-user"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white text-light-text-primary">{session?.user?.name || '用户'}</p>
                        <p className="text-xs dark:text-white/60 text-light-text-secondary">{session?.user?.email || ''}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <button 
                      className="w-full text-left px-4 py-2 hover:bg-primary/10 text-sm flex items-center space-x-2 dark:text-white text-light-text-primary transition-colors"
                      onClick={() => {
                        router.push('/dashboard/login-records');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <i className="fas fa-history w-5"></i>
                      <span>登录记录</span>
                    </button>
                    
                    <button 
                      className="w-full text-left px-4 py-2 rounded-md hover:bg-red-500/10 text-sm flex items-center space-x-2 text-red-400 transition-colors"
                      onClick={handleLogout}
                    >
                      <i className="fas fa-sign-out-alt w-5"></i>
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* 设置对话框 */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
} 