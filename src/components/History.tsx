import { useEffect, useState } from 'react';
import { Play, Clock, Check, XCircle, Loader, History as HistoryIcon, Download, RefreshCw, Copy, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GenerationHistory } from '../types';

interface HistoryProps {
  userId: string;
  onVideoClick: (videoUrl: string) => void;
  onReusePrompt: (prompt: string) => void;
  refreshTrigger?: number;
}

const ITEMS_PER_PAGE = 15;

export default function History({ userId, onVideoClick, onReusePrompt, refreshTrigger }: HistoryProps) {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadHistory();
    loadTotalCount();
    pollVideoStatus();
    const interval = setInterval(() => {
      loadHistory();
      loadTotalCount();
      pollVideoStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [userId, currentPage]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadHistory();
      loadTotalCount();
    }
  }, [refreshTrigger]);

  const pollVideoStatus = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/poll-video-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
    } catch (err) {
      console.error('Error polling video status:', err);
    }
  };

  const loadTotalCount = async () => {
    try {
      const { count, error } = await supabase
        .from('generation_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!error && count !== null) {
        setTotalCount(count);
      }
    } catch (err) {
      console.error('Error loading count:', err);
    }
  };

  const loadHistory = async () => {
    try {
      console.log('[History] Loading history for userId:', userId);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('generation_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      console.log('[History] Query result:', {
        hasError: !!error,
        error: error?.message,
        dataLength: data?.length || 0,
        data: data
      });

      if (!error && data) {
        setHistory(data);
      } else if (error) {
        console.error('[History] Database error:', error);
      }
    } catch (err) {
      console.error('[History] Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'processing':
        return 'Proses';
      case 'failed':
        return 'Gagal';
      default:
        return status;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await pollVideoStatus();
    await loadHistory();
    await loadTotalCount();
    setRefreshing(false);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleDownload = (videoUrl: string, requestId: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video-${requestId}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = async (prompt: string, id: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Error copying prompt:', err);
      alert('Gagal menyalin prompt');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-blue-600" />
          Riwayat Generate
        </h2>
        <div className="text-center py-8 text-gray-500">Memuat riwayat...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-blue-600" />
            Riwayat Generate
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="Refresh status video"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Belum ada riwayat generate
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} dari {totalCount} riwayat
          </div>
          <div className="space-y-3">
            {history.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                {item.status === 'completed' && item.video_url && (
                  <div className="flex-shrink-0 relative group">
                    <video
                      src={item.video_url}
                      className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => onVideoClick(item.video_url!)}
                    >
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.prompt}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleCopyPrompt(item.prompt, item.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                      title="Copy prompt"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onReusePrompt(item.prompt)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      title="Gunakan ulang prompt"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Gunakan Ulang
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      {getStatusIcon(item.status)}
                      {getStatusText(item.status)}
                    </span>
                    <span>{item.aspect_ratio}</span>
                    <span>{item.duration}s</span>
                    <span>{item.credits_used} credits</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.created_at).toLocaleString('id-ID')}
                  </p>
                </div>

                {item.status === 'completed' && item.video_url && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onVideoClick(item.video_url!)}
                      className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                      title="Preview Video"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(item.video_url!, item.request_id)}
                      className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                      title="Download Video"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page as number)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
                title="Halaman berikutnya"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
