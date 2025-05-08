import { Dispatch, SetStateAction } from "react";

interface DatabaseOptionsSectionProps {
  monitorType: string;
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  database: string;
  setDatabase: Dispatch<SetStateAction<string>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
}

export function DatabaseOptionsSection({
  monitorType,
  username,
  setUsername,
  password,
  setPassword,
  database,
  setDatabase,
  query,
  setQuery
}: DatabaseOptionsSectionProps) {
  if (!["mysql", "redis"].includes(monitorType)) {
    return null;
  }

  return (
    <div className="p-5 border border-primary/10 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-primary">
        {monitorType === "redis" ? "Redis 连接选项" : "数据库连接选项"}
      </h3>
      
      {/* Redis 不需要用户名/数据库名 */}
      {monitorType !== "redis" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-foreground/80 font-medium">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-foreground/80 font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}
      
      {/* Redis 只需要密码 */}
      {monitorType === "redis" && (
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-foreground/50">如果Redis不需要密码验证，请留空</p>
        </div>
      )}
      
      {/* 数据库名称 - 对于MySQL */}
      {monitorType === "mysql" && (
        <div className="space-y-2 mt-6">
          <label className="block text-foreground/80 font-medium">数据库名称</label>
          <input
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-foreground/50">
            可选，默认值为 &apos;mysql&apos;
          </p>
        </div>
      )}
      
      {/* 查询 - 对于MySQL */}
      {monitorType === "mysql" && (
        <div className="space-y-2 mt-6">
          <label className="block text-foreground/80 font-medium">测试查询</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none h-24 font-mono text-sm"
            placeholder={`SELECT 1;`}
          ></textarea>
          <p className="text-xs text-foreground/50">
            用于测试数据库连接的查询语句。留空将使用默认的查询：SELECT 1;
          </p>
        </div>
      )}
      
      {/* Redis特有选项 */}
      {monitorType === "redis" && (
        <div className="space-y-2 mt-6">
          <div className="mt-4">
            <label className="block text-foreground/80 font-medium mb-2">Redis 命令</label>
            <input
              type="text"
              placeholder="PING"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            />
            <p className="text-xs text-foreground/50 mt-1">
              用于监控 Redis 的命令。默认是 PING
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 