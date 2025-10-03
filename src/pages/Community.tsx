import { Trophy, Target, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { trackAllChallenges } from "@/lib/challengeTracker";
import ShareCard from "@/components/ShareCard";
import { Skeleton } from "@/components/ui/skeleton";
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
  current_amount: number;
  status: string;
  started_at: string;
}

interface ChallengeWithUserData extends Challenge {
  userChallenge?: UserChallenge;
}

const Community = () => {
  const [challenges, setChallenges] = useState<ChallengeWithUserData[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharesLoading, setSharesLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChallenges();
    fetchShares();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch all active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true);

      if (challengesError) throw challengesError;

      // If user is logged in, fetch their challenge participation
      if (user) {
        await trackAllChallenges(user.id);
        
        const { data: userChallengesData, error: userChallengesError } = await supabase
          .from('user_challenges')
          .select('*')
          .eq('user_id', user.id);

        if (userChallengesError) throw userChallengesError;

        // Merge challenges with user participation data
        const mergedData = challengesData?.map(challenge => {
          const userChallenge = userChallengesData?.find(uc => uc.challenge_id === challenge.id);
          return {
            ...challenge,
            userChallenge
          };
        }) || [];

        setChallenges(mergedData);
      } else {
        setChallenges(challengesData || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShares = async () => {
    try {
      setSharesLoading(true);
      // 1) Fetch public shares first (no embeddings to avoid FK requirements)
      const { data: sharesData, error: sharesError } = await supabase
        .from('shares')
        .select('id, user_id, expense_id, share_text, likes_count, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (sharesError) throw sharesError;
      if (!sharesData || sharesData.length === 0) {
        setShares([]);
        return;
      }

      // 2) Batch fetch related expenses and profiles
      const expenseIds = Array.from(new Set(
        sharesData.filter(s => !!s.expense_id).map(s => s.expense_id as string)
      ));
      const userIds = Array.from(new Set(sharesData.map(s => s.user_id)));

      const expensesPromise =
        expenseIds.length > 0
          ? supabase
              .from('expenses')
              .select('id, amount, category, description, location_name, location_lat, location_lng')
              .in('id', expenseIds)
          : Promise.resolve({ data: [] });

      const profilesPromise =
        userIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', userIds)
          : Promise.resolve({ data: [] });

      const [expensesRes, profilesRes] = await Promise.all([
        expensesPromise as any,
        profilesPromise as any,
      ]);

      const expensesData = (expensesRes?.data || []) as Array<any>;
      const profilesData = (profilesRes?.data || []) as Array<any>;

      const expenseMap = new Map<string, any>(
        expensesData.map((e: any) => [e.id, e])
      );
      const profileMap = new Map<string, any>(
        profilesData.map((p: any) => [p.id, p])
      );

      // 3) Merge
      const merged = sharesData.map((s: any) => ({
        ...s,
        expenses: s.expense_id ? expenseMap.get(s.expense_id) || null : null,
        profiles: profileMap.get(s.user_id) || null,
      }));

      setShares(merged);
    } catch (error) {
      console.error('Error fetching shares:', error);
      toast({
        title: '載入失敗',
        description: '無法載入分享內容',
        variant: 'destructive',
      });
    } finally {
      setSharesLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          current_amount: 0,
          status: 'active',
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "已參加此挑戰",
            description: "您已經參加過這個挑戰了",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "參加成功！",
        description: "加油，一起完成挑戰吧！",
      });
      
      fetchChallenges();
    } catch (error: any) {
      console.error('Error joining challenge:', error);
      toast({
        title: "參加失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Target;
    return <Icon className="w-6 h-6 text-white" />;
  };

  const getGradientClass = (color: string) => {
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

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground px-6 py-8 shadow-lg">
        <h1 className="text-3xl font-bold">社群</h1>
        <p className="text-sm opacity-90 mt-2">
          和朋友一起培養理財習慣
        </p>
      </header>

      {/* Tabs */}
      <div className="px-6 -mt-6">
        <Tabs defaultValue="challenges" className="w-full">
          <TabsList className="w-full glass-card shadow-md">
            <TabsTrigger value="challenges" className="flex-1">挑戰</TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1">排行榜</TabsTrigger>
            <TabsTrigger value="shares" className="flex-1">分享</TabsTrigger>
          </TabsList>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-4 mt-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>載入中...</p>
              </div>
            ) : challenges.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>目前沒有可用的挑戰</p>
              </div>
            ) : (
              challenges.map((challenge, index) => {
                const progress = challenge.userChallenge 
                  ? (challenge.userChallenge.current_amount / challenge.target_amount) * 100 
                  : 0;
                const isJoined = !!challenge.userChallenge;
                const isCompleted = challenge.userChallenge?.status === 'completed';

                return (
                  <Card
                    key={challenge.id}
                    className="p-6 glass-card shadow-md interactive-lift animate-scale-in border-2 border-primary/20"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${getGradientClass(challenge.color)} rounded-xl flex items-center justify-center shadow-glow flex-shrink-0`}>
                        {getIcon(challenge.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg">{challenge.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {challenge.description}
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">進度</span>
                            <span className="font-medium">
                              {challenge.userChallenge?.current_amount || 0} / {challenge.target_amount}
                            </span>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                        </div>
                        <Button
                          onClick={() => {
                            if (isJoined) {
                              navigate('/my-challenges');
                            } else {
                              joinChallenge(challenge.id);
                            }
                          }}
                          className={`w-full mt-4 ${isCompleted ? 'bg-green-500 hover:bg-green-600' : `bg-gradient-to-r ${getGradientClass(challenge.color)}`} text-white font-semibold shadow-lg`}
                          disabled={isCompleted}
                        >
                          {isCompleted ? '已完成 ✓' : isJoined ? '查看進度' : '參加挑戰'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>排行榜即將推出</p>
              <p className="text-sm mt-2">開始記帳後可以參加排名</p>
            </div>
          </TabsContent>

          {/* Shares Tab */}
          <TabsContent value="shares" className="mt-6">
            {sharesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 glass-card">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>還沒有分享</p>
                <p className="text-sm mt-2">成為第一個分享消費心得的人吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {shares.map((share) => (
                  <ShareCard key={share.id} share={share} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Community;
