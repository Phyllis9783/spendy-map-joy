import { Trophy, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { trackAllChallenges } from "@/lib/challengeTracker";
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChallenges();
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
            <div className="text-center py-12 text-muted-foreground">
              <p>還沒有分享</p>
              <p className="text-sm mt-2">分享你的消費記錄給朋友吧</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Community;
