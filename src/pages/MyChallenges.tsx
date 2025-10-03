import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trackAllChallenges } from "@/lib/challengeTracker";
import { Trophy, Clock, CheckCircle2, XCircle, Target, TrendingUp } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  category: string;
  target_amount: number;
  duration_days: number;
  icon: string;
  color: string;
}

interface UserChallenge {
  id: string;
  challenge_id: string;
  user_id: string;
  current_amount: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  progress_data: any;
  challenges: Challenge;
}

const MyChallenges = () => {
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserChallenges();
    fetchAvailableChallenges();
  }, []);

  const fetchUserChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "請先登入",
          description: "查看挑戰需要先登入帳號",
          variant: "destructive",
        });
        return;
      }

      // First, track all challenges to update progress
      await trackAllChallenges(user.id);

      // Then fetch updated challenges
      const { data, error } = await supabase
        .from('user_challenges')
        .select('*, challenges(*)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error: any) {
      console.error('Error fetching challenges:', error);
      toast({
        title: "載入失敗",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableChallenges(data || []);
    } catch (error: any) {
      console.error('Error fetching available challenges:', error);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already joined
      const { data: existing } = await supabase
        .from('user_challenges')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        toast({
          title: "已參加挑戰",
          description: "你已經在進行這個挑戰了",
          variant: "destructive",
        });
        return;
      }

      // Join challenge
      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          status: 'active',
          current_amount: 0,
        });

      if (error) throw error;

      toast({
        title: "✨ 挑戰已加入",
        description: "開始你的挑戰之旅吧！",
      });

      fetchUserChallenges();
    } catch (error: any) {
      console.error('Error joining challenge:', error);
      toast({
        title: "加入失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Target;
    return <Icon className="w-5 h-5" />;
  };

  const getColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: "from-blue-500 to-cyan-500",
      purple: "from-purple-500 to-pink-500",
      amber: "from-amber-500 to-orange-500",
      green: "from-green-500 to-emerald-500",
      emerald: "from-emerald-500 to-teal-500",
      teal: "from-teal-500 to-cyan-500",
      red: "from-red-500 to-rose-500",
      orange: "from-orange-500 to-amber-500",
    };
    return colorMap[color] || "from-primary to-primary/80";
  };

  const getRemainingDays = (startedAt: string, durationDays: number) => {
    const startDate = new Date(startedAt);
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const today = new Date();
    const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return remaining;
  };

  const renderChallengeCard = (uc: UserChallenge) => {
    const challenge = uc.challenges;
    const progress = (uc.current_amount / challenge.target_amount) * 100;
    const remainingDays = getRemainingDays(uc.started_at, challenge.duration_days);

    return (
      <motion.div
        key={uc.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card border-2 border-primary/20 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClass(challenge.color)} shadow-lg`}>
                  {getIcon(challenge.icon)}
                </div>
                <div>
                  <CardTitle className="text-lg">{challenge.title}</CardTitle>
                  <CardDescription className="mt-1">{challenge.description}</CardDescription>
                </div>
              </div>
              {uc.status === 'completed' && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  已完成
                </Badge>
              )}
              {uc.status === 'failed' && (
                <Badge variant="destructive" className="opacity-70">
                  <XCircle className="w-3 h-3 mr-1" />
                  已失敗
                </Badge>
              )}
              {uc.status === 'active' && (
                <Badge variant="outline" className="border-primary/30">
                  <Clock className="w-3 h-3 mr-1" />
                  進行中
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">進度</span>
                <span className="font-semibold">
                  {uc.current_amount} / {challenge.target_amount}
                  {challenge.challenge_type === 'spending' && ' TWD'}
                  {challenge.challenge_type === 'logging' && challenge.category === 'streak' && ' 天'}
                  {challenge.challenge_type === 'logging' && challenge.category === 'count' && ' 筆'}
                  {challenge.challenge_type === 'exploration' && ' 個'}
                </span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
              <div className="text-xs text-muted-foreground text-right">
                {progress.toFixed(0)}% 完成
              </div>
            </div>

            {uc.status === 'active' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {remainingDays > 0
                    ? `還剩 ${remainingDays} 天`
                    : '即將結束'}
                </span>
              </div>
            )}

            {uc.status === 'completed' && uc.completed_at && (
              <div className="text-sm text-green-400">
                🎉 完成於 {new Date(uc.completed_at).toLocaleDateString('zh-TW')}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');
  const failedChallenges = challenges.filter(c => c.status === 'failed');

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 border-b">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">我的挑戰</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">追蹤你的挑戰進度，持續提升財務管理能力</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mt-6"
        >
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold">{activeChallenges.length}</div>
              <div className="text-xs text-muted-foreground">進行中</div>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold">{completedChallenges.length}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4 text-center">
              <Target className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{challenges.length}</div>
              <div className="text-xs text-muted-foreground">總挑戰</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-6">
        {challenges.length === 0 ? (
          <div className="space-y-6">
            <Card className="glass-card border-2 border-dashed border-primary/30">
              <CardContent className="p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">還沒有參加任何挑戰</h3>
                <p className="text-muted-foreground mb-6">
                  從下方選擇你感興趣的挑戰開始吧！
                </p>
              </CardContent>
            </Card>

            {/* Available Challenges */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                探索挑戰
              </h2>
              {availableChallenges.map((challenge) => (
                <Card key={challenge.id} className="glass-card border-primary/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClass(challenge.color)} shadow-lg`}>
                          {getIcon(challenge.icon)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          <CardDescription className="mt-1">{challenge.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full"
                    >
                      加入挑戰
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="active" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">
                  進行中 ({activeChallenges.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  已完成 ({completedChallenges.length})
                </TabsTrigger>
                <TabsTrigger value="failed">
                  已失敗 ({failedChallenges.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {activeChallenges.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      沒有進行中的挑戰
                    </CardContent>
                  </Card>
                ) : (
                  activeChallenges.map(renderChallengeCard)
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {completedChallenges.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      還沒有完成的挑戰，繼續加油！
                    </CardContent>
                  </Card>
                ) : (
                  completedChallenges.map(renderChallengeCard)
                )}
              </TabsContent>

              <TabsContent value="failed" className="space-y-4">
                {failedChallenges.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      沒有失敗的挑戰
                    </CardContent>
                  </Card>
                ) : (
                  failedChallenges.map(renderChallengeCard)
                )}
              </TabsContent>
            </Tabs>

            {/* Available Challenges Section */}
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                探索更多挑戰
              </h2>
              {availableChallenges
                .filter(ac => !challenges.some(uc => uc.challenge_id === ac.id && uc.status === 'active'))
                .map((challenge) => (
                <Card key={challenge.id} className="glass-card border-primary/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClass(challenge.color)} shadow-lg`}>
                          {getIcon(challenge.icon)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{challenge.title}</CardTitle>
                          <CardDescription className="mt-1">{challenge.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full"
                    >
                      加入挑戰
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyChallenges;
