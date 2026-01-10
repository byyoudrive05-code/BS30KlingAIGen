import { useState } from 'react';
import { Search, Loader, Check, XCircle } from 'lucide-react';

interface StatusCheckerProps {
  apiKey: string;
}

export default function StatusChecker({ apiKey }: StatusCheckerProps) {
  const [requestId, setRequestId] = useState('');
  const [endpoint, setEndpoint] = useState('fal-ai/kling-video/v2.6/pro/text-to-video');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    if (!requestId.trim()) {
      setError('Masukkan request ID');
      return;
    }

    if (!endpoint.trim()) {
      setError('Masukkan endpoint');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-video-status`;

      console.log('Calling edge function:', apiUrl);
      console.log('Request ID:', requestId.trim());

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          request_id: requestId.trim(),
          api_key: apiKey,
          endpoint: endpoint.trim(),
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(`Error ${response.status}: ${errorData.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.status === 'COMPLETED') {
        setResult({
          status: 'COMPLETED',
          video_url: data.video_url,
          full_response: data.full_response
        });
      } else {
        setResult({
          status: data.status,
          message: data.message || JSON.stringify(data.full_response, null, 2)
        });
      }
    } catch (err: any) {
      console.error('Error checking status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Search className="w-6 h-6 text-blue-600" />
        Manual Status Checker
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endpoint (Full Path)
          </label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="e.g., fal-ai/kling-video/v2.6/pro/text-to-video"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-1">
              PENTING: Gunakan full endpoint path yang SAMA dengan saat generate!
            </p>
            <p className="text-xs text-blue-700">
              Contoh endpoint yang valid:
              <br />
              <code className="bg-blue-100 px-1 rounded">fal-ai/kling-video/v2.6/pro/text-to-video</code>
              <br />
              <code className="bg-blue-100 px-1 rounded">fal-ai/kling-video/v2.6/pro/image-to-video</code>
              <br />
              <code className="bg-blue-100 px-1 rounded">fal-ai/kling-video/v2.5-turbo/pro/text-to-video</code>
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Request ID dari fal.ai
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="Masukkan request ID..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={checkStatus}
              disabled={loading || !requestId.trim() || !endpoint.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Check
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Error:</p>
              <pre className="mt-1 whitespace-pre-wrap">{error}</pre>
            </div>
          </div>
        )}

        {result && (
          <div className={`p-4 border rounded-lg ${
            result.status === 'COMPLETED'
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-2">
              {result.status === 'COMPLETED' ? (
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Loader className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm mb-2">
                  Status: {result.status}
                </p>

                {result.video_url && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">Video URL:</p>
                    <a
                      href={result.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {result.video_url}
                    </a>
                    <video
                      src={result.video_url}
                      controls
                      className="w-full max-w-md rounded-lg mt-2"
                    />
                  </div>
                )}

                {result.message && (
                  <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                    {result.message}
                  </pre>
                )}

                {result.full_response && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                      Full Response
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto bg-gray-50 p-2 rounded">
                      {JSON.stringify(result.full_response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
