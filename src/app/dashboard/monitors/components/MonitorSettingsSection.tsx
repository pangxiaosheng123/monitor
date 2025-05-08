import { Dispatch, SetStateAction } from "react";

interface MonitorSettingsSectionProps {
  interval: string;
  setInterval: Dispatch<SetStateAction<string>>;
  retries: string;
  setRetries: Dispatch<SetStateAction<string>>;
  retryInterval: string;
  setRetryInterval: Dispatch<SetStateAction<string>>;
  resendInterval: string;
  setResendInterval: Dispatch<SetStateAction<string>>;
}

export function MonitorSettingsSection({
  interval,
  setInterval,
  retries,
  setRetries,
  retryInterval,
  setRetryInterval,
  resendInterval,
  setResendInterval
}: MonitorSettingsSectionProps) {
  return (
    <div className="p-5 border border-primary/10 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-primary">监控设置</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 心跳间隔 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">心跳间隔</label>
          <div className="flex items-center">
            <input
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full px-4 py-2 rounded-l-lg dark:bg-dark-input bg-light-input border border-r-0 border-primary/20 focus:border-primary focus:outline-none"
              min="1"
            />
            <span className="px-4 py-2 rounded-r-lg dark:bg-dark-nav bg-light-nav border border-l-0 border-primary/20">
              秒
            </span>
          </div>
          <p className="text-xs text-foreground/50">监控检测的频率</p>
        </div>
        
        {/* 重试次数 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">重试次数</label>
          <input
            type="number"
            value={retries}
            onChange={(e) => setRetries(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            min="0"
          />
          <p className="text-xs text-foreground/50">标记为故障前的最大重试次数</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* 心跳重试间隔 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">心跳重试间隔</label>
          <div className="flex items-center">
            <input
              type="number"
              value={retryInterval}
              onChange={(e) => setRetryInterval(e.target.value)}
              className="w-full px-4 py-2 rounded-l-lg dark:bg-dark-input bg-light-input border border-r-0 border-primary/20 focus:border-primary focus:outline-none"
              min="1"
            />
            <span className="px-4 py-2 rounded-r-lg dark:bg-dark-nav bg-light-nav border border-l-0 border-primary/20">
              秒
            </span>
          </div>
          <p className="text-xs text-foreground/50">重试检测的间隔时间</p>
        </div>
        
        {/* 连续失败发送通知间隔 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">通知重复间隔</label>
          <input
            type="number"
            value={resendInterval}
            onChange={(e) => setResendInterval(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            min="0"
          />
          <p className="text-xs text-foreground/50">
            {parseInt(resendInterval) > 0 
              ? `每 ${resendInterval} 次连续失败时重新发送通知` 
              : "禁用重复通知"}
          </p>
        </div>
      </div>
    </div>
  );
} 