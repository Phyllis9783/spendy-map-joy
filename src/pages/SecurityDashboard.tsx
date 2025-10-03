import { useEffect, useState } from "react";
import { Shield, Eye, AlertTriangle, CheckCircle, Lock, Database, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  getLocationAccessLogs, 
  checkSuspiciousActivity, 
  LocationAccessLog, 
  SuspiciousActivity 
} from "@/lib/locationSecurity";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
      // Clean up old logs (90+ days) for data privacy compliance
      const { cleanupOldLocationLogs } = await import('@/lib/locationSecurity');
      const deletedCount = await cleanupOldLocationLogs();
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old location access logs`);
      }
      
      const [logs, suspicious] = await Promise.all([
        getLocationAccessLogs(100),
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
      case 'view': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'update': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'delete': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
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

  // Prepare chart data
  const accessTypeData = [
    { name: '查看', value: accessLogs.filter(log => log.access_type === 'view').length, color: '#3b82f6' },
    { name: '更新', value: accessLogs.filter(log => log.access_type === 'update').length, color: '#f59e0b' },
    { name: '刪除', value: accessLogs.filter(log => log.access_type === 'delete').length, color: '#ef4444' },
  ];

  // Group logs by date for timeline chart
  const getTimelineData = () => {
    const grouped = accessLogs.reduce((acc, log) => {
      const date = format(new Date(log.accessed_at), 'MM/dd', { locale: zhTW });
      if (!acc[date]) {
        acc[date] = { date, count: 0 };
      }
      acc[date].count++;
      return acc;
    }, {} as Record<string, { date: string; count: number }>);

    return Object.values(grouped).slice(0, 7).reverse();
  };

  const timelineData = getTimelineData();

  return (
    <div className="min-h-screen bg-gradient-hero bg-mesh pb-24">
      <motion.div 
        className="max-w-6xl mx-auto px-6 pt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">安全儀表板</h1>
        </div>

        {/* Security Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className={`glass-card mb-6 ${suspiciousActivity.length > 0 ? 'border-amber-500/50' : 'border-green-500/50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {suspiciousActivity.length > 0 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-amber-500">檢測到可疑活動</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-500">安全狀態良好</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suspiciousActivity.length > 0 ? (
                <div className="space-y-3">
                  {suspiciousActivity.map((activity, index) => (
                    <div key={index} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <p className="font-medium text-amber-500">{activity.suspicious_activity}</p>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>訪問次數: {activity.access_count}</span>
                        <span>最後訪問: {format(new Date(activity.last_access), 'PPp', { locale: zhTW })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  ✅ 未檢測到異常活動。您的位置數據訪問模式正常。
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Access Type Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="w-5 h-5 text-primary" />
                  訪問類型分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={accessTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {accessTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {accessTypeData.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl font-bold" style={{ color: item.color }}>
                        {item.value}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Access Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="w-5 h-5 text-secondary" />
                  近 7 天訪問趨勢
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Access Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                位置數據訪問日誌
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">載入中...</p>
              ) : accessLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">尚無訪問記錄</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {accessLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getAccessTypeIcon(log.access_type)}</span>
                        <div>
                          <Badge className={`${getAccessTypeColor(log.access_type)} font-medium`}>
                            {log.access_type === 'view' && '查看'}
                            {log.access_type === 'update' && '更新'}
                            {log.access_type === 'delete' && '刪除'}
                          </Badge>
                          {log.expense_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              消費記錄 ID: {log.expense_id.substring(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(log.accessed_at), 'PPp', { locale: zhTW })}
                        </p>
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground">
                            {log.ip_address}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Measures Info */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                數據保護措施
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">行級安全 (RLS)</p>
                    <p className="text-sm text-muted-foreground">
                      確保每個用戶只能訪問自己的數據
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">審計日誌</p>
                    <p className="text-sm text-muted-foreground">
                      記錄所有位置數據的訪問行為
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">異常檢測</p>
                    <p className="text-sm text-muted-foreground">
                      自動偵測可疑的訪問模式
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">低精度視圖</p>
                    <p className="text-sm text-muted-foreground">
                      分析時使用降低精度的位置數據
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SecurityDashboard;
