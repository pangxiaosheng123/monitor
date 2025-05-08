import { MonitorTypeSelector } from "./MonitorTypeSelector";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { generatePushToken } from "@/lib/monitors";
import { MonitorConfig } from "@/lib/monitors";
import toast from "react-hot-toast";

interface BasicInfoSectionProps {
  monitorType: string;
  setMonitorType: Dispatch<SetStateAction<string>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  hostname: string;
  setHostname: Dispatch<SetStateAction<string>>;
  port: string;
  setPort: Dispatch<SetStateAction<string>>;
  keyword: string;
  setKeyword: Dispatch<SetStateAction<string>>;
  config?: MonitorConfig;
  onConfigChange?: (key: string, value: string | number | boolean) => void;
}

export function BasicInfoSection({
  monitorType,
  setMonitorType,
  name,
  setName,
  url,
  setUrl,
  hostname,
  setHostname,
  port,
  setPort,
  keyword,
  setKeyword,
  config = {},
  onConfigChange
}: BasicInfoSectionProps) {
  // 处理token管理
  const [pushToken, setPushToken] = useState(config.pushToken || generatePushToken());
  const [baseUrl, setBaseUrl] = useState('');
  const [pushUrl, setPushUrl] = useState('');

  // 当配置变化时，更新token
  useEffect(() => {
    if (config.pushToken) {
      setPushToken(config.pushToken);
    }
  }, [config.pushToken]);

  // 在组件挂载时获取当前基础URL
  useEffect(() => {
    // 获取当前网站的基础URL
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setBaseUrl(origin);
    }
  }, []);

  // 当token或baseUrl变化时更新完整的Push URL
  useEffect(() => {
    if (monitorType === 'push' && baseUrl && pushToken) {
      const fullUrl = `${baseUrl}/api/push/${pushToken}?status=up&msg=OK&ping=100`;
      setPushUrl(fullUrl);
      
      // 如果提供了配置更新回调，则更新配置
      if (onConfigChange) {
        onConfigChange('pushToken', pushToken);
        onConfigChange('pushUrl', fullUrl);
      }
    }
  }, [pushToken, baseUrl, monitorType, onConfigChange]);

  // 处理重置token
  const handleResetToken = () => {
    const newToken = generatePushToken();
    setPushToken(newToken);
  };

  return (
    <div className="p-5 border border-primary/10 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-primary">基本信息</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 监控类型 */}
        <MonitorTypeSelector value={monitorType} onChange={setMonitorType} />
        
        {/* 显示名称 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">显示名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：我的网站"
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            required
          />
        </div>
      </div>

      {/* URL - 适用于 HTTP/HTTPS网址、HTTPS证书和关键字 */}
      {(monitorType === "http" || monitorType === "keyword" || monitorType === "https-cert") && (
        <div className="space-y-2 mt-6">
          <label className="block text-foreground/80 font-medium">URL *</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={monitorType === "https-cert" ? "https://" : "http:// 或 https://"}
            pattern={monitorType === "https-cert" ? "https://.+" : "https?://.+"}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            required
          />
          {monitorType === "https-cert" && (
            <p className="text-xs text-foreground/50">
              HTTPS证书监控必须使用HTTPS URL（以https://开头）
            </p>
          )}
        </div>
      )}

      {/* 关键字 - 仅适用于关键字监控 */}
      {monitorType === "keyword" && (
        <div className="space-y-2 mt-6">
          <label className="block text-foreground/80 font-medium">关键字 *</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="需要在响应中查找的文本"
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            required
          />
          <p className="text-xs text-foreground/50">
            如果响应中不包含此关键字，则监控会被标记为故障
          </p>
        </div>
      )}

      {/* 主机名和端口 - 适用于 TCP/数据库 */}
      {(monitorType === "port" || monitorType === "mysql" || monitorType === "redis") && (
        <>
          <div className="space-y-2 mt-6">
            <label className="block text-foreground/80 font-medium">主机名 *</label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="例如：db.example.com"
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              required
            />
          </div>
          <div className="space-y-2 mt-6">
            <label className="block text-foreground/80 font-medium">端口 *</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="例如：8080"
              min="1"
              max="65535"
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              required
            />
          </div>
        </>
      )}

      {/* Push URL */}
      {monitorType === "push" && (
        <div className="space-y-3 mt-6">
          <label className="block text-foreground/80 font-medium">Push URL</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={pushUrl}
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              readOnly
            />
            <button 
              type="button"
              className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg"
              title="复制到剪贴板"
              onClick={() => {
                if (!pushUrl) return;
                
                // 检查 clipboard API 是否可用
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(pushUrl)
                    .then(() => {
                      toast.success("URL已复制到剪贴板");
                    })
                    .catch(() => {
                      // 如果现代API失败，回退到传统方法
                      fallbackCopyToClipboard(pushUrl);
                    });
                } else {
                  // 如果不支持 clipboard API，直接使用传统方法
                  fallbackCopyToClipboard(pushUrl);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
          <button 
            type="button"
            className="text-primary border border-primary/30 px-4 py-2 rounded-button hover:bg-primary/5 transition-colors text-sm"
            onClick={handleResetToken}
          >
            重置令牌
          </button>
          <p className="text-xs text-foreground/60">
            您需要每 {config.pushInterval || 60} 秒向此 URL 发送一次 HTTP 请求，否则监控将被视为离线。使用 ping 参数添加响应时间（毫秒），例如: <span className="text-foreground/80">&ping=100</span>
          </p>
        </div>
      )}
    </div>
  );
}

// 在组件外部添加辅助函数
function fallbackCopyToClipboard(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  toast.success("URL已复制到剪贴板");
} 