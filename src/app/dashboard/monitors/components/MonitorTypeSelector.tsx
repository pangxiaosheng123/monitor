import { Dispatch, SetStateAction } from "react";

interface MonitorTypeSelectorProps {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
}

export function MonitorTypeSelector({ value, onChange }: MonitorTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-foreground/80 font-medium">监控类型 *</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
        data-testid="monitor-type-select"
      >
        <optgroup label="常规监控类型">
          <option value="http">HTTP/HTTPS网址</option>
          <option value="https-cert">HTTPS证书</option>
          <option value="port">TCP Port</option>
          <option value="keyword">HTTP/HTTPS - 关键字</option>
        </optgroup>
        <optgroup label="被动监控类型">
          <option value="push">Push</option>
        </optgroup>
        <optgroup label="数据库监控类型">
          <option value="mysql">MySQL/MariaDB</option>
          <option value="redis">Redis</option>
        </optgroup>
      </select>
    </div>
  );
} 