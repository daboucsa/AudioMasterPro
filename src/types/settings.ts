export type Provider = 'elevenlabs' | 'volcengine' | 'azure' | 'baidu' | 'agnes' | 'agnes_video' | 'browser';

export interface ProviderConfig {
  apiKey?: string;
  secretKey?: string;
  region?: string;
  model?: string;
  voiceId?: string;
  useProxy?: boolean;
}

export interface AppSettings {
  activeProvider: Provider;
  providers: Record<Provider, ProviderConfig>;
}

export interface VoiceOption {
  value: string;
  label: string;
  description: string;
  lang?: string;
}

export const VOICE_OPTIONS: Partial<Record<Provider, VoiceOption[]>> = {
  agnes: [
    { value: 'alloy', label: 'Alloy', description: '中性平衡，适合大多数场景' },
    { value: 'echo', label: 'Echo', description: '温暖亲切，适合对话' },
    { value: 'fable', label: 'Fable', description: '有个性，适合讲故事' },
    { value: 'onyx', label: 'Onyx', description: '深沉权威，适合正式内容' },
    { value: 'nova', label: 'Nova', description: '明亮有活力，适合积极内容' },
    { value: 'shimmer', label: 'Shimmer', description: '柔和轻柔，适合平静内容' },
  ],
  elevenlabs: [
    { value: 'Josh', label: 'Josh', description: '美式英语，富有激情' },
    { value: 'Arnold', label: 'Arnold', description: '德式口音，沉稳有力' },
    { value: 'River', label: 'River', description: '中性英语，清晰自然' },
    { value: 'Clyde', label: 'Clyde', description: '美式南部口音' },
    { value: 'Paula', label: 'Paula', description: '温暖女声' },
    { value: 'Dorothy', label: 'Dorothy', description: '庄重女声' },
    { value: 'Serena', label: 'Serena', description: '温柔女声' },
    { value: 'Mimi', label: 'Mimi', description: '年轻活力女声' },
  ],
  azure: [
    { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓（中文女）', description: '温柔亲切，中文首选' },
    { value: 'zh-CN-YunxiNeural', label: '云希（中文男）', description: '温暖自然，中文男声' },
    { value: 'zh-CN-YunyangNeural', label: '云扬（中文男）', description: '新闻播报风格' },
    { value: 'en-US-GuyNeural', label: 'Guy（英文男）', description: '自然美式英语' },
    { value: 'en-US-JennyNeural', label: 'Jenny（英文女）', description: '友好女声' },
    { value: 'en-GB-SoniaNeural', label: 'Sonia（英式女）', description: '英式英语' },
  ],
};

export const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: 'browser',
  providers: {
    elevenlabs: { apiKey: '', model: 'eleven_multilingual_v2', voiceId: '' },
    volcengine: { apiKey: '', secretKey: '', model: 'doubao-tts', voiceId: '' },
    azure: { apiKey: '', region: '', model: 'tts-1', voiceId: '' },
    baidu: { apiKey: '', secretKey: '', model: 'tts', voiceId: '' },
    agnes: { apiKey: '', model: 'tts-1', voiceId: 'onyx', useProxy: false },
    agnes_video: { apiKey: '', model: 'agnes-video-v2.0', voiceId: '', useProxy: false },
    browser: {},
  },
};

export const PROVIDER_INFO: Record<Provider, {
  name: string;
  description: string;
  fields: ('apiKey' | 'secretKey' | 'region' | 'model' | 'voiceId')[];
}> = {
  elevenlabs: {
    name: 'ElevenLabs',
    description: '高品质语音合成，支持多语言',
    fields: ['apiKey', 'model', 'voiceId'],
  },
  volcengine: {
    name: '火山引擎',
    description: '豆包 TTS 语音合成服务',
    fields: ['apiKey', 'secretKey', 'model', 'voiceId'],
  },
  azure: {
    name: 'Azure TTS',
    description: '微软 Azure 语音服务',
    fields: ['apiKey', 'region', 'model', 'voiceId'],
  },
  baidu: {
    name: '百度 TTS',
    description: '百度语音合成服务',
    fields: ['apiKey', 'secretKey', 'model', 'voiceId'],
  },
  agnes: {
    name: 'Agnes TTS',
    description: 'Agnes AI 语音合成（灰度测试中）',
    fields: ['apiKey', 'model', 'voiceId'],
  },
  agnes_video: {
    name: 'Agnes 视频转音频',
    description: '通过 Agnes 视频生成 API 合成音频（支持中文）',
    fields: ['apiKey', 'model', 'voiceId'],
  },
  browser: {
    name: '浏览器内置',
    description: '使用浏览器内置 Web Speech API，无需配置',
    fields: [],
  },
};

const STORAGE_KEY = 'audiomaster_settings';

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        providers: {
          ...DEFAULT_SETTINGS.providers,
          ...(parsed.providers || {}),
        },
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
