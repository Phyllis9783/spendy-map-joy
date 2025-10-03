import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

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
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Sign in state
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
      navigate("/");
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
      navigate("/");
    }
  };

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
