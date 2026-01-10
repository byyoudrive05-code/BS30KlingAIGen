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
): Promise<{ hasProcessing: boolean; message?: string }> {
  console.log('Checking processing status for user:', { userId: user.id, role: user.role });

  if (!user.role || user.role === 'admin' || user.role === 'premium') {
    console.log('User has admin/premium access or no role set, skipping processing check');
    return { hasProcessing: false };
  }

  const { data, error } = await supabase
    .from('generation_history')
    .select('id, prompt, created_at, status')
    .eq('user_id', user.id)
    .eq('status', 'processing')
    .maybeSingle();

  console.log('Processing status check result:', { data, error });

  if (error) {
    console.error('Error checking processing status:', error);
    return { hasProcessing: false };
  }

  if (data) {
    console.log('User has processing video, blocking new generation');
    return {
      hasProcessing: true,
      message: 'Anda memiliki video yang sedang diproses. Tunggu hingga selesai sebelum generate video baru.',
    };
  }

  console.log('No processing video found, allowing generation');
  return { hasProcessing: false };
}
