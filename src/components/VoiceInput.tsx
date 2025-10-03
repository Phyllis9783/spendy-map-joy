import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Type, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import { z } from "zod";

const expenseInputSchema = z.object({
  text: z.string()
    .trim()
    .min(1, { message: "請輸入消費記錄" })
    .max(500, { message: "輸入內容過長，請限制在 500 字以內" })
    .refine(
      (text) => text.length > 5,
      { message: "請輸入更詳細的消費記錄，例如：在星巴克花了150元買咖啡" }
    )
});

interface VoiceInputProps {
  onExpenseCreated: () => void;
}

const VoiceInput = ({ onExpenseCreated }: VoiceInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");
  const [useRecording, setUseRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentLanguageIndex = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const preprocessText = (text: string): string => {
    let processed = text.trim();
    processed = processed.replace(/[嗯呃啊喔哦]/g, '');
    processed = processed.replace(/塊錢/g, '元');
    processed = processed.replace(/([0-9]+)塊/g, '$1元');
    processed = processed.replace(/今日|今仔日/g, '今天');
    processed = processed.replace(/昨日|昨仔日/g, '昨天');
    return processed;
  };

  const startRecording = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "不支援語音輸入",
        description: "您的瀏覽器不支援語音辨識功能，請改用文字輸入",
        variant: "destructive",
      });
      setShowManualInput(true);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      toast({
        title: "需要麥克風權限",
        description: "請允許使用麥克風，或改用文字輸入",
        variant: "destructive",
      });
      setShowManualInput(true);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    const languages = ['zh-CN', 'zh-HK', 'zh-TW', 'zh', 'en-US'];
    recognitionRef.current.lang = languages[currentLanguageIndex.current];
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.maxAlternatives = 3;
    
    console.log('Starting speech recognition with language:', recognitionRef.current.lang);

    timeoutRef.current = setTimeout(() => {
      if (isRecording && recognitionRef.current) {
        console.log('Speech timeout - no speech detected');
        recognitionRef.current.stop();
        toast({
          title: "未偵測到語音",
          description: "請再試一次，或改用文字輸入",
        });
        setShowManualInput(true);
      }
    }, 10000);

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      setRecognizedText("");
      setInterimText("");
      console.log('Speech recognition started');
    };

    recognitionRef.current.onresult = async (event: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log('Confidence:', confidence);
          
          if (confidence < 0.7) {
            setInterimText(`${transcript} (置信度較低，請確認)`);
          }
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
        console.log('Interim text:', interimTranscript);
      }

      if (finalTranscript) {
        console.log('Final recognized text:', finalTranscript);
        const preprocessed = preprocessText(finalTranscript);
        console.log('Preprocessed text:', preprocessed);
        setRecognizedText(preprocessed);
        setInterimText("");
        setIsRecording(false);
        
        await processExpense(preprocessed);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setIsRecording(false);
      setInterimText("");
      
      if (event.error === 'language-not-supported' && currentLanguageIndex.current < 4) {
        currentLanguageIndex.current++;
        console.log('Retrying with next language...');
        toast({
          title: "切換語言中",
          description: "正在嘗試其他語言設定...",
        });
        setTimeout(() => startRecording(), 500);
        return;
      }

      let errorMessage = "請再試一次，或改用文字輸入";
      
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          errorMessage = "請允許瀏覽器使用麥克風權限，或改用文字輸入";
          setShowManualInput(true);
          break;
        case 'no-speech':
          errorMessage = "沒有偵測到語音，請重試或改用文字輸入";
          setShowManualInput(true);
          break;
        case 'audio-capture':
          errorMessage = "無法存取麥克風，請檢查設備或改用文字輸入";
          setShowManualInput(true);
          break;
        case 'network':
          errorMessage = "網路連線問題，請檢查網路";
          break;
        case 'language-not-supported':
          errorMessage = "語言不支援，請改用文字輸入";
          setShowManualInput(true);
          break;
        case 'aborted':
          return;
      }
      
      toast({
        title: "語音辨識錯誤",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended');
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (interimText && !recognizedText && isRecording) {
        console.log('Processing interim text as final:', interimText);
        const preprocessed = preprocessText(interimText);
        setRecognizedText(preprocessed);
        processExpense(preprocessed);
      }
      
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current.start();
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecording(false);
        }
      }, 15000);

      toast({
        title: "錄音中",
        description: "最長錄製 15 秒，請清楚說出消費記錄",
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "錄音失敗",
        description: "無法存取麥克風，請改用文字輸入",
        variant: "destructive",
      });
      setShowManualInput(true);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      const text = data.text;
      console.log('Transcribed text:', text);
      const preprocessed = preprocessText(text);
      setRecognizedText(preprocessed);

      await processExpense(preprocessed);

    } catch (error: any) {
      console.error('Transcription error:', error);
      
      let errorMessage = "語音轉文字失敗，請重試或改用文字輸入";
      
      if (error.message?.includes('429')) {
        errorMessage = "系統繁忙中，請稍後再試";
      } else if (error.message?.includes('402')) {
        errorMessage = "服務暫時無法使用，請稍後再試";
      }
      
      toast({
        title: "轉譯失敗",
        description: errorMessage,
        variant: "destructive",
      });
      setShowManualInput(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const processExpense = async (text: string) => {
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-expense', {
        body: { text }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse expense');
      }

      const expense = data.expense;
      console.log('Parsed expense:', expense);

      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          amount: Number(expense.amount),
          category: expense.category,
          description: expense.description,
          location_name: expense.location_name,
          location_lat: expense.location_lat,
          location_lng: expense.location_lng,
          expense_date: expense.expense_date,
          voice_input: text,
        });

      if (insertError) throw insertError;

      // Track challenges after creating expense
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { trackAllChallenges: trackChallenges } = await import("@/lib/challengeTracker");
        await trackChallenges(user.id);
      }

      // Celebration!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      toast({
        title: "🎉 記帳成功！",
        description: `已記錄 ${expense.amount} 元的 ${expense.category} 消費${expense.location_name ? ` - ${expense.location_name}` : ''}`,
      });

      setRecognizedText("");
      setManualText("");
      setShowManualInput(false);
      setUseRecording(false);
      onExpenseCreated();

    } catch (error: any) {
      console.error('Error processing expense:', error);
      
      let errorMessage = error.message || "無法處理輸入，請再試一次";
      
      if (error.message?.includes('429')) {
        errorMessage = "系統繁忙中，請稍後再試";
      } else if (error.message?.includes('402')) {
        errorMessage = "服務暫時無法使用，請稍後再試";
      }
      
      toast({
        title: "處理失敗",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    // Validate input
    const validation = expenseInputSchema.safeParse({ text: manualText });
    if (!validation.success) {
      toast({
        title: "輸入錯誤",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    await processExpense(validation.data.text);
  };

  const handleClick = () => {
    if (isRecording) {
      if (useRecording) {
        stopAudioRecording();
      } else {
        stopRecording();
      }
    } else {
      if (!useRecording) {
        startRecording();
      } else {
        startAudioRecording();
      }
    }
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      
      <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto relative">
        {/* Orbit rings */}
        {isRecording && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30 pointer-events-none"
              style={{ width: '180px', height: '180px', left: 'calc(50% - 90px)', top: '0' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20 pointer-events-none"
              style={{ width: '200px', height: '200px', left: 'calc(50% - 100px)', top: '-10px' }}
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </>
        )}

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleClick}
            disabled={isProcessing}
            size="lg"
            className={`
              relative w-32 h-32 rounded-full shadow-glow-strong overflow-hidden z-10
              transition-spring
              ${isRecording 
                ? 'bg-destructive hover:bg-destructive/90' 
                : isProcessing
                ? 'bg-muted'
                : 'bg-gradient-primary'
              }
              ${!isRecording && !isProcessing && 'animate-breath'}
            `}
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : isRecording ? (
              <>
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <Mic className="w-12 h-12 relative z-10" />
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 absolute top-3 right-3 text-white/60 animate-pulse" />
                <Mic className="w-12 h-12" />
              </>
            )}
          </Button>
        </motion.div>

        {isRecording && (
          <motion.div 
            className="text-center space-y-2"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <p className="text-sm font-medium text-primary">
              🎤 正在聆聽中...（點擊停止）
            </p>
            {interimText && (
              <div className="glass-card px-4 py-2 rounded-xl shadow-sm">
                <p className="text-xs text-muted-foreground">即時辨識：</p>
                <p className="text-sm font-medium text-primary">{interimText}</p>
              </div>
            )}
          </motion.div>
        )}

        {isProcessing && (
          <motion.p 
            className="text-sm font-medium text-muted-foreground"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ⚡ 處理中...
          </motion.p>
        )}

        {!isRecording && !isProcessing && (
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            點擊麥克風開始語音記帳 ✨
          </motion.p>
        )}

        {recognizedText && !isProcessing && (
          <div className="glass-card px-4 py-2 rounded-xl shadow-sm max-w-md">
            <p className="text-xs text-muted-foreground">已辨識：</p>
            <p className="text-sm font-medium">{recognizedText}</p>
          </div>
        )}

        {!showManualInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualInput(true)}
            className="text-xs"
          >
            <Type className="w-3 h-3 mr-1" />
            改用文字輸入
          </Button>
        )}

        {showManualInput && (
          <motion.div 
            className="flex gap-2 w-full max-w-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Input
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="例如：在星巴克花了150元買咖啡"
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualSubmit();
                }
              }}
            />
            <Button
              onClick={handleManualSubmit}
              disabled={isProcessing || !manualText.trim()}
            >
              送出
            </Button>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default VoiceInput;
