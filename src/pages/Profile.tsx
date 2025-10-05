import { 
  User, 
  Settings, 
  Database, 
  TrendingUp, 
  Award, 
  LogOut, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign,
  Activity
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkSuspiciousActivity } from "@/lib/locationSecurity";
import ConsumptionDashboard from "@/components/ConsumptionDashboard";
import CurrencySettingsDialog from "@/components/CurrencySettingsDialog";
import SettingsDialog from "@/components/SettingsDialog";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

interface Profile {
  full_name: string | null;
  email: string | null;
  monthly_budget: number;
}

interface Expense {
  amount: number;
  category: string;
  expense_date: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    monthlyTotal: 0,
    badges: 0,
  });
  const [securityStatus, setSecurityStatus] = useState<'safe' | 'warning'>('safe');
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const { currency } = useCurrency();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
      checkSecurity();
      fetchUsage();
    }
  }, [user]);

  const fetchUsage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.rpc('get_usage_status', { _user_id: user.id });
    if (!error && data) {
      setUsageInfo(data);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Get last 30 days expenses to match home page
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, category, expense_date')
        .gte('expense_date', thirtyDaysAgo.toISOString());

      if (error) throw error;

      setExpenses(data || []);
      const total = data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      // Get completed challenges count
      const { count } = await supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'completed');

      setStats({
        monthlyTotal: total,
        badges: count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const checkSecurity = async () => {
    try {
      const suspicious = await checkSuspiciousActivity();
      setSecurityStatus(suspicious.length > 0 ? 'warning' : 'safe');
    } catch (error) {
      console.error('Error checking security:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user?.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = ['日期', '類別', '金額', '描述', '地點', '幣別'];
      const csvRows = [headers.join(',')];
      
      data?.forEach(expense => {
        const row = [
          new Date(expense.expense_date).toLocaleDateString('zh-TW'),
          expense.category,
          expense.amount,
          expense.description || '',
          expense.location_name || '',
          expense.currency || 'TWD'
        ];
        csvRows.push(row.map(cell => `"${cell}"`).join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `消費記錄_${new Date().toLocaleDateString('zh-TW')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('資料已成功匯出');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('匯出失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-hero bg-mesh">
      {/* Header */}
      <header className="px-6 pt-8 pb-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.full_name || '用戶'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile?.email || user?.email}
            </p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-6 space-y-4 animate-slide-up">
        <Card 
          className="p-6 glass-card shadow-md interactive-lift cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setDashboardOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">總消費（最近30天）</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.monthlyTotal, currency)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6 glass-card shadow-md interactive-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">累積徽章</p>
              <p className="text-3xl font-bold mt-1">{stats.badges}</p>
            </div>
            <Award className="w-8 h-8 text-secondary" />
          </div>
        </Card>

        <Card className="p-6 glass-card shadow-md interactive-lift">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">今日使用量</h3>
          </div>
          {usageInfo ? (
            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">語音輸入</span>
                  <span className="font-semibold">{usageInfo.voice_input?.remaining || 0}/20</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((usageInfo.voice_input?.current_usage || 0) / 20) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">AI 解析</span>
                  <span className="font-semibold">{usageInfo.ai_parse?.remaining || 0}/20</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((usageInfo.ai_parse?.current_usage || 0) / 20) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                明天 00:00 重置
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">載入中...</p>
          )}
        </Card>
      </div>

      {/* Menu */}
      <div className="px-6 mt-8 space-y-2 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/security')}
          className="w-full justify-start h-14 glass-card transition-smooth hover:scale-[1.02]"
        >
          <Shield className="w-5 h-5 mr-3" />
          <span className="flex-1 text-left">隱私與安全</span>
          {securityStatus === 'safe' ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              安全
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              <AlertTriangle className="w-3 h-3 mr-1" />
              注意
            </Badge>
          )}
        </Button>

        <Button 
          variant="ghost" 
          onClick={() => setCurrencyDialogOpen(true)}
          className="w-full justify-start h-14 glass-card transition-smooth hover:scale-[1.02]"
        >
          <DollarSign className="w-5 h-5 mr-3" />
          <span>幣值設定</span>
        </Button>

        <Button 
          variant="ghost" 
          onClick={() => setSettingsDialogOpen(true)}
          className="w-full justify-start h-14 glass-card transition-smooth hover:scale-[1.02]"
        >
          <Settings className="w-5 h-5 mr-3" />
          <span>設定</span>
        </Button>

        <Button 
          variant="ghost" 
          onClick={handleExportData}
          className="w-full justify-start h-14 glass-card transition-smooth hover:scale-[1.02]"
        >
          <Database className="w-5 h-5 mr-3" />
          <span>資料匯出</span>
        </Button>

        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start h-14 glass-card transition-smooth hover:scale-[1.02] text-destructive hover:text-destructive"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>登出</span>
        </Button>
      </div>

      {/* Footer */}
      <div className="px-6 mt-12 text-center text-sm text-muted-foreground">
        <p>Spendy Map v1.0</p>
        <p className="mt-1">讓記帳變得有趣</p>
      </div>

      {/* Consumption Dashboard */}
      <ConsumptionDashboard 
        open={dashboardOpen}
        onOpenChange={setDashboardOpen}
        expenses={expenses}
      />

      {/* Currency Settings Dialog */}
      <CurrencySettingsDialog
        open={currencyDialogOpen}
        onOpenChange={setCurrencyDialogOpen}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  );
};

export default Profile;
