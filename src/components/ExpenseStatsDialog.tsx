import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Calendar, PieChart } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrency } from "@/lib/currency";

interface Expense {
  amount: number;
  category: string;
  expense_date: string;
}

interface ExpenseStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  totalAmount: number;
  dateRange: string;
}

const ExpenseStatsDialog = ({ open, onOpenChange, expenses, totalAmount, dateRange }: ExpenseStatsDialogProps) => {
  const { currency } = useCurrency();
  
  // Calculate category stats
  const categoryStats = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            消費統計詳情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total Amount */}
          <Card className="glass-card border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">{dateRange}</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(totalAmount, currency)}
                </p>
                <p className="text-xs text-muted-foreground">總消費金額</p>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-secondary" />
              分類別消費
            </h3>
            <div className="space-y-2">
              {sortedCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暫無數據
                </p>
              ) : (
                sortedCategories.map(([category, amount]) => {
                  const percentage = ((amount / totalAmount) * 100).toFixed(1);
                  return (
                    <div
                      key={category}
                      className="bg-muted/30 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {getCategoryEmoji(category)}
                          </span>
                          <span className="font-medium text-sm">
                            {getCategoryName(category)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(amount, currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            {percentage}%
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Transaction Count */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary">
                  {expenses.length}
                </p>
                <p className="text-sm text-muted-foreground">筆消費記錄</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseStatsDialog;
