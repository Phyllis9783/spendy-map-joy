import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface SharePrivacyWarningProps {
  isPublic: boolean;
  onPublicChange: (checked: boolean) => void;
}

/**
 * Privacy warning component for share creation
 * Part of Phase 1 security improvements - warns users about public data exposure
 */
export const SharePrivacyWarning = ({ isPublic, onPublicChange }: SharePrivacyWarningProps) => {
  return (
    <div className="space-y-4">
      <Alert variant={isPublic ? "destructive" : "default"}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>隱私提醒</AlertTitle>
        <AlertDescription>
          {isPublic ? (
            <>
              <strong>公開分享將使您的資料對所有人可見</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                <li>任何人都可以查看此分享</li>
                <li>位置資訊會降低精度（約1公里範圍）</li>
                <li>消費金額和類別將會被看到</li>
              </ul>
            </>
          ) : (
            <span className="text-sm">
              此分享僅對您自己可見。您可以選擇公開分享讓其他使用者看到。
            </span>
          )}
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="public-share"
          checked={isPublic}
          onCheckedChange={(checked) => onPublicChange(checked as boolean)}
        />
        <label
          htmlFor="public-share"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          公開此分享給所有使用者查看
        </label>
      </div>

      {isPublic && (
        <p className="text-xs text-muted-foreground">
          ⚠️ 公開後無法撤銷，請確認要分享的內容
        </p>
      )}
    </div>
  );
};
