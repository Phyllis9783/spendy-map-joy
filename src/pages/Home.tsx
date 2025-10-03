import { useEffect, useState } from "react";
import { TrendingUp, MapPin, Users, Clock, Trash2, Edit2, DollarSign, Calendar, Share2, Map as MapIcon, Trophy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import VoiceInput from "@/components/VoiceInput";
import EditExpenseDialog from "@/components/EditExpenseDialog";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Skeleton } from "@/components/ui/skeleton";
import { trackAllChallenges } from "@/lib/challengeTracker";
interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  location_name: string | null;
  expense_date: string;
  location_lat: number | null;
  location_lng: number | null;
}
const Home = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    locationCount: 0,
    shareCount: 0
  });
  const [challengeStats, setChallengeStats] = useState({
    active: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const fetchExpenses = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('expenses').select('*').order('expense_date', {
        ascending: false
      }).limit(5);
      if (error) throw error;
      setExpenses(data || []);
      if (data) {
        const total = data.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const locations = new Set(data.map(exp => exp.location_name).filter(Boolean));
        setStats({
          totalAmount: total,
          locationCount: locations.size,
          shareCount: 0
        });
      }

      // Fetch challenge stats
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        await trackAllChallenges(user.id);
        const {
          data: challengesData
        } = await supabase.from('user_challenges').select('status').eq('user_id', user.id);
        if (challengesData) {
          const active = challengesData.filter(c => c.status === 'active').length;
          const completed = challengesData.filter(c => c.status === 'completed').length;
          setChallengeStats({
            active,
            completed
          });
        }
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "載入失敗",
        description: "無法載入消費記錄",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = async (expenseId: string, updatedData: Partial<Expense>) => {
    try {
      const {
        error
      } = await supabase.from('expenses').update(updatedData).eq('id', expenseId);
      if (error) throw error;
      toast({
        title: "修改成功",
        description: "消費記錄已更新"
      });

      // Track challenges after editing expense
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        await trackAllChallenges(user.id);
      }
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "修改失敗",
        description: "無法更新消費記錄，請重試",
        variant: "destructive"
      });
      throw error;
    }
  };
  const handleDelete = async (expenseId: string) => {
    setDeletingId(expenseId);
    try {
      const {
        error
      } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      toast({
        title: "刪除成功",
        description: "消費記錄已刪除"
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "刪除失敗",
        description: "無法刪除消費記錄，請重試",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };
  useEffect(() => {
    fetchExpenses();
  }, []);
  const getCategoryEmoji = (category: string) => {
    const emojis: {
      [key: string]: string;
    } = {
      food: '🍽️',
      transport: '🚗',
      entertainment: '🎬',
      shopping: '🛍️',
      daily: '🏠',
      coffee: '☕'
    };
    return emojis[category] || '💰';
  };
  const getCategoryName = (category: string) => {
    const names: {
      [key: string]: string;
    } = {
      food: '飲食',
      transport: '交通',
      entertainment: '娛樂',
      shopping: '購物',
      daily: '日用',
      coffee: '咖啡'
    };
    return names[category] || category;
  };
  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      food: "bg-gradient-food",
      transport: "bg-gradient-transport",
      entertainment: "bg-gradient-entertainment",
      shopping: "bg-gradient-shopping",
      daily: "bg-gradient-daily"
    };
    return gradients[category] || "bg-gradient-primary";
  };
  return <div className="min-h-screen bg-gradient-hero bg-mesh pb-24">
      {/* Header */}
      <motion.header className="pt-8 px-6" initial={{
      opacity: 0,
      y: -20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6
    }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-float">
            Spendy Map
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            ✨ 記錄每一筆消費，探索你的消費地圖
          </p>
        </div>
      </motion.header>

      {/* Voice Input Button */}
      <motion.div className="flex justify-center mt-12 px-6" initial={{
      opacity: 0,
      scale: 0.9
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      duration: 0.5,
      delay: 0.2
    }}>
        <VoiceInput onExpenseCreated={fetchExpenses} />
      </motion.div>

      {/* Quick Stats */}
      <motion.div className="max-w-4xl mx-auto px-6 mt-12 grid grid-cols-3 gap-4" initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      delay: 0.3
    }}>
        <motion.div whileHover={{
        scale: 1.05,
        y: -5
      }} transition={{
        type: "spring",
        stiffness: 300
      }}>
          <Card className="glass-card border-primary/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <motion.div animate={{
                rotate: [0, 10, -10, 0]
              }} transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}>
                  <TrendingUp className="w-8 h-8 mx-auto text-primary" />
                </motion.div>
                <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  $<CountUp end={stats.totalAmount} duration={1.5} />
                </p>
                <p className="text-xs text-muted-foreground font-medium">總消費金額</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{
        scale: 1.05,
        y: -5
      }} transition={{
        type: "spring",
        stiffness: 300
      }}>
          <Card className="glass-card border-secondary/20 shadow-lg cursor-pointer hover:border-secondary/40 transition-colors" onClick={() => navigate("/map", {
          state: {
            autoExplore: true
          }
        })}>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <motion.div animate={{
                y: [0, -5, 0]
              }} transition={{
                duration: 2,
                repeat: Infinity
              }}>
                  <MapIcon className="w-8 h-8 mx-auto text-secondary" />
                </motion.div>
                <p className="text-3xl font-bold text-secondary">
                  <CountUp end={stats.locationCount} duration={1.5} />
                </p>
                <p className="text-xs text-muted-foreground font-medium">探索地點</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{
        scale: 1.05,
        y: -5
      }} transition={{
        type: "spring",
        stiffness: 300
      }}>
          <Card className="glass-card border-accent/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <motion.div animate={{
                scale: [1, 1.1, 1]
              }} transition={{
                duration: 2,
                repeat: Infinity
              }}>
                  <Share2 className="w-8 h-8 mx-auto text-accent" />
                </motion.div>
                <p className="text-3xl font-bold text-accent">
                  <CountUp end={stats.shareCount} duration={1.5} />
                </p>
                <p className="text-xs text-muted-foreground font-medium">分享次數</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Challenge Progress Card */}
      <motion.div className="max-w-4xl mx-auto px-6 mt-6" initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      delay: 0.4
    }}>
        <motion.div whileHover={{
        scale: 1.02,
        y: -3
      }} transition={{
        type: "spring",
        stiffness: 300
      }}>
          <Card className="glass-card border-2 border-primary/30 shadow-xl cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/my-challenges")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <motion.div animate={{
                rotate: [0, 10, -10, 0]
              }} transition={{
                duration: 3,
                repeat: Infinity
              }} className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                  <Trophy className="w-8 h-8 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">挑戰進度</h3>
                  <p className="text-sm text-muted-foreground">點擊查看你的挑戰成就</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{challengeStats.active}</p>
                      <p className="text-xs text-muted-foreground">進行中</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-400">{challengeStats.completed}</p>
                      <p className="text-xs text-muted-foreground">已完成</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent Expenses */}
      <motion.div className="max-w-4xl mx-auto px-6 mt-12 space-y-4" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      duration: 0.6,
      delay: 0.5
    }}>
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          最近消費記錄
        </h2>
        
        {loading ? <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="glass-card">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </CardContent>
              </Card>)}
          </div> : expenses.length === 0 ? <Card className="glass-card border-dashed border-2 border-primary/30">
            <CardContent className="py-12 text-center">
              <motion.div animate={{
            y: [0, -10, 0]
          }} transition={{
            duration: 2,
            repeat: Infinity
          }}>
                <DollarSign className="w-16 h-16 mx-auto text-primary/40 mb-4" />
              </motion.div>
              <p className="text-muted-foreground text-lg font-medium">尚無消費記錄</p>
              <p className="text-sm text-muted-foreground mt-2">🎤 使用語音輸入開始你的記帳冒險吧！</p>
            </CardContent>
          </Card> : expenses.map((expense, index) => <motion.div key={expense.id} initial={{
        opacity: 0,
        x: -20
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        duration: 0.4,
        delay: index * 0.1
      }} whileHover={{
        scale: 1.02,
        y: -2
      }}>
              <Card className={`glass-card hover:shadow-xl transition-all duration-300 border-l-4 relative overflow-hidden ${expense.category === 'food' ? 'border-l-[hsl(var(--category-food))]' : expense.category === 'transport' ? 'border-l-[hsl(var(--category-transport))]' : expense.category === 'entertainment' ? 'border-l-[hsl(var(--category-entertainment))]' : expense.category === 'shopping' ? 'border-l-[hsl(var(--category-shopping))]' : 'border-l-[hsl(var(--category-daily))]'}`}>
                {/* Decorative background gradient */}
                <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 ${getCategoryGradient(expense.category)}`} style={{
            borderRadius: '0 0 0 100%'
          }} />
                
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <motion.span className="text-3xl" whileHover={{
                  scale: 1.2,
                  rotate: 10
                }} transition={{
                  type: "spring",
                  stiffness: 300
                }}>
                        {getCategoryEmoji(expense.category)}
                      </motion.span>
                      <div>
                        <p className="text-lg font-semibold">{expense.description || getCategoryName(expense.category)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{
                      background: expense.category === 'food' ? 'hsl(var(--category-food))' : expense.category === 'transport' ? 'hsl(var(--category-transport))' : expense.category === 'entertainment' ? 'hsl(var(--category-entertainment))' : expense.category === 'shopping' ? 'hsl(var(--category-shopping))' : 'hsl(var(--category-daily))'
                    }} />
                          {getCategoryName(expense.category)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {expense.location_name && <motion.div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-2" whileHover={{
              backgroundColor: "hsl(var(--muted) / 0.5)"
            }}>
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{expense.location_name}</span>
                    </motion.div>}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-secondary" />
                    <span>
                      {format(new Date(expense.expense_date), 'MM/dd HH:mm', {
                  locale: zhTW
                })}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <EditExpenseDialog expense={expense} onSave={handleEdit} />
                    
                    {expense.location_lat && expense.location_lng && <Button variant="outline" size="sm" onClick={() => navigate("/map", {
                state: {
                  focusExpense: expense
                }
              })} className="flex-1 hover:bg-secondary/10 hover:border-secondary transition-all">
                        <MapPin className="w-4 h-4 mr-1" />
                        地圖
                      </Button>}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="hover:scale-105 transition-transform" disabled={deletingId === expense.id}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>確認刪除</AlertDialogTitle>
                          <AlertDialogDescription>
                            確定要刪除這筆消費記錄嗎？此操作無法復原。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(expense.id)} className="bg-destructive hover:bg-destructive/90">
                            刪除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>)}
      </motion.div>
    </div>;
};
export default Home;