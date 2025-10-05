import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrency } from "@/lib/currency";

interface Expense {
  amount: number;
  category: string;
  expense_date: string;
}

interface ConsumptionDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
}

const COLORS = {
  food: 'hsl(var(--category-food))',
  transport: 'hsl(var(--category-transport))',
  entertainment: 'hsl(var(--category-entertainment))',
  shopping: 'hsl(var(--category-shopping))',
  daily: 'hsl(var(--category-daily))',
  coffee: 'hsl(var(--primary))',
};

const ConsumptionDashboard = ({ open, onOpenChange, expenses }: ConsumptionDashboardProps) => {
  const { currency } = useCurrency();

  // Calculate daily consumption for last 7 days
  const getDailyData = () => {
    const dailyMap = new Map<string, number>();
    
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateKey = format(date, 'MM/dd', { locale: zhTW });
      dailyMap.set(dateKey, 0);
    }

    expenses.forEach(exp => {
      const expDate = new Date(exp.expense_date);
      const dateKey = format(expDate, 'MM/dd', { locale: zhTW });
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, dailyMap.get(dateKey)! + Number(exp.amount));
      }
    });

    return Array.from(dailyMap.entries()).map(([date, amount]) => ({
      date,
      金額: Math.round(amount),
    }));
  };

  // Calculate category breakdown
  const getCategoryData = () => {
    const categoryMap = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>);

    const names: Record<string, string> = {
      food: '飲食',
      transport: '交通',
      entertainment: '娛樂',
      shopping: '購物',
      daily: '日用',
      coffee: '咖啡',
    };

    return Object.entries(categoryMap).map(([category, amount]) => ({
      name: names[category] || category,
      value: Math.round(amount),
      category,
    }));
  };

  const dailyData = getDailyData();
  const categoryData = getCategoryData();
  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            消費儀表板
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Amount Card */}
          <Card className="glass-card border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">最近 30 天</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(totalAmount, currency)}
                </p>
                <p className="text-xs text-muted-foreground">總消費金額</p>
              </div>
            </CardContent>
          </Card>

          {/* Charts Tabs */}
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">每日趨勢</TabsTrigger>
              <TabsTrigger value="category">分類分布</TabsTrigger>
            </TabsList>

            {/* Daily Chart */}
            <TabsContent value="daily" className="space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    近 7 日消費趨勢
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      />
                      <Bar 
                        dataKey="金額" 
                        fill="url(#colorGradient)"
                        radius={[8, 8, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Category Pie Chart */}
            <TabsContent value="category" className="space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-secondary" />
                    分類別消費分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.category as keyof typeof COLORS] || COLORS.daily} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Category List */}
                  <div className="mt-4 space-y-2">
                    {categoryData.map((item) => (
                      <div key={item.category} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[item.category as keyof typeof COLORS] || COLORS.daily }}
                          />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(item.value, currency)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-primary">
                  {expenses.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">筆消費</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold text-secondary">
                  {categoryData.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">個分類</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsumptionDashboard;
