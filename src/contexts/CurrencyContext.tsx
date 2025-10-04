import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CurrencyCode } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('TWD');
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Wait for auth to finish loading before fetching currency
    if (authLoading) {
      return;
    }
    
    if (user) {
      fetchUserCurrency();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchUserCurrency = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.preferred_currency) {
        setCurrencyState(data.preferred_currency as CurrencyCode);
      }
    } catch (error) {
      console.error('Error fetching currency preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrency = async (newCurrency: CurrencyCode) => {
    try {
      if (!user) {
        setCurrencyState(newCurrency);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ preferred_currency: newCurrency })
        .eq('id', user.id);

      if (error) throw error;

      setCurrencyState(newCurrency);
      
      toast({
        title: "幣值已更新",
        description: `已切換為${newCurrency === 'TWD' ? '台幣' : newCurrency === 'USD' ? '美元' : newCurrency === 'JPY' ? '日圓' : '歐元'}`,
      });
    } catch (error) {
      console.error('Error updating currency:', error);
      toast({
        title: "更新失敗",
        description: "無法更新幣值設定，請重試",
        variant: "destructive",
      });
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, loading: loading || authLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    // During development or initial render, provide a fallback
    console.warn('useCurrency called outside CurrencyProvider, using fallback');
    return {
      currency: 'TWD' as CurrencyCode,
      setCurrency: async () => {},
      loading: false
    };
  }
  return context;
};
