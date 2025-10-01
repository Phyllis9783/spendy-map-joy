import { User, Settings, Database, TrendingUp, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Profile = () => {
  return (
    <div className="min-h-screen pb-20 bg-gradient-hero">
      {/* Header */}
      <header className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">訪客</h1>
            <p className="text-sm text-muted-foreground">guest@spendy.map</p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-6 space-y-4">
        <Card className="p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">本月總消費</p>
              <p className="text-3xl font-bold mt-1">NT$ 0</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">累積徽章</p>
              <p className="text-3xl font-bold mt-1">0</p>
            </div>
            <Award className="w-8 h-8 text-secondary" />
          </div>
        </Card>
      </div>

      {/* Menu */}
      <div className="px-6 mt-8 space-y-2">
        <Button variant="ghost" className="w-full justify-start h-14">
          <Settings className="w-5 h-5 mr-3" />
          <span>設定</span>
        </Button>

        <Button variant="ghost" className="w-full justify-start h-14">
          <Database className="w-5 h-5 mr-3" />
          <span>資料匯出</span>
        </Button>

        <Button variant="ghost" className="w-full justify-start h-14 text-destructive hover:text-destructive">
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
