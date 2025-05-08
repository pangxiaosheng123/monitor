-- CreateTable
CREATE TABLE "MonitorNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monitorId" TEXT NOT NULL,
    "notificationChannelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonitorNotification_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonitorNotification_notificationChannelId_fkey" FOREIGN KEY ("notificationChannelId") REFERENCES "NotificationChannel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MonitorNotification_monitorId_idx" ON "MonitorNotification"("monitorId");

-- CreateIndex
CREATE INDEX "MonitorNotification_notificationChannelId_idx" ON "MonitorNotification"("notificationChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorNotification_monitorId_notificationChannelId_key" ON "MonitorNotification"("monitorId", "notificationChannelId");
