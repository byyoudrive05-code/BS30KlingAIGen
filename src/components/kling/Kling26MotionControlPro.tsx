import { useState, useEffect } from 'react';
import { Video, Loader, Image as ImageIcon, Film, AlertCircle } from 'lucide-react';
import { User, CreditPricing } from '../../types';
import { supabase } from '../../lib/supabase';
import { checkModelAccess, checkProcessingStatus } from '../../lib/modelAccess';

interface Kling26MotionControlProProps {
  user: User;
  currentCredits: number;
  onGenerate: () => void;
  reusedPrompt?: string | null;
  onPromptUsed?: () => void;
  hasProcessingVideo?: boolean;
}

export default function Kling26MotionControlPro({ user, currentCredits, onGenerate, reusedPrompt, onPromptUsed, hasProcessingVideo }: Kling26MotionControlProProps) {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [characterOrientation, setCharacterOrientation] = useState<string>('video');
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [pricePerSecond, setPricePerSecond] = useState(0.112);
  const [hasAccess, setHasAccess] = useState(true);
  const [accessMessage, setAccessMessage] = useState('');

  useEffect(() => {
    const loadPricing = async () => {
      const { data } = await supabase
        .from('credit_pricing')
        .select('*')
        .eq('model_type', 'kling')
        .eq('model_version', 'v2.6')
        .eq('variant', 'motion-control-pro')
        .eq('role', user.role || 'user')
        .maybeSingle();

      if (data) setPricePerSecond(data.price);
    };
    loadPricing();

    const checkAccess = async () => {
      const accessResult = await checkModelAccess(user, 'v2.6', 'motion-control-pro');
      setHasAccess(accessResult.hasAccess);
      if (accessResult.message) setAccessMessage(accessResult.message);
    };
    checkAccess();
  }, [user]);

  useEffect(() => {
    if (reusedPrompt) {
      setPrompt(reusedPrompt);
      onPromptUsed?.();
    }
  }, [reusedPrompt, onPromptUsed]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          if (img.width > 3850 || img.height > 3850) {
            alert('Dimensi gambar maksimal 3850x3850 pixels');
            setImageFile(null);
            setImagePreview('');
          } else {
            setImageFile(file);
            setImagePreview(imageUrl);
          }
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const videoUrl = reader.result as string;
        setVideoPreview(videoUrl);

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const duration = Math.round(video.duration);
          let maxDuration = (user.role === 'admin' || user.role === 'premium') ? 30 : 10;

          if (characterOrientation === 'image' && duration > 10) {
            alert('Untuk character orientation "image", durasi video maksimal 10 detik');
            setVideoFile(null);
            setVideoPreview('');
            setVideoDuration(0);
          } else if (duration > maxDuration) {
            setVideoFile(null);
            setVideoPreview('');
            setVideoDuration(0);
          } else {
            setVideoFile(file);
            setVideoDuration(duration);
          }
        };
        video.src = videoUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    setVideoDuration(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAccess || (hasProcessingVideo && user.role === 'user')) {
      return;
    }

    if (!imageFile && !videoFile) {
      return;
    }

    if (characterOrientation === 'image' && videoDuration > 10) {
      alert('Untuk character orientation "image", durasi video maksimal 10 detik');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      let videoUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
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

      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, videoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error('Gagal upload video: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        videoUrl = urlData.publicUrl;
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
            modelType: 'kling',
            modelVersion: 'v2.6',
            variant: 'motion-control-pro',
            prompt,
            imageUrl,
            videoUrl,
            characterOrientation,
            keepOriginalSound,
            duration: videoDuration,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal generate video');
      }

      setPrompt('');
      clearImage();
      clearVideo();
      setCharacterOrientation('video');
      onGenerate();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Kling v2.6 - Motion Control Pro</h2>

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
            <p className="text-sm font-semibold text-yellow-800 mb-1">Video sedang diproses</p>
            <p className="text-xs text-yellow-700">Harap tunggu hingga video sebelumnya selesai diproses sebelum memulai generate baru. Cek riwayat untuk status video.</p>
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
            placeholder="Deskripsikan gerakan atau kontrol motion yang diinginkan..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Gambar
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg"
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
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Klik untuk upload gambar</span>
                <span className="text-xs text-gray-500 mt-1">Max: 3850x3850 pixels</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Video
            </label>
            {videoPreview ? (
              <div className="relative">
                <video
                  src={videoPreview}
                  className="w-full h-40 object-cover rounded-lg"
                  controls
                />
                <button
                  type="button"
                  onClick={clearVideo}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                >
                  <Film className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                <Film className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Klik untuk upload video</span>
                <span className="text-xs text-gray-500 mt-1">
                  {user.role === 'user' ? 'Max: 10 detik' : 'Max: 30 detik (Premium/Admin)'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Character Orientation
          </label>
          <select
            value={characterOrientation}
            onChange={(e) => setCharacterOrientation(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="video">Video</option>
            <option value="image">Image (max 10 detik)</option>
          </select>
          {characterOrientation === 'image' && (
            <p className="text-xs text-gray-600 mt-1">
              Untuk character orientation "image", durasi video maksimal 10 detik
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={keepOriginalSound}
              onChange={(e) => setKeepOriginalSound(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Keep Original Sound</span>
          </label>
        </div>

        <div className={`${videoDuration > 0 && (pricePerSecond * videoDuration) > currentCredits ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
          <div className="text-sm text-gray-700">
            {videoDuration > 0 ? (
              <>
                <p className="font-semibold">Durasi Video: {videoDuration} detik</p>
                <p className="font-semibold">Perkiraan Biaya: {(pricePerSecond * videoDuration).toFixed(2)} credits</p>
                <p className="text-xs mt-1 text-gray-600">Kredit Anda saat ini: {currentCredits.toFixed(2)}</p>
                {(pricePerSecond * videoDuration) > currentCredits && (
                  <p className="text-xs mt-2 text-red-600 font-semibold">Kredit tidak cukup untuk generate video ini</p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">Biaya: {pricePerSecond} credits per detik</p>
                <p className="text-xs mt-1 text-gray-600">Upload video untuk melihat perkiraan biaya (maks. {(user.role === 'admin' || user.role === 'premium') ? '30' : '10'} detik) (Premium maks. 30 detik)</p>
              </>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (!imageFile && !videoFile) || !hasAccess || (hasProcessingVideo && user.role === 'user') || (videoDuration > 0 && (pricePerSecond * videoDuration) > currentCredits)}
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
          ) : (videoDuration > 0 && (pricePerSecond * videoDuration) > currentCredits) ? (
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
