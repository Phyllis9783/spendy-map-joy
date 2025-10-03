import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface Challenge {
  id: string;
  title: string;
  challenge_type: string;
  category: string;
  target_amount: number;
  duration_days: number;
}

interface UserChallenge {
  id: string;
  challenge_id: string;
  current_amount: number;
  status: string;
  started_at: string;
  progress_data: any;
  challenges: Challenge;
}

// Calculate consecutive days of expense tracking
const calculateConsecutiveDays = (expenses: any[]): number => {
  if (expenses.length === 0) return 0;

  const dates = expenses
    .map(e => new Date(e.expense_date).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort();

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
};

// Show confetti animation for challenge completion
const showCompletionAnimation = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
};

// Track spending challenges
export const trackSpendingChallenges = async (userId: string) => {
  try {
    const { data: userChallenges, error: challengesError } = await supabase
      .from('user_challenges')
      .select('*, challenges(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('challenges.challenge_type', 'spending');

    if (challengesError) throw challengesError;
    if (!userChallenges || userChallenges.length === 0) return;

    for (const uc of userChallenges as UserChallenge[]) {
      const challenge = uc.challenges;
      const startDate = new Date(uc.started_at);
      const endDate = new Date(startDate.getTime() + challenge.duration_days * 24 * 60 * 60 * 1000);

      let query = supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .gte('expense_date', startDate.toISOString())
        .lte('expense_date', endDate.toISOString());

      if (challenge.category && challenge.category !== 'all') {
        query = query.eq('category', challenge.category);
      }

      const { data: expenses, error: expensesError } = await query;
      if (expensesError) throw expensesError;

      const totalAmount = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const isCompleted = totalAmount <= challenge.target_amount;
      const newStatus = isCompleted ? 'completed' : (new Date() > endDate ? 'failed' : 'active');

      const { error: updateError } = await supabase
        .from('user_challenges')
        .update({
          current_amount: totalAmount,
          status: newStatus,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', uc.id);

      if (updateError) throw updateError;

      if (newStatus === 'completed' && uc.status === 'active') {
        showCompletionAnimation();
        toast({
          title: "🎉 挑戰完成！",
          description: `恭喜完成「${challenge.title}」挑戰！`,
        });
      }
    }
  } catch (error) {
    console.error('Error tracking spending challenges:', error);
  }
};

// Track logging challenges (streak and count)
export const trackLoggingChallenges = async (userId: string) => {
  try {
    const { data: userChallenges, error: challengesError } = await supabase
      .from('user_challenges')
      .select('*, challenges(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('challenges.challenge_type', 'logging');

    if (challengesError) throw challengesError;
    if (!userChallenges || userChallenges.length === 0) return;

    // Fetch all user expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('expense_date')
      .eq('user_id', userId)
      .order('expense_date', { ascending: true });

    if (expensesError) throw expensesError;

    for (const uc of userChallenges as UserChallenge[]) {
      const challenge = uc.challenges;
      const startDate = new Date(uc.started_at);
      const endDate = new Date(startDate.getTime() + challenge.duration_days * 24 * 60 * 60 * 1000);

      let currentAmount = 0;
      let isCompleted = false;

      if (challenge.category === 'streak') {
        // Calculate consecutive days
        const relevantExpenses = expenses?.filter(e => {
          const expenseDate = new Date(e.expense_date);
          return expenseDate >= startDate && expenseDate <= endDate;
        }) || [];
        
        currentAmount = calculateConsecutiveDays(relevantExpenses);
        isCompleted = currentAmount >= challenge.target_amount;
      } else if (challenge.category === 'count') {
        // Count total entries in duration
        const relevantExpenses = expenses?.filter(e => {
          const expenseDate = new Date(e.expense_date);
          return expenseDate >= startDate && expenseDate <= endDate;
        }) || [];
        
        currentAmount = relevantExpenses.length;
        isCompleted = currentAmount >= challenge.target_amount;
      }

      const newStatus = isCompleted ? 'completed' : (new Date() > endDate ? 'failed' : 'active');

      const { error: updateError } = await supabase
        .from('user_challenges')
        .update({
          current_amount: currentAmount,
          status: newStatus,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', uc.id);

      if (updateError) throw updateError;

      if (newStatus === 'completed' && uc.status === 'active') {
        showCompletionAnimation();
        toast({
          title: "🎉 挑戰完成！",
          description: `恭喜完成「${challenge.title}」挑戰！`,
        });
      }
    }
  } catch (error) {
    console.error('Error tracking logging challenges:', error);
  }
};

// Track exploration challenges
export const trackExplorationChallenges = async (userId: string) => {
  try {
    const { data: userChallenges, error: challengesError } = await supabase
      .from('user_challenges')
      .select('*, challenges(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('challenges.challenge_type', 'exploration');

    if (challengesError) throw challengesError;
    if (!userChallenges || userChallenges.length === 0) return;

    // Fetch expenses with location data
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('location_name, location_lat, location_lng, expense_date')
      .eq('user_id', userId)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null);

    if (expensesError) throw expensesError;

    for (const uc of userChallenges as UserChallenge[]) {
      const challenge = uc.challenges;
      const startDate = new Date(uc.started_at);
      const endDate = new Date(startDate.getTime() + challenge.duration_days * 24 * 60 * 60 * 1000);

      const relevantExpenses = expenses?.filter(e => {
        const expenseDate = new Date(e.expense_date);
        return expenseDate >= startDate && expenseDate <= endDate;
      }) || [];

      let currentAmount = 0;
      let progressData: any = {};

      if (challenge.category === 'locations') {
        // Count unique location names
        const uniqueLocations = new Set(
          relevantExpenses
            .filter(e => e.location_name)
            .map(e => e.location_name)
        );
        currentAmount = uniqueLocations.size;
        progressData = { locations: Array.from(uniqueLocations) };
      } else if (challenge.category === 'cities') {
        // Count unique cities (extract from location_name)
        const uniqueCities = new Set(
          relevantExpenses
            .filter(e => e.location_name)
            .map(e => {
              // Try to extract city from location name
              const parts = e.location_name?.split(',') || [];
              return parts[parts.length - 2]?.trim() || parts[0]?.trim();
            })
            .filter(city => city)
        );
        currentAmount = uniqueCities.size;
        progressData = { cities: Array.from(uniqueCities) };
      }

      const isCompleted = currentAmount >= challenge.target_amount;
      const newStatus = isCompleted ? 'completed' : (new Date() > endDate ? 'failed' : 'active');

      const { error: updateError } = await supabase
        .from('user_challenges')
        .update({
          current_amount: currentAmount,
          status: newStatus,
          progress_data: progressData,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', uc.id);

      if (updateError) throw updateError;

      if (newStatus === 'completed' && uc.status === 'active') {
        showCompletionAnimation();
        toast({
          title: "🎉 挑戰完成！",
          description: `恭喜完成「${challenge.title}」挑戰！`,
        });
      }
    }
  } catch (error) {
    console.error('Error tracking exploration challenges:', error);
  }
};

// Track all challenges at once
export const trackAllChallenges = async (userId: string) => {
  await Promise.all([
    trackSpendingChallenges(userId),
    trackLoggingChallenges(userId),
    trackExplorationChallenges(userId)
  ]);
};
