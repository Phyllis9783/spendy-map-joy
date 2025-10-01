import { Trophy, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Community = () => {
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground px-6 py-8">
        <h1 className="text-3xl font-bold">社群</h1>
        <p className="text-sm opacity-90 mt-2">
          和朋友一起培養理財習慣
        </p>
      </header>

      {/* Tabs */}
      <div className="px-6 -mt-6">
        <Tabs defaultValue="challenges" className="w-full">
          <TabsList className="w-full bg-card shadow-soft">
            <TabsTrigger value="challenges" className="flex-1">挑戰</TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1">排行榜</TabsTrigger>
            <TabsTrigger value="shares" className="flex-1">分享</TabsTrigger>
          </TabsList>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-4 mt-6">
            <Card className="p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">一週外食控制挑戰</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    一週外食少於 1000 元
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-gradient-primary h-2 rounded-full" style={{ width: '0%' }} />
                    </div>
                    <span className="text-sm font-medium">0/1000</span>
                  </div>
                  <Button className="w-full mt-4 bg-gradient-primary">
                    參加挑戰
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">咖啡節制月</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    一個月咖啡花費少於 1500 元
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-gradient-secondary h-2 rounded-full" style={{ width: '0%' }} />
                    </div>
                    <span className="text-sm font-medium">0/1500</span>
                  </div>
                  <Button variant="secondary" className="w-full mt-4">
                    參加挑戰
                  </Button>
                </div>
              </div>
            </Card>
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
