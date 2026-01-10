import { supabase } from './lib/supabase';

export async function debugHistory(userId: string) {
  console.log('=== DEBUG HISTORY START ===');
  console.log('User ID:', userId);

  try {
    const { data: session } = await supabase.auth.getSession();
    console.log('Auth Session:', session?.session ? 'Active' : 'No session');

    const { data, error, count } = await supabase
      .from('generation_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('Query Result:');
    console.log('- Error:', error);
    console.log('- Count:', count);
    console.log('- Data length:', data?.length || 0);
    console.log('- Data:', data);

    if (!data || data.length === 0) {
      const { data: allHistory } = await supabase
        .from('generation_history')
        .select('user_id')
        .limit(5);

      console.log('Sample user_ids from database:', allHistory?.map(h => h.user_id));
    }
  } catch (err) {
    console.error('Debug error:', err);
  }

  console.log('=== DEBUG HISTORY END ===');
}

if (typeof window !== 'undefined') {
  (window as any).debugHistory = debugHistory;
}
