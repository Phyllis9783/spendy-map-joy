import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      toast({
        title: "註冊成功！",
        description: "歡迎使用 Spendy Map",
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Enhanced error messages for HIBP and common issues
      let errorMessage = error.message;
      
      if (error.message?.toLowerCase().includes('password') && 
          (error.message?.toLowerCase().includes('breach') || 
           error.message?.toLowerCase().includes('leaked') ||
           error.message?.toLowerCase().includes('pwned'))) {
        errorMessage = "此密碼曾在資料外洩事件中出現，為了您的安全，請使用其他密碼";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "此電子郵件已被註冊，請嘗試登入或使用其他郵件";
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = "電子郵件格式不正確";
      } else if (error.message?.includes('Password should be')) {
        errorMessage = "密碼必須至少 8 個字元，並包含大小寫字母及數字";
      }
      
      toast({
        title: "註冊失敗",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "登入成功！",
        description: "歡迎回來",
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Enhanced error messages for login issues
      let errorMessage = error.message;
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "電子郵件或密碼錯誤，請重新嘗試";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "請先確認您的電子郵件地址";
      }
      
      toast({
        title: "登入失敗",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "已登出",
        description: "期待再次見到你",
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "登出失敗",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
};
