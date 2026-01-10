import { X } from 'lucide-react';

interface VideoPreviewProps {
  videoUrl: string;
  onClose: () => void;
}

export default function VideoPreview({ videoUrl, onClose }: VideoPreviewProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Video Preview</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 bg-black flex-1 overflow-auto flex items-center justify-center">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full max-h-[60vh] rounded-lg"
            style={{ objectFit: 'contain' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="p-4 bg-gray-50 flex gap-3 justify-end flex-shrink-0">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Buka di Tab Baru
          </a>
          <a
            href={videoUrl}
            download
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Download Video
          </a>
        </div>
      </div>
    </div>
  );
}
