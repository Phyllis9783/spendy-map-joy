import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Home, Map, User, Download, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startPage, setStartPage] = useState<string>('/');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const savedStartPage = localStorage.getItem('startPage') || '/';
    setStartPage(savedStartPage);
  }, []);

  const handleStartPageChange = (value: string) => {
    setStartPage(value);
    localStorage.setItem('startPage', value);
    toast.success('預設起始頁已更新');
  };

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = ['日期', '類別', '金額', '描述', '地點', '幣別'];
      const csvRows = [headers.join(',')];
      
      expenses?.forEach(expense => {
        const row = [
          new Date(expense.expense_date).toLocaleDateString('zh-TW'),
          expense.category,
          expense.amount,
          expense.description || '',
          expense.location_name || '',
          expense.currency || 'TWD'
        ];
        csvRows.push(row.map(cell => `"${cell}"`).join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `消費記錄_${new Date().toLocaleDateString('zh-TW')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('資料已成功匯出');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('匯出失敗，請稍後再試');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('確定要清除本地快取並重新載入嗎？這將登出您的帳號。')) {
      localStorage.clear();
      sessionStorage.clear();
      navigate('/auth', { replace: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">設定</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Setting */}
          <div className="space-y-2">
            <Label className="text-base font-medium">主題外觀</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => setTheme('light')}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs">淺色</span>
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs">深色</span>
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => setTheme('system')}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-xs">系統</span>
              </Button>
            </div>
          </div>

          {/* Start Page Setting */}
          <div className="space-y-2">
            <Label htmlFor="start-page" className="text-base font-medium">
              預設起始頁
            </Label>
            <Select value={startPage} onValueChange={handleStartPageChange}>
              <SelectTrigger id="start-page" className="glass-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    <span>首頁</span>
                  </div>
                </SelectItem>
                <SelectItem value="/map">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    <span>地圖</span>
                  </div>
                </SelectItem>
                <SelectItem value="/profile">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>個人資料</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Export */}
          <div className="space-y-2">
            <Label className="text-base font-medium">資料管理</Label>
            <Button
              variant="outline"
              className="w-full justify-start glass-card"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download className="w-5 h-5 mr-3" />
              {isExporting ? '匯出中...' : '匯出消費記錄 (CSV)'}
            </Button>
          </div>

          {/* Clear Cache */}
          <div className="space-y-2">
            <Label className="text-base font-medium">進階</Label>
            <Button
              variant="outline"
              className="w-full justify-start glass-card text-destructive hover:text-destructive"
              onClick={handleClearCache}
            >
              <Trash2 className="w-5 h-5 mr-3" />
              清除本地快取
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
