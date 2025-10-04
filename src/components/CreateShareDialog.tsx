import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Facebook, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrency } from "@/lib/currency";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  location_name: string | null;
}

interface CreateShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSuccess?: () => void;
}

const CreateShareDialog = ({ open, onOpenChange, expense }: CreateShareDialogProps) => {
  const [shareText, setShareText] = useState("");
  const { toast } = useToast();
  const { currency } = useCurrency();

  const getCategoryEmoji = (category: string) => {
    const emojis: { [key: string]: string } = {
      food: '🍽️',
      transport: '🚗',
      entertainment: '🎬',
      shopping: '🛍️',
      daily: '🏠',
      coffee: '☕'
    };
    return emojis[category] || '💰';
  };

  const generateShareText = () => {
    if (!expense) return "";
    const emoji = getCategoryEmoji(expense.category);
    const location = expense.location_name ? ` 在${expense.location_name}` : '';
    const formattedAmount = formatCurrency(expense.amount, currency);
    return `${emoji} 今天${location}花了 ${formattedAmount}\n📝 ${expense.description}\n💡 使用 Spendy Map 記帳，輕鬆管理每一筆消費！`;
  };

  const handleOpen = () => {
    if (expense) {
      setShareText(generateShareText());
    }
  };

  const shareToFacebook = () => {
    const text = shareText || generateShareText();
    const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
    toast({
      title: "已開啟 Facebook 分享",
      description: "請在新視窗中完成分享",
    });
  };

  const shareToLine = () => {
    const text = shareText || generateShareText();
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast({
      title: "已開啟 LINE 分享",
      description: "請在新視窗中完成分享",
    });
  };

  const copyToClipboard = async () => {
    const text = shareText || generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✅ 已複製到剪貼簿",
        description: "可以直接貼到 Instagram 或其他平台",
      });
    } catch (error) {
      toast({
        title: "複製失敗",
        description: "請手動複製文字",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (isOpen) handleOpen();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            分享消費記錄
          </DialogTitle>
          <DialogDescription>
            選擇分享平台或複製文字
          </DialogDescription>
        </DialogHeader>

        {expense && (
          <div className="space-y-4">
            {/* Expense Preview */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-lg space-y-2 border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">金額</span>
                <span className="font-bold text-2xl text-primary">
                  {formatCurrency(expense.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">描述</span>
                <span className="text-sm font-medium">{expense.description}</span>
              </div>
              {expense.location_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">地點</span>
                  <span className="text-sm font-medium">{expense.location_name}</span>
                </div>
              )}
            </div>

            {/* Share Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium">分享文字（可編輯）</label>
              <Textarea
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
                className="min-h-[100px] resize-none"
                placeholder="編輯您的分享內容..."
              />
            </div>

            {/* Share Buttons */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">選擇分享平台：</p>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={shareToFacebook}
                  className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                  size="lg"
                >
                  <Facebook className="w-5 h-5 mr-2" fill="currentColor" />
                  分享到 Facebook
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={shareToLine}
                  className="w-full bg-[#06C755] hover:bg-[#06C755]/90 text-white"
                  size="lg"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  分享到 LINE
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  複製文字（Instagram / 其他）
                </Button>
              </motion.div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              💡 提示：Instagram 需要先複製文字，再到 App 中貼上發布
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateShareDialog;
