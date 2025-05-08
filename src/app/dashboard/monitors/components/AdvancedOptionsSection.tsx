import { Dispatch, SetStateAction } from "react";

interface AdvancedOptionsSectionProps {
  monitorType: string;
  httpMethod: string;
  setHttpMethod: Dispatch<SetStateAction<string>>;
  statusCodes: string;
  setStatusCodes: Dispatch<SetStateAction<string>>;
  requestBody: string;
  setRequestBody: Dispatch<SetStateAction<string>>;
  requestHeaders: string;
  setRequestHeaders: Dispatch<SetStateAction<string>>;
  ignoreTls: boolean;
  setIgnoreTls: Dispatch<SetStateAction<boolean>>;
  maxRedirects: string;
  setMaxRedirects: Dispatch<SetStateAction<string>>;
  upsideDown: boolean;
  setUpsideDown: Dispatch<SetStateAction<boolean>>;
  notifyCertExpiry: boolean;
  setNotifyCertExpiry: Dispatch<SetStateAction<boolean>>;
}

export function AdvancedOptionsSection({
  monitorType,
  httpMethod,
  setHttpMethod,
  statusCodes,
  setStatusCodes,
  requestBody,
  setRequestBody,
  requestHeaders,
  setRequestHeaders,
  ignoreTls,
  setIgnoreTls,
  maxRedirects,
  setMaxRedirects,
  upsideDown,
  setUpsideDown,
  notifyCertExpiry,
  setNotifyCertExpiry
}: AdvancedOptionsSectionProps) {
  return (
    <div className="space-y-6">
      {/* HTTP选项 */}
      {(monitorType === "http" || monitorType === "keyword") && (
        <div className="p-5 border border-primary/10 rounded-lg">
          <h3 className="text-lg font-medium mb-4 text-primary">HTTP/HTTPS 选项</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 方法 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">请求方法</label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
            </div>
            
            {/* 有效状态码 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">有效状态码</label>
              <select
                value={statusCodes}
                onChange={(e) => setStatusCodes(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              >
                <option value="200-299">200-299</option>
                <option value="200">200</option>
                <option value="200,201,204">200,201,204</option>
                <option value="400-499">400-499</option>
                <option value="500-599">500-599</option>
              </select>
              <p className="text-xs text-foreground/50">被视为成功的状态码</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-6">
            {/* 请求体 */}
            {httpMethod !== "GET" && httpMethod !== "HEAD" && (
              <div className="space-y-2">
                <label className="block text-foreground/80 font-medium">请求体</label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none h-24 font-mono text-sm"
                  placeholder={'例如：\n{\n  "key": "value"\n}'}
                ></textarea>
              </div>
            )}
            
            {/* 请求头 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">请求头</label>
              <textarea
                value={requestHeaders}
                onChange={(e) => setRequestHeaders(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none h-24 font-mono text-sm"
                placeholder={'例如：\n{\n  "HeaderName": "HeaderValue"\n}'}
              ></textarea>
            </div>
            
            {/* HTTPS证书到期通知选项 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyCertExpiry"
                checked={notifyCertExpiry}
                onChange={(e) => setNotifyCertExpiry(e.target.checked)}
                className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
              />
              <label htmlFor="notifyCertExpiry" className="text-foreground/80">
                证书到期时通知
              </label>
            </div>
            <p className="text-xs text-foreground/50 pl-6">监控HTTPS网址时同时检查SSL证书有效性，避免配置单独的证书监控</p>
          </div>
        </div>
      )}
      
      {/* HTTPS证书选项 */}
      {monitorType === "https-cert" && (
        <div className="p-5 border border-primary/10 rounded-lg">
          <h3 className="text-lg font-medium mb-4 text-primary">HTTPS 证书监控</h3>
          <p className="text-sm text-foreground/70 mb-4">
            HTTPS证书监控会定期检查HTTPS证书的有效性，并在证书失效前发出警告。
          </p>
        </div>
      )}
      
      {/* 高级选项 */}
      <div className="p-5 border border-primary/10 rounded-lg">
        <h3 className="text-lg font-medium mb-4 text-primary">高级选项</h3>
        
        <div className="space-y-4">
          {/* TLS/SSL 选项 - 仅适用于 HTTP/HTTPS 和关键字监控 */}
          {(monitorType === "http" || monitorType === "keyword" || monitorType === "https-cert") && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ignoreTls"
                checked={ignoreTls}
                onChange={(e) => setIgnoreTls(e.target.checked)}
                className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
              />
              <label htmlFor="ignoreTls" className="text-foreground/80">
                {monitorType === "https-cert" 
                  ? "忽略证书验证错误（不推荐）" 
                  : "忽略 HTTPS 站点的 TLS/SSL 错误"}
              </label>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="upsideDown"
              checked={upsideDown}
              onChange={(e) => setUpsideDown(e.target.checked)}
              className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
            />
            <label htmlFor="upsideDown" className="text-foreground/80">
              反转模式
            </label>
          </div>
          <p className="text-xs text-foreground/50 pl-6">反转状态监控，如果服务可访问，则认为故障</p>
          
          {/* 最大重定向次数 */}
          {(monitorType === "http" || monitorType === "keyword" || monitorType === "https-cert") && (
            <div className="mt-4 md:w-1/2">
              <label className="block text-foreground/80 font-medium mb-2">最大重定向次数</label>
              <input
                type="number"
                value={maxRedirects}
                onChange={(e) => setMaxRedirects(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                min="0"
              />
              <p className="text-xs text-foreground/50 mt-1">设置为 0 禁用重定向</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 