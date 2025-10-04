import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { CURRENCIES, CurrencyCode } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CurrencySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CurrencySettingsDialog = ({ open, onOpenChange }: CurrencySettingsDialogProps) => {
  const { currency, setCurrency } = useCurrency();

  const handleSelectCurrency = async (code: CurrencyCode) => {
    await setCurrency(code);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>幣值設定</DialogTitle>
          <DialogDescription>
            選擇您偏好的顯示幣值
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {Object.entries(CURRENCIES).map(([code, info]) => (
            <Card
              key={code}
              className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                currency === code ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => handleSelectCurrency(code as CurrencyCode)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{info.symbol}</div>
                  <div>
                    <p className="font-medium">{info.name}</p>
                    <p className="text-xs text-muted-foreground">{code}</p>
                  </div>
                </div>
                {currency === code && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          💡 提示：所有金額會自動依匯率換算顯示
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CurrencySettingsDialog;
