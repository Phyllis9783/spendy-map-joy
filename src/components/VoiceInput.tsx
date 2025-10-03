import { useState, useRef } from "react";
import { Mic, Loader2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentLanguageIndex = useRef(0);

  // Text preprocessing
  const preprocessText = (text: string): string => {
    let processed = text.trim();
    
    // Remove filler words
    processed = processed.replace(/[嗯呃啊喔哦]/g, '');
    
    // Standardize currency units
    processed = processed.replace(/塊錢/g, '元');
    processed = processed.replace(/([0-9]+)塊/g, '$1元');
    
    // Standardize time expressions
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

    // Request microphone permission first
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
    
    // Try different Chinese language codes with fallback
    const languages = ['zh-CN', 'zh-HK', 'zh-TW', 'zh', 'en-US'];
    recognitionRef.current.lang = languages[currentLanguageIndex.current];
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.maxAlternatives = 3; // Increased for better accuracy
    
    console.log('Starting speech recognition with language:', recognitionRef.current.lang);

    // Set timeout for no speech
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
    }, 10000); // 10 second timeout

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      setRecognizedText("");
      setInterimText("");
      console.log('Speech recognition started');
    };

    recognitionRef.current.onresult = async (event: any) => {
      // Clear timeout since we got results
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
          
          // Low confidence warning
          if (confidence < 0.7) {
            setInterimText(`${transcript} (置信度較低，請確認)`);
          }
        } else {
          interimTranscript += transcript;
        }
      }

      // Update interim results for live display
      if (interimTranscript) {
        setInterimText(interimTranscript);
        console.log('Interim text:', interimTranscript);
      }

      // Process final results
      if (finalTranscript) {
        console.log('Final recognized text:', finalTranscript);
        const preprocessed = preprocessText(finalTranscript);
        console.log('Preprocessed text:', preprocessed);
        setRecognizedText(preprocessed);
        setInterimText("");
        setIsRecording(false);
        
        // Process the recognized text
        await processExpense(preprocessed);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event);
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setIsRecording(false);
      setInterimText("");
      
      // Handle language not supported with fallback
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
          return; // Don't show error for aborted
      }
      
      toast({
        title: "語音辨識錯誤",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended');
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // If we have interim text but no final result, process it
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

      // Auto-stop after 15 seconds
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
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:audio/webm;base64, prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      // Call transcription edge function
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

      // Process the transcribed text
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
      // Call edge function to parse expense
      const { data, error } = await supabase.functions.invoke('parse-expense', {
        body: { text }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse expense');
      }

      const expense = data.expense;
      console.log('Parsed expense:', expense);

      // Save expense to database
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

      toast({
        title: "記帳成功！",
        description: `已記錄 ${expense.amount} 元的 ${expense.category} 消費${expense.location_name ? ` - ${expense.location_name}` : ''}`,
      });

      setRecognizedText("");
      setManualText("");
      setShowManualInput(false);
      setUseRecording(false);
      onExpenseCreated();

    } catch (error: any) {
      console.error('Error processing expense:', error);
      
      // Handle specific error codes
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
    if (!manualText.trim()) {
      toast({
        title: "請輸入內容",
        description: "請輸入消費記錄，例如：在星巴克花了150元買咖啡",
        variant: "destructive",
      });
      return;
    }
    
    await processExpense(manualText);
  };

  const handleClick = () => {
    if (isRecording) {
      if (useRecording) {
        stopAudioRecording();
      } else {
        stopRecording();
      }
    } else {
      // Try speech recognition first, fallback to audio recording if fails
      if (!useRecording) {
        startRecording();
      } else {
        startAudioRecording();
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
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
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-primary animate-pulse">
            正在聆聽中...（點擊停止）
          </p>
          {interimText && (
            <div className="glass-card px-4 py-2 rounded-xl shadow-sm">
              <p className="text-xs text-muted-foreground">即時辨識：</p>
              <p className="text-sm font-medium text-primary">{interimText}</p>
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <p className="text-sm font-medium text-muted-foreground">
          處理中...
        </p>
      )}

      {recognizedText && !isProcessing && (
        <div className="glass-card px-4 py-2 rounded-xl shadow-sm max-w-md">
          <p className="text-xs text-muted-foreground">辨識結果：</p>
          <p className="text-sm font-medium">{recognizedText}</p>
        </div>
      )}

      {!isRecording && !isProcessing && !recognizedText && (
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            點擊麥克風開始記帳
          </p>
          <div className="glass-card p-3 rounded-lg text-xs space-y-1">
            <p className="font-medium text-primary">範例：</p>
            <p className="text-muted-foreground">「今天在星巴克花了150元買咖啡」</p>
            <p className="text-muted-foreground">「圍棋米粉100個¥10午餐」</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-primary hover:underline"
            >
              改用文字輸入
            </button>
            {!useRecording && (
              <button
                onClick={() => {
                  setUseRecording(true);
                  toast({
                    title: "切換到錄音模式",
                    description: "將使用錄音轉文字功能",
                  });
                }}
                className="text-xs text-primary hover:underline"
              >
                改用錄音轉文字
              </button>
            )}
          </div>
        </div>
      )}

      {showManualInput && !isProcessing && (
        <div className="w-full space-y-2 glass-card p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">文字輸入</p>
          </div>
          <Input
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="例如：在星巴克花了150元買咖啡"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleManualSubmit();
              }
            }}
          />
          <Button 
            onClick={handleManualSubmit}
            className="w-full"
            disabled={!manualText.trim()}
          >
            送出
          </Button>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
