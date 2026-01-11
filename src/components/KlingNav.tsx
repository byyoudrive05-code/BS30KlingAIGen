import { Video } from 'lucide-react';

export type KlingVersion =
  | 'v2.6-text-to-video'
  | 'v2.6-image-to-video'
  | 'v2.6-motion-control-standard'
  | 'v2.6-motion-control-pro'
  | 'v2.5-image-to-video-standard'
  | 'v2.5-text-to-video-pro'
  | 'v2.5-image-to-video-pro'
  | 'v2.1-image-to-video-standard'
  | 'v2.1-image-to-video-pro';

interface KlingNavProps {
  currentVersion: KlingVersion;
  onVersionChange: (version: KlingVersion) => void;
}

export default function KlingNav({ currentVersion, onVersionChange }: KlingNavProps) {
  const versions = [
    {
      label: 'Kling v2.6',
      options: [
        { value: 'v2.6-text-to-video', label: 'Text to Video' },
        { value: 'v2.6-image-to-video', label: 'Image to Video' },
        { value: 'v2.6-motion-control-standard', label: 'Motion Control Standard' },
        { value: 'v2.6-motion-control-pro', label: 'Motion Control Pro' },
      ]
    },
    {
      label: 'Kling v2.5 Turbo',
      options: [
        { value: 'v2.5-image-to-video-standard', label: 'Image to Video Standard' },
        { value: 'v2.5-text-to-video-pro', label: 'Text to Video Pro' },
        { value: 'v2.5-image-to-video-pro', label: 'Image to Video Pro' },
      ]
    },
    {
      label: 'Kling v2.1',
      options: [
        { value: 'v2.1-image-to-video-standard', label: 'Image to Video Standard' },
        { value: 'v2.1-image-to-video-pro', label: 'Image to Video Pro' },
      ]
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">

      
      
      <div className="flex items-center gap-3 mb-4">
        <Video className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">Pilih Model Kling AI</h2>
      </div>

      <div className="space-y-4">
        {versions.map((group) => (
          <div key={group.label}>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{group.label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onVersionChange(option.value as KlingVersion)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    currentVersion === option.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
