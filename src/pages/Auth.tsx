import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, AlertCircle, Copy, CheckCircle } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isInAppBrowser, isMobileDevice, getOpenInBrowserHint } from "@/lib/browserDetection";
import { Alert, AlertDescription } from "@/components/ui/alert";

const signInSchema = z.object({
  email: z.string().trim().email({ message: "請輸入有效的電子郵件地址" }).max(255, { message: "電子郵件地址過長" }),
  password: z.string().min(6, { message: "密碼至少需要 6 個字元" }).max(100, { message: "密碼過長" })
});

const signUpSchema = z.object({
  name: z.string().trim().min(1, { message: "姓名不能為空" }).max(100, { message: "姓名過長" }),
  email: z.string().trim().email({ message: "請輸入有效的電子郵件地址" }).max(255, { message: "電子郵件地址過長" }),
  password: z.string()
    .min(8, { message: "密碼至少需要 8 個字元" })
    .max(100, { message: "密碼過長" })
    .regex(/[a-z]/, { message: "密碼必須包含小寫字母" })
    .regex(/[A-Z]/, { message: "密碼必須包含大寫字母" })
    .regex(/[0-9]/, { message: "密碼必須包含數字" })
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthErrorDesc, setOauthErrorDesc] = useState<string | null>(null);
  const [diagnosticCopied, setDiagnosticCopied] = useState(false);

  const getErrorGuidance = (error: string) => {
    const errorMap: Record<string, string> = {
      'invalid_client': '❌ Client ID/Secret 不正確。請確認後台 Google Provider 設定的 Client ID 與 Secret 與 Google Cloud Console 完全一致。',
      'redirect_uri_mismatch': '❌ Redirect URI 不符。請在 Google Cloud Console 的「已授權的重新導向 URI」中，加入後台顯示的完整 Callback URL。',
      'origin_mismatch': '❌ JavaScript Origin 不符。請在 Google Cloud Console 的「已授權的 JavaScript 來源」中，加入目前網站的完整網址（含 https://）。',
      'access_denied': '⚠️ 存取被拒絕。請確認 Google OAuth Consent Screen 已設為 Production，或您的帳號已加入測試使用者名單。',
      'unauthorized_client': '❌ 未經授權的 Client。請檢查 Google Cloud Console 的 OAuth 同意畫面設定，確認應用程式已正確設定。'
    };
    return errorMap[error] || '發生未知錯誤，請檢查後台設定與 Google Cloud Console 設定是否一致。';
  };

  const copyDiagnosticInfo = async () => {
    const info = `
【OAuth 診斷資訊】
錯誤代碼: ${oauthError}
錯誤描述: ${oauthErrorDesc || '無'}
目前網址: ${window.location.origin}
完整路徑: ${window.location.href}
User Agent: ${navigator.userAgent}
時間: ${new Date().toISOString()}
    `.trim();
    
    try {
      await navigator.clipboard.writeText(info);
      setDiagnosticCopied(true);
      toast({
        title: "已複製診斷資訊",
        description: "可提供給技術支援團隊",
      });
      setTimeout(() => setDiagnosticCopied(false), 2000);
    } catch (error) {
      toast({
        title: "複製失敗",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setIsInApp(isInAppBrowser());

    // Parse OAuth errors from BOTH search params AND hash
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const err = searchParams.get('error') || 
                searchParams.get('error_code') || 
                hashParams.get('error') ||
                hashParams.get('error_code');
    
    const desc = searchParams.get('error_description') || 
                 searchParams.get('error_message') ||
                 hashParams.get('error_description') ||
                 hashParams.get('error_message');
    
    if (err) {
      setOauthError(decodeURIComponent(err));
      setOauthErrorDesc(desc ? decodeURIComponent(desc) : null);
      
      // Clean the URL to avoid showing the alert repeatedly
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({
        title: "已複製連結",
        description: "請貼到外部瀏覽器開啟",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "複製失敗",
        description: "請手動複製網址列的連結",
        variant: "destructive",
      });
    }
  };

  // Redirect handled via <Navigate /> below to avoid cross-frame issues
  useEffect(() => {}, []);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasLowerCase: false,
    hasUpperCase: false,
    hasNumber: false,
    isStrong: false
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = signInSchema.safeParse({ email: signInEmail, password: signInPassword });
    if (!validation.success) {
      toast({
        title: "輸入錯誤",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const { data, error } = await signIn(validation.data.email, validation.data.password);
    
    setLoading(false);

    if (data && !error) {
      const startPage = localStorage.getItem('startPage') || '/';
      navigate(startPage, { replace: true });
    }
  };

  const checkPasswordStrength = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isStrong = hasMinLength && hasLowerCase && hasUpperCase && hasNumber;

    setPasswordStrength({
      hasMinLength,
      hasLowerCase,
      hasUpperCase,
      hasNumber,
      isStrong
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = signUpSchema.safeParse({ 
      name: signUpName, 
      email: signUpEmail, 
      password: signUpPassword 
    });
    if (!validation.success) {
      toast({
        title: "輸入錯誤",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    const { data, error } = await signUp(
      validation.data.email, 
      validation.data.password, 
      validation.data.name
    );
    
    setLoading(false);

    if (data && !error) {
      const startPage = localStorage.getItem('startPage') || '/';
      navigate(startPage, { replace: true });
    }
  };

  // Declarative redirect when authenticated
  if (user) {
    const startPage = localStorage.getItem('startPage') || '/';
    return <Navigate to={startPage} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero bg-mesh p-6">
      <Card className="w-full max-w-md glass-card shadow-xl animate-scale-in">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Spendy Map
            </h1>
            <p className="text-muted-foreground">
              讓記帳變得有趣
            </p>
          </div>

          {oauthError && (
            <Alert className="mb-4 border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="space-y-3">
                <p className="text-sm font-semibold text-destructive">
                  Google 登入失敗：{oauthError}
                </p>
                {oauthErrorDesc && (
                  <p className="text-sm text-foreground/80">
                    {oauthErrorDesc}
                  </p>
                )}
                <div className="text-sm bg-background/50 p-3 rounded-md border border-border">
                  {getErrorGuidance(oauthError)}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyDiagnosticInfo}
                    className="flex-1"
                  >
                    {diagnosticCopied ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        已複製診斷資訊
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        複製診斷資訊
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setOauthError(null);
                      setOauthErrorDesc(null);
                      signInWithGoogle();
                    }}
                    className="flex-1"
                  >
                    重試 Google 登入
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">登入</TabsTrigger>
              <TabsTrigger value="signup">註冊</TabsTrigger>
            </TabsList>

            {/* Sign In Form */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">電子郵件</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    className="transition-smooth"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">密碼</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    className="transition-smooth"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-smooth"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登入
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">或</span>
                  </div>
                </div>

                {isInApp && (
                  <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="space-y-3">
                      <p className="text-sm font-semibold text-destructive">
                        ⚠️ 偵測到內嵌瀏覽器環境
                      </p>
                      <p className="text-sm">
                        Google 不支援在應用程式內嵌瀏覽器中登入。
                      </p>
                      <p className="text-sm font-medium">
                        {getOpenInBrowserHint()}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyCurrentUrl}
                        className="w-full mt-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            已複製連結
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            複製網址並在瀏覽器開啟
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        或者，您可以直接使用 Email 登入 👇
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signInWithGoogle()}
                  disabled={loading || isInApp}
                  className="w-full transition-smooth"
                  title={isInApp ? "請在外部瀏覽器中使用 Google 登入" : ""}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  使用 Google 登入
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Form */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">姓名</label>
                  <Input
                    type="text"
                    placeholder="您的名字"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    className="transition-smooth"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">電子郵件</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    className="transition-smooth"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">密碼</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => {
                      setSignUpPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                    required
                    minLength={8}
                    className="transition-smooth"
                  />
                  {signUpPassword && (
                    <div className="space-y-1 text-xs mt-2">
                      <p className={passwordStrength.hasMinLength ? "text-green-600" : "text-muted-foreground"}>
                        {passwordStrength.hasMinLength ? "✓" : "○"} 至少 8 個字元
                      </p>
                      <p className={passwordStrength.hasLowerCase ? "text-green-600" : "text-muted-foreground"}>
                        {passwordStrength.hasLowerCase ? "✓" : "○"} 包含小寫字母
                      </p>
                      <p className={passwordStrength.hasUpperCase ? "text-green-600" : "text-muted-foreground"}>
                        {passwordStrength.hasUpperCase ? "✓" : "○"} 包含大寫字母
                      </p>
                      <p className={passwordStrength.hasNumber ? "text-green-600" : "text-muted-foreground"}>
                        {passwordStrength.hasNumber ? "✓" : "○"} 包含數字
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || (signUpPassword && !passwordStrength.isStrong)}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-smooth"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  註冊
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">或</span>
                  </div>
                </div>

                {isInApp && (
                  <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="space-y-3">
                      <p className="text-sm font-semibold text-destructive">
                        ⚠️ 偵測到內嵌瀏覽器環境
                      </p>
                      <p className="text-sm">
                        Google 不支援在應用程式內嵌瀏覽器中登入。
                      </p>
                      <p className="text-sm font-medium">
                        {getOpenInBrowserHint()}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyCurrentUrl}
                        className="w-full mt-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            已複製連結
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            複製網址並在瀏覽器開啟
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        或者，您可以直接使用 Email 註冊 👇
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signInWithGoogle()}
                  disabled={loading || isInApp}
                  className="w-full transition-smooth"
                  title={isInApp ? "請在外部瀏覽器中使用 Google 登入" : ""}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  使用 Google 登入
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground mt-6">
            使用 Spendy Map 代表您同意我們的服務條款
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
