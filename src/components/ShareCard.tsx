import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MapPin, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { motion } from "framer-motion";

interface ShareCardProps {
  share: {
    id: string;
    share_text: string;
    likes_count: number;
    created_at: string;
    expenses: {
      amount: number;
      category: string;
      description: string;
      location_name: string | null;
      location_lat: number | null;
      location_lng: number | null;
    } | null;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  };
}

const ShareCard = ({ share }: ShareCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(share.likes_count);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkIfLiked();
  }, [share.id]);

  const checkIfLiked = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_share_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("share_id", share.id)
        .single();

      setLiked(!!data);
    } catch (error) {
      // User hasn't liked this share
    }
  };

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "請先登入",
          description: "登入後才能按讚",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      
      // Optimistic update
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);

      const { error } = await supabase.rpc("toggle_share_like", {
        share_id_input: share.id,
      });

      if (error) throw error;
    } catch (error: any) {
      // Revert on error
      setLiked(!liked);
      setLikeCount(liked ? likeCount + 1 : likeCount - 1);
      
      console.error("Error toggling like:", error);
      toast({
        title: "操作失敗",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  // Reduce location precision for privacy
  const getReducedLocation = () => {
    if (!share.expenses?.location_name) return null;
    if (!share.expenses.location_lat || !share.expenses.location_lng) {
      return share.expenses.location_name;
    }
    // Show only location name without precise coordinates
    return share.expenses.location_name;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-primary text-white">
                {share.profiles?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {share.profiles?.full_name || "匿名用戶"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(share.created_at), {
                  addSuffix: true,
                  locale: zhTW,
                })}
              </p>
            </div>
          </div>

          {/* Share Text */}
          <p className="text-sm leading-relaxed">{share.share_text}</p>

          {/* Expense Info */}
          {share.expenses && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {getCategoryEmoji(share.expenses.category)}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">
                      {share.expenses.description || getCategoryName(share.expenses.category)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryName(share.expenses.category)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <DollarSign className="w-4 h-4" />
                    <span>{share.expenses.amount}</span>
                  </div>
                </div>
              </div>
              
              {getReducedLocation() && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{getReducedLocation()}</span>
                </div>
              )}
            </div>
          )}

          {/* Like Button */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center gap-2 ${liked ? "text-red-500" : ""}`}
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Heart
                  className={`w-4 h-4 ${liked ? "fill-current" : ""}`}
                />
              </motion.div>
              <span className="text-sm font-medium">{likeCount}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ShareCard;
