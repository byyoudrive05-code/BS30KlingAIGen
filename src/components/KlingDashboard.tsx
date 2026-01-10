import { useState, useEffect, useCallback } from 'react';
import { LogOut, Settings, Video } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import History from './History';
import VideoPreview from './VideoPreview';
import AdminPanel from './AdminPanel';
import KlingNav, { KlingVersion } from './KlingNav';
import Kling26TextToVideo from './kling/Kling26TextToVideo';
import Kling26ImageToVideo from './kling/Kling26ImageToVideo';
import Kling26MotionControlStandard from './kling/Kling26MotionControlStandard';
import Kling26MotionControlPro from './kling/Kling26MotionControlPro';
import Kling25ImageToVideoStandard from './kling/Kling25ImageToVideoStandard';
import Kling25TextToVideoPro from './kling/Kling25TextToVideoPro';
import Kling25ImageToVideoPro from './kling/Kling25ImageToVideoPro';
import Kling21ImageToVideoStandard from './kling/Kling21ImageToVideoStandard';
import Kling21ImageToVideoPro from './kling/Kling21ImageToVideoPro';

interface KlingDashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
}

export default function KlingDashboard({ user: initialUser, onLogout, onUserUpdate }: KlingDashboardProps) {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [currentCredits, setCurrentCredits] = useState(initialUser.credits);
  const [currentVersion, setCurrentVersion] = useState<KlingVersion>('v2.6-text-to-video');
  const [reusedPrompt, setReusedPrompt] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [hasProcessingVideo, setHasProcessingVideo] = useState(false);

  useEffect(() => {
    console.log('KlingDashboard: User prop updated', { role: initialUser.role, username: initialUser.username });
    setCurrentUser(initialUser);
  }, [initialUser]);

  const checkProcessingStatus = useCallback(async () => {
    if (currentUser.role !== 'user') {
      setHasProcessingVideo(false);
      return;
    }

    const { data, error } = await supabase
      .from('generation_history')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('status', 'processing')
      .limit(1);

    if (!error && data) {
      setHasProcessingVideo(data.length > 0);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    checkProcessingStatus();

    const channel = supabase
      .channel('generation_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_history',
          filter: `user_id=eq.${currentUser.id}`
        },
        () => {
          checkProcessingStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, checkProcessingStatus]);

  const refreshUserData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      let userCredits = 0;
      if (!error && data) {
        console.log('Refreshed user data from DB:', { role: data.role, username: data.username });
        userCredits = Number(data.credits) || 0;
        setCurrentUser(data);
        if (onUserUpdate) {
          onUserUpdate(data);
        }
      }

      const { data: apiKeys, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('credits')
        .eq('user_id', currentUser.id)
        .eq('is_active', true);

      let apiKeyCredits = 0;
      if (!apiKeysError && apiKeys) {
        apiKeyCredits = apiKeys.reduce((sum, key) => sum + Number(key.credits), 0);
      }

      setCurrentCredits(userCredits + apiKeyCredits);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  }, [currentUser.id, onUserUpdate]);

  useEffect(() => {
    refreshUserData();

    const interval = setInterval(() => {
      refreshUserData();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshUserData]);

  const handleGenerate = useCallback(async () => {
    await refreshUserData();
    setHistoryRefreshTrigger(prev => prev + 1);
  }, [refreshUserData]);

  const renderKlingComponent = () => {
    const props = {
      user: currentUser,
      currentCredits,
      onGenerate: handleGenerate,
      reusedPrompt,
      onPromptUsed: () => setReusedPrompt(null),
      hasProcessingVideo,
    };

    switch (currentVersion) {
      case 'v2.6-text-to-video':
        return <Kling26TextToVideo {...props} />;
      case 'v2.6-image-to-video':
        return <Kling26ImageToVideo {...props} />;
      case 'v2.6-motion-control-standard':
        return <Kling26MotionControlStandard {...props} />;
      case 'v2.6-motion-control-pro':
        return <Kling26MotionControlPro {...props} />;
      case 'v2.5-image-to-video-standard':
        return <Kling25ImageToVideoStandard {...props} />;
      case 'v2.5-text-to-video-pro':
        return <Kling25TextToVideoPro {...props} />;
      case 'v2.5-image-to-video-pro':
        return <Kling25ImageToVideoPro {...props} />;
      case 'v2.1-image-to-video-standard':
        return <Kling21ImageToVideoStandard {...props} />;
      case 'v2.1-image-to-video-pro':
        return <Kling21ImageToVideoPro {...props} />;
      default:
        return <Kling26TextToVideo {...props} />;
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
                <p className="text-sm font-medium text-gray-700">{currentUser.username}</p>
                <p className="text-xs text-gray-600">
                  {currentCredits.toFixed(2)} credits
                </p>
              </div>

              {currentUser.is_admin && (
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
        <KlingNav currentVersion={currentVersion} onVersionChange={setCurrentVersion} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderKlingComponent()}

          <History
            userId={currentUser.id}
            onVideoClick={setPreviewVideo}
            onReusePrompt={(prompt) => {
              setReusedPrompt(prompt);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            refreshTrigger={historyRefreshTrigger}
          />
        </div>
      </main>

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} currentUser={currentUser} />
      )}

      {previewVideo && (
        <VideoPreview videoUrl={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
    </div>
  );
}
