import { useState, useEffect } from 'react';
import { Video, Loader, AlertCircle } from 'lucide-react';
import { User, CreditPricing } from '../../types';
import { supabase } from '../../lib/supabase';
import { checkModelAccess, checkProcessingStatus } from '../../lib/modelAccess';

interface Kling26TextToVideoProps {
  user: User;
  currentCredits: number;
  onGenerate: () => void;
  reusedPrompt?: string | null;
  onPromptUsed?: () => void;
  hasProcessingVideo?: boolean;
  processingCount?: number;
}

export default function Kling26TextToVideo({ user, currentCredits, onGenerate, reusedPrompt, onPromptUsed, hasProcessingVideo, processingCount = 0 }: Kling26TextToVideoProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [generateAudio, setGenerateAudio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<CreditPricing[]>([]);
  const [hasAccess, setHasAccess] = useState(true);
  const [accessMessage, setAccessMessage] = useState('');

  useEffect(() => {
    const loadPricing = async () => {
      const { data } = await supabase
        .from('credit_pricing')
        .select('*')
        .eq('model_type', 'kling')
        .eq('model_version', 'v2.6')
        .eq('variant', 'text-to-video')
        .eq('role', user.role || 'user')
        .order('duration', { ascending: true });

      if (data) setPricing(data);
    };

    const checkAccess = async () => {
      const accessResult = await checkModelAccess(user, 'v2.6', 'text-to-video');
      setHasAccess(accessResult.hasAccess);
      if (accessResult.message) setAccessMessage(accessResult.message);
    };

    loadPricing();
    checkAccess();
  }, [user]);

  useEffect(() => {
    if (reusedPrompt) {
      setPrompt(reusedPrompt);
      onPromptUsed?.();
    }
  }, [reusedPrompt, onPromptUsed]);

  const getCreditCost = () => {
    const item = pricing.find(p => p.duration === duration && p.audio_enabled === generateAudio);
    return item ? item.price : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAccess || (hasProcessingVideo && user.role === 'user')) {
      return;
    }

    const creditCost = getCreditCost();
    if (currentCredits < creditCost) {
      return;
    }

    setLoading(true);
    try {
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
            modelType: 'kling',
            modelVersion: 'v2.6',
            variant: 'text-to-video',
            prompt,
            duration,
            aspectRatio,
            generateAudio,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal generate video');
      }

      setPrompt('');
      onGenerate();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Kling v2.6 - Text to Video</h2>

      {!hasAccess && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">Tidak tersedia untuk demo user</p>
            <p className="text-xs text-red-700">Model ini tidak tersedia untuk akun Anda. Hubungi admin untuk upgrade akun.</p>
          </div>
        </div>
      )}

      {hasProcessingVideo && user.role === 'user' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 mb-1">Batas maksimal tercapai ({processingCount} / 3)</p>
            <p className="text-xs text-yellow-700">Anda sudah memiliki 3 video yang sedang diproses. Harap tunggu hingga ada yang selesai sebelum memulai generate baru.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <option value="9:16">9:16 (Portrait)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durasi
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 detik</option>
              <option value={10}>10 detik</option>
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateAudio}
              onChange={(e) => setGenerateAudio(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Generate Audio</span>
          </label>
        </div>

        <div className={`${currentCredits < getCreditCost() ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Biaya Generate:</span>
            <span className="font-semibold text-blue-600">{getCreditCost()} credits</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-700">Sisa Kredit Setelah Generate:</span>
            <span className="font-semibold text-gray-800">{(currentCredits - getCreditCost()).toFixed(2)} credits</span>
          </div>
          {currentCredits < getCreditCost() && (
            <p className="text-xs mt-2 text-red-600 font-semibold">Kredit tidak cukup untuk generate video ini</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || currentCredits < getCreditCost() || !hasAccess || (hasProcessingVideo && user.role === 'user')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : !hasAccess ? (
            <>
              <Video className="w-5 h-5" />
              Tidak Tersedia untuk Demo User
            </>
          ) : (hasProcessingVideo && user.role === 'user') ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Menunggu Video Selesai...
            </>
          ) : currentCredits < getCreditCost() ? (
            <>
              <AlertCircle className="w-5 h-5" />
              Kredit Tidak Cukup
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
  );
}
