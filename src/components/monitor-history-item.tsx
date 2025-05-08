// 监控历史项组件
import Link from 'next/link';

export type MonitorStatus = "正常" | "故障" | "维护" | "未知" | "暂停";

export interface MonitorHistoryItemProps {
  id: number;
  monitorId: string;
  monitorName: string;
  status: MonitorStatus;
  timestamp: string;
  message: string;
  duration: string;
}

// 获取监控项状态点样式
export const getStatusDotClass = (status: MonitorStatus) => {
  switch (status) {
    case "正常":
      return "bg-success";
    case "故障":
      return "bg-error";
    case "维护":
      return "bg-primary";
    case "未知":
      return "bg-warning";
    case "暂停":
      return "bg-foreground/50";
    default:
      return "bg-foreground/50";
  }
};

// 获取状态文字样式
export const getStatusClass = (status: MonitorStatus) => {
  switch (status) {
    case "正常":
      return "bg-success/20 text-success";
    case "故障":
      return "bg-error/20 text-error";
    case "维护":
      return "bg-primary/20 text-primary";
    case "未知":
      return "bg-warning/20 text-warning";
    case "暂停":
      return "bg-foreground/20 text-foreground/50";
    default:
      return "bg-foreground/20 text-foreground/50";
  }
};

export default function MonitorHistoryItem({ monitorId, monitorName, status, timestamp, message, duration }: Omit<MonitorHistoryItemProps, 'id'>) {
  return (
    <tr className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusDotClass(status)}`}></div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
            {status}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Link 
          href={`/dashboard/monitors/${monitorId}`}
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          {monitorName}
        </Link>
      </td>
      <td className="py-3 px-4 text-foreground/80">{timestamp}</td>
      <td className="py-3 px-4 text-foreground/80">{duration}</td>
      <td className="py-3 px-4 text-foreground/80 max-w-md truncate">{message}</td>
    </tr>
  );
} 