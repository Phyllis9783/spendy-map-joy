import { useState } from "react";
import { Mic, TrendingUp, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Home = () => {
  const [isRecording, setIsRecording] = useState(false);

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-20">
      {/* Header */}
      <header className="pt-8 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Spendy Map
          </h1>
          <p className="text-muted-foreground mt-2">
            把消費變成有趣的冒險 🗺️
          </p>
        </div>
      </header>

      {/* Voice Input Button */}
      <div className="flex justify-center mt-12 px-6">
        <Button
          onClick={handleVoiceInput}
          size="lg"
          className={`
            relative w-32 h-32 rounded-full shadow-glow
            transition-smooth hover:scale-105 active:scale-95
            ${isRecording ? 'bg-destructive hover:bg-destructive/90 animate-pulse-slow' : 'bg-gradient-primary'}
          `}
        >
          <Mic className="w-12 h-12" />
          {isRecording && (
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-medium whitespace-nowrap">
              正在聆聽...
            </span>
          )}
        </Button>
      </div>

      <p className="text-center text-muted-foreground mt-16 px-6">
        點擊麥克風開始記帳
      </p>

      {/* Quick Stats */}
      <div className="max-w-4xl mx-auto px-6 mt-12 grid grid-cols-3 gap-4">
        <Card className="p-4 text-center shadow-soft hover:shadow-medium transition-smooth">
          <TrendingUp className="w-6 h-6 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-muted-foreground mt-1">本月消費</p>
        </Card>
        
        <Card className="p-4 text-center shadow-soft hover:shadow-medium transition-smooth">
          <MapPin className="w-6 h-6 mx-auto text-secondary mb-2" />
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-muted-foreground mt-1">消費地點</p>
        </Card>
        
        <Card className="p-4 text-center shadow-soft hover:shadow-medium transition-smooth">
          <Users className="w-6 h-6 mx-auto text-accent mb-2" />
          <p className="text-2xl font-bold">0</p>
          <p className="text-xs text-muted-foreground mt-1">朋友分享</p>
        </Card>
      </div>

      {/* Recent Expenses */}
      <div className="max-w-4xl mx-auto px-6 mt-12">
        <h2 className="text-xl font-semibold mb-4">最近消費</h2>
        <div className="text-center py-12 text-muted-foreground">
          <p>還沒有消費記錄</p>
          <p className="text-sm mt-2">使用語音輸入開始記帳吧！</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
