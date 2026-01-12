import { supabase } from './supabase';
import { User } from '../types';

export async function checkModelAccess(
  user: User,
  modelVersion: string,
  variant: string
): Promise<{ hasAccess: boolean; message?: string }> {
  console.log('Checking model access for user:', { userId: user.id, role: user.role, modelVersion, variant });

  if (!user.role || user.role === 'admin' || user.role === 'premium') {
    console.log('User has admin/premium access or no role set');
    return { hasAccess: true };
  }

  const { data, error } = await supabase
    .from('model_access')
    .select('is_enabled')
    .eq('user_id', user.id)
    .eq('model_version', modelVersion)
    .eq('variant', variant)
    .maybeSingle();

  console.log('Model access check result:', { data, error });

  if (error) {
    console.error('Error checking model access:', error);
    return { hasAccess: true };
  }

  if (!data) {
    console.log('No model_access record found, allowing access by default');
    return { hasAccess: true };
  }

  if (!data.is_enabled) {
    console.log('Model is disabled for this user');
    return {
      hasAccess: false,
      message: 'Model ini tidak tersedia untuk akun Anda. Hubungi admin untuk akses.',
    };
  }

  console.log('Model access granted');
  return { hasAccess: true };
}

export async function checkProcessingStatus(
  user: User
): Promise<{ hasProcessing: boolean; message?: string; processingCount?: number }> {
  console.log('Checking processing status for user:', { userId: user.id, role: user.role });

  if (!user.role || user.role === 'admin' || user.role === 'premium') {
    console.log('User has admin/premium access or no role set, skipping processing check');
    return { hasProcessing: false, processingCount: 0 };
  }

  const { count, error } = await supabase
    .from('generation_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'processing');

  const processingCount = count || 0;
  console.log('Processing status check result:', { processingCount, error });

  if (error) {
    console.error('Error checking processing status:', error);
    return { hasProcessing: false, processingCount: 0 };
  }

  if (processingCount >= 3) {
    console.log('User has reached max processing limit (3), blocking new generation');
    return {
      hasProcessing: true,
      processingCount,
      message: `Anda sudah memiliki ${processingCount} video yang sedang diproses (maksimal 3). Tunggu hingga ada yang selesai sebelum generate video baru.`,
    };
  }

  console.log('Processing count within limit, allowing generation');
  return { hasProcessing: false, processingCount };
}
