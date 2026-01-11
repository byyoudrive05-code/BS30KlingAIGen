import { useState, useEffect, useCallback } from 'react';
import { LogOut, Settings, Video, Image as ImageIcon, Loader } from 'lucide-react';
import { User, CreditPricing } from '../types';
import { supabase } from '../lib/supabase';
import History from './History';
import VideoPreview from './VideoPreview';
import AdminPanel from './AdminPanel';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
}

export default function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [duration, setDuration] = useState(4);
  const [loading, setLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [currentCredits, setCurrentCredits] = useState(user.credits);
  const [pricing, setPricing] = useState<CreditPricing[]>([]);
  const [processingCount, setProcessingCount] = useState(0);

  const loadPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_pricing')
        .select('*')
        .order('duration', { ascending: true });

      if (!error && data) {
        setPricing(data);
      }
    } catch (err) {
      console.error('Error loading pricing:', err);
    }
  };

  const refreshUserData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let userCredits = 0;
      if (!error && data) {
        userCredits = Number(data.credits) || 0;
        if (onUserUpdate) {
          onUserUpdate(data);
        }
      }

      const { data: apiKeys, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('credits')
        .eq('user_id', user.id)
        .eq('is_active', true);

      let apiKeyCredits = 0;
      if (!apiKeysError && apiKeys) {
        apiKeyCredits = apiKeys.reduce((sum, key) => sum + Number(key.credits), 0);
      }

      setCurrentCredits(userCredits + apiKeyCredits);

      const { count } = await supabase
        .from('generation_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'processing');

      setProcessingCount(count || 0);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  }, [user.id, onUserUpdate]);

  useEffect(() => {
    loadPricing();
    refreshUserData();

    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        () => {
          refreshUserData();
        }
      )
      .subscribe();

    const apiKeysChannel = supabase
      .channel('api-keys-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'api_keys',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          refreshUserData();
        }
      )
      .subscribe();

    const historyChannel = supabase
      .channel('history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_history',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          refreshUserData();
        }
      )
      .subscribe();

    return () => {
      usersChannel.unsubscribe();
      apiKeysChannel.unsubscribe();
      historyChannel.unsubscribe();
    };
  }, [refreshUserData, user.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const getCreditCost = () => {
    const priceItem = pricing.find(p => p.duration === duration);
    return priceItem ? priceItem.price : 0.4;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (processingCount >= 5) {
      alert('Anda sudah mencapai batas maksimal 5 video yang sedang diproses. Silakan tunggu hingga ada video yang selesai.');
      return;
    }

    const creditCost = getCreditCost();
    if (currentCredits < creditCost) {
      alert('Kredit tidak cukup!');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image to Supabase Storage if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error('Gagal upload gambar: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            userId: user.id,
            prompt,
            imageUrl,
            aspectRatio,
            duration,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal generate video');
      }

      await refreshUserData();
      alert(result.message || 'Video sedang diproses. Silakan cek riwayat dalam beberapa saat.');
      setPrompt('');
      clearImage();
    } catch (err) {
      console.error('Error generating video:', err);
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Video className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">Kling AI Generator</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user.username}</p>
                <p className="text-xs text-gray-600">
                  {currentCredits.toFixed(1)} credits
                </p>
              </div>

              {user.is_admin && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="bg-slate-700 hover:bg-slate-800 text-white p-2 rounded-lg transition-colors"
                  title="Admin Panel"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Generate Video</h2>

            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Text
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Deskripsikan video yang ingin dibuat..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Gambar (Optional - untuk Image to Video)
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Klik untuk upload gambar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durasi (detik)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {pricing.map((item) => (
                      <option key={item.id} value={item.duration}>
                        {item.duration} detik ({item.price} credits)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Biaya Generate:</span>
                  <span className="font-semibold text-blue-600">{getCreditCost()} credits</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-700">Sisa Kredit Setelah Generate:</span>
                  <span className="font-semibold text-gray-800">{(currentCredits - getCreditCost()).toFixed(1)} credits</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-700">Video Sedang Diproses:</span>
                  <span className={`font-semibold ${processingCount >= 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {processingCount} / 5
                  </span>
                </div>
              </div>

              {processingCount >= 5 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    Anda sudah mencapai batas maksimal 5 video yang sedang diproses. Silakan tunggu hingga ada video yang selesai.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || currentCredits < getCreditCost() || processingCount >= 5}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Generate Video
                  </>
                )}
              </button>
            </form>
          </div>

          <History
            userId={user.id}
            userApiKey={user.api_key}
            onVideoClick={setPreviewVideo}
            onReusePrompt={setPrompt}
          />
        </div>
      </main>

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} currentUser={user} />
      )}

      {previewVideo && (
        <VideoPreview videoUrl={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
    </div>
  );
}
