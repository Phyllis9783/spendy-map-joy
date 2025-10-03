import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SharePrivacyWarning } from "./SharePrivacyWarning";
import { Share2 } from "lucide-react";

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

const CreateShareDialog = ({ open, onOpenChange, expense, onSuccess }: CreateShareDialogProps) => {
  const [shareText, setShareText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    if (!expense) return;
    if (!shareText.trim()) {
      toast({
        title: "請輸入分享內容",
        variant: "destructive",
      });
      return;
    }
    if (shareText.length > 500) {
      toast({
        title: "內容過長",
        description: "分享內容不得超過 500 字",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("shares").insert({
        user_id: user.id,
        expense_id: expense.id,
        share_text: shareText.trim(),
        is_public: isPublic,
      });

      if (error) throw error;

      toast({
        title: "分享成功！",
        description: isPublic ? "您的分享已發布到社群" : "分享已保存為私人",
      });

      setShareText("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating share:", error);
      toast({
        title: "分享失敗",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            分享消費記錄
          </DialogTitle>
          <DialogDescription>
            分享您的消費心得給社群
          </DialogDescription>
        </DialogHeader>

        {expense && (
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">金額</span>
              <span className="font-semibold">${expense.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">描述</span>
              <span className="text-sm">{expense.description}</span>
            </div>
            {expense.location_name && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">地點</span>
                <span className="text-sm">{expense.location_name}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <Textarea
            placeholder="分享您的消費心得... (最多 500 字)"
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {shareText.length} / 500
          </div>

          <SharePrivacyWarning
            isPublic={isPublic}
            onPublicChange={setIsPublic}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              取消
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1"
              disabled={loading}
            >
              {loading ? "分享中..." : "分享"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateShareDialog;
