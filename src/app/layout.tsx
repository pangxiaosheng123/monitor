import "./globals.css";
import { Toaster } from "react-hot-toast";
import "@fortawesome/fontawesome-free/css/all.min.css";
import AuthContext from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";

// 导入系统启动脚本，触发自动初始化
import "@/lib/startup";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary">
        <ThemeProvider defaultTheme="dark">
          <AuthContext>
            {children}
          </AuthContext>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
