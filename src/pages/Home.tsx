import { useEffect, useState } from "react";
import { TrendingUp, MapPin, Users, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import VoiceInput from "@/components/VoiceInput";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  location_name: string | null;
  expense_date: string;
}

const Home = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    locationCount: 0,
    shareCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      setExpenses(data || []);

      // Calculate stats
      if (data) {
        const total = data.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const locations = new Set(data.map(exp => exp.location_name).filter(Boolean));
        
        setStats({
          totalAmount: total,
          locationCount: locations.size,
          shareCount: 0, // TODO: Fetch from shares table
        });
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const getCategoryEmoji = (category: string) => {
    const emojis: { [key: string]: string } = {
      food: '🍽️',
      transport: '🚗',
      entertainment: '🎬',
      shopping: '🛍️',
      daily: '🏠',
      coffee: '☕',
    };
    return emojis[category] || '💰';
  };

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      food: '飲食',
      transport: '交通',
      entertainment: '娛樂',
      shopping: '購物',
      daily: '日用',
      coffee: '咖啡',
    };
    return names[category] || category;
  };

  return (
    <div className="min-h-screen bg-gradient-hero bg-mesh pb-20">
      {/* Header */}
      <header className="pt-8 px-6 animate-fade-in">
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
      <div className="flex justify-center mt-12 px-6 animate-scale-in">
        <VoiceInput onExpenseCreated={fetchExpenses} />
      </div>

      {/* Quick Stats */}
      <div className="max-w-4xl mx-auto px-6 mt-12 grid grid-cols-3 gap-4 animate-slide-up">
        <Card className="p-4 text-center glass-card shadow-md interactive-lift">
          <TrendingUp className="w-6 h-6 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">
            {loading ? '...' : Math.round(stats.totalAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">本月消費</p>
        </Card>
        
        <Card className="p-4 text-center glass-card shadow-md interactive-lift">
          <MapPin className="w-6 h-6 mx-auto text-secondary mb-2" />
          <p className="text-2xl font-bold">
            {loading ? '...' : stats.locationCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">消費地點</p>
        </Card>
        
        <Card className="p-4 text-center glass-card shadow-md interactive-lift">
          <Users className="w-6 h-6 mx-auto text-accent mb-2" />
          <p className="text-2xl font-bold">
            {loading ? '...' : stats.shareCount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">朋友分享</p>
        </Card>
      </div>

      {/* Recent Expenses */}
      <div className="max-w-4xl mx-auto px-6 mt-12 animate-fade-in">
        <h2 className="text-xl font-semibold mb-4">最近消費</h2>
        
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>載入中...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>還沒有消費記錄</p>
            <p className="text-sm mt-2">使用語音輸入開始記帳吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense, index) => (
              <Card
                key={expense.id}
                className="p-4 glass-card shadow-sm interactive-lift"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">
                      {getCategoryEmoji(expense.category)}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {expense.description || getCategoryName(expense.category)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {expense.location_name && (
                          <>
                            <MapPin className="w-3 h-3" />
                            <span>{expense.location_name}</span>
                          </>
                        )}
                        <Clock className="w-3 h-3 ml-2" />
                        <span>
                          {format(new Date(expense.expense_date), 'MM/dd HH:mm', { locale: zhTW })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-destructive">
                      ${expense.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">TWD</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
