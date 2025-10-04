import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Clock, DollarSign, Tag, Calendar } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrency } from "@/lib/currency";

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

interface ExpenseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
}

const ExpenseDetailDialog = ({ open, onOpenChange, expense }: ExpenseDetailDialogProps) => {
  const { currency } = useCurrency();
  
  if (!expense) return null;

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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: 'hsl(var(--category-food))',
      transport: 'hsl(var(--category-transport))',
      entertainment: 'hsl(var(--category-entertainment))',
      shopping: 'hsl(var(--category-shopping))',
      daily: 'hsl(var(--category-daily))',
    };
    return colors[category] || 'hsl(var(--primary))';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getCategoryEmoji(expense.category)}</span>
            消費詳情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Card */}
          <Card className="glass-card border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <DollarSign className="w-10 h-10 mx-auto text-primary" />
                <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {formatCurrency(expense.amount, currency)}
                </p>
                <p className="text-sm text-muted-foreground">消費金額</p>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <div className="space-y-3">
            {/* Description */}
            {expense.description && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">說明</p>
                    <p className="font-medium">{expense.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Category */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getCategoryColor(expense.category) }}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">分類</p>
                  <p className="font-medium">{getCategoryName(expense.category)}</p>
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-secondary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">日期時間</p>
                  <p className="font-medium">
                    {format(new Date(expense.expense_date), 'yyyy年MM月dd日 HH:mm', { locale: zhTW })}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            {expense.location_name && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">地點</p>
                    <p className="font-medium">{expense.location_name}</p>
                    {expense.location_lat && expense.location_lng && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {expense.location_lat.toFixed(4)}, {expense.location_lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDetailDialog;
