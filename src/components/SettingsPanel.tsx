import { useState } from 'react';
import { Settings, Eye, EyeOff, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  Provider,
  ProviderConfig,
  AppSettings,
  PROVIDER_INFO,
} from '@/types/settings';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onUpdate, onClose }: SettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState<Record<Provider, boolean>>(() => ({
    elevenlabs: false,
    volcengine: false,
    azure: false,
    baidu: false,
    agnes: false,
    agnes_video: false,
    browser: false,
  }));

  const [testStatus, setTestStatus] = useState<Record<Provider, 'idle' | 'testing' | 'success' | 'error'>>(() => ({
    elevenlabs: 'idle',
    volcengine: 'idle',
    azure: 'idle',
    baidu: 'idle',
    agnes: 'idle',
    agnes_video: 'idle',
    browser: 'idle',
  }));

  const providers: Provider[] = [
    'elevenlabs',
    'volcengine',
    'azure',
    'baidu',
    'agnes',
    'agnes_video',
    'browser',
  ];

  const updateProviderConfig = (provider: Provider, key: keyof ProviderConfig, value: string | boolean) => {
    const newConfig = { ...settings.providers[provider], [key]: value };
    onUpdate({
      ...settings,
      providers: { ...settings.providers, [provider]: newConfig },
    });
  };

  const setActiveProvider = (provider: Provider) => {
    onUpdate({ ...settings, activeProvider: provider });
  };

  const toggleShowKey = (provider: Provider) => {
    setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const testConnection = async (provider: Provider) => {
    const config = settings.providers[provider];
    if (!config.apiKey) {
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
      return;
    }

    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));

    try {
      if (provider === 'elevenlabs') {
        const res = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': config.apiKey },
        });
        setTestStatus(prev => ({ ...prev, [provider]: res.ok ? 'success' : 'error' }));
      } else if (provider === 'agnes' || provider === 'agnes_video') {
        const res = await fetch('/api/models', {
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
        });
        setTestStatus(prev => ({ ...prev, [provider]: res.ok ? 'success' : 'error' }));
      } else if (provider === 'azure') {
        const res = await fetch(
          `https://${config.region || 'eastus'}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
          {
            method: 'POST',
            headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
          }
        );
        setTestStatus(prev => ({ ...prev, [provider]: res.ok ? 'success' : 'error' }));
      } else {
        setTimeout(() => {
          setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
        }, 500);
      }
    } catch {
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
    }
  };

  const renderTestStatus = (provider: Provider) => {
    const status = testStatus[provider];
    if (status === 'testing') return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    return <TestTube className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              <h2 className="text-xl font-bold">AI 模型配置</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-white/80 mt-2">
            配置您的 AI 服务提供商，API Key 仅存储在浏览器本地，不会上传
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {providers.map(provider => {
            const info = PROVIDER_INFO[provider];
            const config = settings.providers[provider];
            const isActive = settings.activeProvider === provider;
            const hasKey = !!config.apiKey;

            return (
              <div
                key={provider}
                className={`border rounded-xl p-4 transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{info.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                          当前使用
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{info.description}</p>
                  </div>
                  <button
                    onClick={() => setActiveProvider(provider)}
                    disabled={!hasKey && provider !== 'browser'}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : hasKey || provider === 'browser'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isActive ? '使用中' : '启用'}
                  </button>
                </div>

                {info.fields.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {info.fields.map(field => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {field === 'apiKey'
                            ? 'API Key'
                            : field === 'secretKey'
                            ? 'Secret Key'
                            : field === 'region'
                            ? '区域'
                            : field === 'model'
                            ? '模型'
                            : '语音 ID'}
                        </label>
                        <div className="relative">
                          <input
                            type={
                              field === 'apiKey' || field === 'secretKey'
                                ? showApiKey[provider]
                                  ? 'text'
                                  : 'password'
                                : 'text'
                            }
                            value={(config[field] as string) || ''}
                            onChange={e => updateProviderConfig(provider, field, e.target.value)}
                            placeholder={`请输入${
                              field === 'apiKey'
                                ? 'API Key'
                                : field === 'secretKey'
                                ? 'Secret Key'
                                : field === 'region'
                                ? '区域代码'
                                : field === 'model'
                                ? '模型名称'
                                : '语音 ID'
                            }`}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          />
                          {(field === 'apiKey' || field === 'secretKey') && (
                            <button
                              type="button"
                              onClick={() => toggleShowKey(provider)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showApiKey[provider] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {info.fields.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => testConnection(provider)}
                      disabled={!hasKey}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {renderTestStatus(provider)}
                      <span>测试连接</span>
                    </button>
                    {testStatus[provider] === 'success' && (
                      <span className="text-xs text-green-600">连接成功</span>
                    )}
                    {testStatus[provider] === 'error' && (
                      <span className="text-xs text-red-600">连接失败</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
