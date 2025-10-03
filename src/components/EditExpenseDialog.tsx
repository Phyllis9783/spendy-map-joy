import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { logLocationAccess } from "@/lib/locationSecurity";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  location_name: string | null;
  expense_date: string;
}

interface EditExpenseDialogProps {
  expense: Expense;
  onSave: (expenseId: string, updatedData: Partial<Expense>) => Promise<void>;
}

const EditExpenseDialog = ({ expense, onSave }: EditExpenseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [category, setCategory] = useState(expense.category);
  const [description, setDescription] = useState(expense.description || "");
  const [locationName, setLocationName] = useState(expense.location_name || "");
  const [expenseDate, setExpenseDate] = useState(
    format(new Date(expense.expense_date), "yyyy-MM-dd'T'HH:mm")
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("請輸入有效的金額");
      return;
    }

    setSaving(true);
    try {
      // Check if expense has location data
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('location_lat, location_lng')
        .eq('id', expense.id)
        .single();
      
      // Log location access if expense has coordinates
      if (expenseData && expenseData.location_lat && expenseData.location_lng) {
        await logLocationAccess(expense.id, 'update');
      }
      
      await onSave(expense.id, {
        amount: parsedAmount,
        category,
        description: description.trim() || null,
        location_name: locationName.trim() || null,
        expense_date: new Date(expenseDate).toISOString(),
      });
      setOpen(false);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>編輯消費記錄</DialogTitle>
          <DialogDescription>
            修改消費記錄的詳細資料
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">金額 *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="輸入金額"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="category">分類 *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="選擇分類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">🍽️ 飲食</SelectItem>
                <SelectItem value="transport">🚗 交通</SelectItem>
                <SelectItem value="entertainment">🎬 娛樂</SelectItem>
                <SelectItem value="shopping">🛍️ 購物</SelectItem>
                <SelectItem value="daily">🏠 日用</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="簡短描述"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">地點</Label>
            <Input
              id="location"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="消費地點"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">日期時間 *</Label>
            <Input
              id="date"
              type="datetime-local"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseDialog;
