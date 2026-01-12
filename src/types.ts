export interface User {
  id: string;
  username: string;
  api_key: string;
  is_admin: boolean;
  credits: number;
  created_at: string;
  auth_id?: string;
  role?: string;
}

export interface GenerationHistory {
  id: string;
  user_id: string;
  prompt: string;
  image_url: string | null;
  aspect_ratio: string;
  duration: number;
  credits_used: number;
  video_url: string | null;
  video_url_2: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  model_type: string;
  model_version: string;
  variant: string;
  audio_enabled: boolean;
  metadata: any;
  request_id: string;
}

export interface CreditPricing {
  id: string;
  duration: number;
  price: number;
  created_at: string;
  updated_at: string;
  model_type: string;
  model_version: string;
  variant: string;
  audio_enabled: boolean | null;
  is_per_second: boolean;
  role: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  api_key: string;
  credits: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
