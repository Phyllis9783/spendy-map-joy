import { useState, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceInputProps {
  onExpenseCreated: () => void;
}

const VoiceInput = ({ onExpenseCreated }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "不支援語音輸入",
        description: "您的瀏覽器不支援語音辨識功能，請使用 Chrome、Edge 或 Safari",
        variant: "destructive",
      });
      return;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      toast({
        title: "需要麥克風權限",
        description: "請允許使用麥克風以進行語音輸入",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Try different Chinese language codes with fallback
    const languages = ['zh-CN', 'zh-HK', 'zh-TW', 'zh', 'en-US'];
    recognitionRef.current.lang = languages[0];
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1;
    
    console.log('Starting speech recognition with language:', recognitionRef.current.lang);

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      setRecognizedText("");
    };

    recognitionRef.current.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      console.log('Recognized text:', text);
      setRecognizedText(text);
      setIsRecording(false);
      
      // Process the recognized text
      await processExpense(text);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event);
      setIsRecording(false);
      
      let errorMessage = "請再試一次";
      
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          errorMessage = "請允許瀏覽器使用麥克風權限";
          break;
        case 'no-speech':
          errorMessage = "沒有偵測到語音，請重試";
          break;
        case 'audio-capture':
          errorMessage = "無法存取麥克風，請檢查設備";
          break;
        case 'network':
          errorMessage = "網路連線問題，請檢查網路";
          break;
        case 'language-not-supported':
          errorMessage = "語言不支援，嘗試使用其他語言";
          break;
        case 'aborted':
          return; // Don't show error for aborted
      }
      
      toast({
        title: "語音辨識錯誤",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const processExpense = async (text: string) => {
    setIsProcessing(true);

    try {
      // Call edge function to parse expense
      const { data, error } = await supabase.functions.invoke('parse-expense', {
        body: { text }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse expense');
      }

      const expense = data.expense;

      // Save expense to database
      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          location_name: expense.location_name,
          expense_date: expense.expense_date,
          voice_input: text,
        });

      if (insertError) throw insertError;

      toast({
        title: "記帳成功！",
        description: `已記錄 ${expense.amount} 元的 ${expense.category} 消費`,
      });

      setRecognizedText("");
      onExpenseCreated();

    } catch (error: any) {
      console.error('Error processing expense:', error);
      toast({
        title: "處理失敗",
        description: error.message || "無法處理語音輸入，請再試一次",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={handleClick}
        disabled={isProcessing}
        size="lg"
        className={`
          relative w-32 h-32 rounded-full shadow-glow-strong
          transition-spring interactive
          ${isRecording 
            ? 'bg-destructive hover:bg-destructive/90 animate-pulse-slow' 
            : isProcessing
            ? 'bg-muted'
            : 'bg-gradient-primary'
          }
        `}
      >
        {isProcessing ? (
          <Loader2 className="w-12 h-12 animate-spin" />
        ) : (
          <Mic className="w-12 h-12" />
        )}
      </Button>

      {isRecording && (
        <p className="text-sm font-medium text-primary animate-pulse">
          正在聆聽...
        </p>
      )}

      {isProcessing && (
        <p className="text-sm font-medium text-muted-foreground">
          處理中...
        </p>
      )}

      {recognizedText && !isProcessing && (
        <div className="glass-card px-4 py-2 rounded-xl shadow-sm max-w-md">
          <p className="text-sm text-muted-foreground">辨識結果：</p>
          <p className="text-sm font-medium">{recognizedText}</p>
        </div>
      )}

      {!isRecording && !isProcessing && !recognizedText && (
        <p className="text-sm text-muted-foreground">
          點擊麥克風開始記帳
        </p>
      )}
    </div>
  );
};

export default VoiceInput;
