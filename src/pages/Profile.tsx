import { User, Settings, Database, TrendingUp, Award, LogOut, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkSuspiciousActivity } from "@/lib/locationSecurity";

interface Profile {
  full_name: string | null;
  email: string | null;
  monthly_budget: number;
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

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
      checkSecurity();
    }
  }, [user]);

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
      // Get current month expenses
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', startOfMonth.toISOString());

      if (error) throw error;

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
        <Card className="p-6 glass-card shadow-md interactive-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">本月總消費</p>
              <p className="text-3xl font-bold mt-1">NT$ {Math.round(stats.monthlyTotal)}</p>
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

        <Button variant="ghost" className="w-full justify-start h-14 glass-card transition-smooth hover:scale-[1.02]">
          <Settings className="w-5 h-5 mr-3" />
          <span>設定</span>
        </Button>

        <Button variant="ghost" className="w-full justify-start h-14 glass-card transition-smooth hover:scale-[1.02]">
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
    </div>
  );
};

export default Profile;
