import { useEffect, useState } from "react";
import { Shield, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  getLocationAccessLogs,
  checkSuspiciousActivity,
  type LocationAccessLog,
  type SuspiciousActivity,
} from "@/lib/locationSecurity";
import { format } from "date-fns";

const SecurityDashboard = () => {
  const [accessLogs, setAccessLogs] = useState<LocationAccessLog[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [logs, suspicious] = await Promise.all([
        getLocationAccessLogs(50),
        checkSuspiciousActivity(),
      ]);
      setAccessLogs(logs);
      setSuspiciousActivity(suspicious);
    } catch (error) {
      console.error("Error loading security data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAccessTypeColor = (type: string) => {
    switch (type) {
      case 'view': return 'bg-primary/20 text-primary';
      case 'update': return 'bg-yellow-500/20 text-yellow-500';
      case 'delete': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'view': return '👁️';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      default: return '📝';
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <motion.header 
        className="bg-card border-b border-border px-6 py-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              隱私與安全
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              監控您的位置數據訪問記錄
            </p>
          </div>
        </div>
      </motion.header>

      <div className="p-6 space-y-6">
        {/* Security Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold flex items-center gap-2">
                  {suspiciousActivity.length === 0 ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      安全狀態正常
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      檢測到異常活動
                    </>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {suspiciousActivity.length === 0
                    ? "您的位置數據訪問模式正常"
                    : `發現 ${suspiciousActivity.length} 個可疑訪問模式`}
                </p>
              </div>
              <Badge variant={suspiciousActivity.length === 0 ? "default" : "destructive"}>
                {suspiciousActivity.length === 0 ? "✅ 安全" : "⚠️ 警告"}
              </Badge>
            </div>

            {suspiciousActivity.length > 0 && (
              <div className="mt-4 space-y-2">
                {suspiciousActivity.map((activity, index) => (
                  <div key={index} className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-sm font-medium text-yellow-500">
                      {activity.suspicious_activity}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      訪問次數: {activity.access_count} | 最後訪問: {format(new Date(activity.last_access), 'yyyy-MM-dd HH:mm:ss')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Access Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">位置數據訪問記錄</h3>
              <Badge variant="outline" className="ml-auto">
                {accessLogs.length} 筆記錄
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                載入中...
              </div>
            ) : accessLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                尚無訪問記錄
              </div>
            ) : (
              <div className="space-y-2">
                {accessLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    className="p-3 bg-muted/50 rounded-lg border border-border"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getAccessTypeIcon(log.access_type)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={getAccessTypeColor(log.access_type)}>
                              {log.access_type}
                            </Badge>
                            {log.expense_id && (
                              <span className="text-xs text-muted-foreground">
                                記帳 ID: {log.expense_id.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.accessed_at), 'yyyy-MM-dd HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Security Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              數據保護措施
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>行級安全性 (RLS)：僅您可以訪問自己的位置數據</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>訪問審計：所有位置數據訪問都會被記錄</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>異常檢測：自動識別可疑訪問模式</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>精度控制：分析功能使用降精度數據 (~1km)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>加密傳輸：所有數據通過 HTTPS 加密傳輸</span>
              </li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
