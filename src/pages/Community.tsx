import { Trophy, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const Community = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setChallenges(data || []);
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
    } catch (error: any) {
      console.error('Error joining challenge:', error);
      toast({
        title: "參加失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getGradientClass = (color: string) => {
    const gradients: { [key: string]: string } = {
      primary: 'bg-gradient-primary',
      secondary: 'bg-gradient-secondary',
      accent: 'bg-gradient-primary',
      warning: 'bg-gradient-secondary',
    };
    return gradients[color] || 'bg-gradient-primary';
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
              challenges.map((challenge, index) => (
                <Card
                  key={challenge.id}
                  className="p-6 glass-card shadow-md interactive-lift animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${getGradientClass(challenge.color)} rounded-full flex items-center justify-center shadow-glow`}>
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{challenge.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {challenge.description}
                      </p>
                      <div className="flex items-center gap-2 mt-4">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div className={`${getGradientClass(challenge.color)} h-2 rounded-full`} style={{ width: '0%' }} />
                        </div>
                        <span className="text-sm font-medium">0/{challenge.target_amount}</span>
                      </div>
                      <Button
                        onClick={() => joinChallenge(challenge.id)}
                        className={`w-full mt-4 ${getGradientClass(challenge.color)} transition-smooth`}
                      >
                        參加挑戰
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
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
