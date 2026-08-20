import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Play, Loader2, Video, Music, AlertCircle, Sparkles, Mic, Upload, FileAudio, CheckCircle } from 'lucide-react';
import SettingsPanel from '@/components/SettingsPanel';
import {
  AppSettings,
  Provider,
  ProviderConfig,
  loadSettings,
  saveSettings,
  PROVIDER_INFO,
  VOICE_OPTIONS,
} from '@/types/settings';

export default function Home() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [text, setText] = useState('Hello, welcome to AudioMaster. This is a test of the Agnes video-to-audio feature.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [pendingRecordingBlob, setPendingRecordingBlob] = useState<Blob | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [voiceNameInput, setVoiceNameInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<{ name: string; size: string } | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customVoices, setCustomVoices] = useState<{ id: string; name: string; audio: string }[]>(() => {
    try {
      const saved = localStorage.getItem('audiomaster_custom_voices');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const load = () => setBrowserVoices(speechSynthesis.getVoices());
      load();
      speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    return () => {
      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
      if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [currentAudioUrl, currentVideoUrl]);

  const activeConfig: ProviderConfig = settings.providers[settings.activeProvider];

  const synthesizeAgnesVideo = useCallback(async (text: string, config: { apiKey: string; model?: string }) => {
    const model = config.model || 'agnes-video-v2.0';
    setGenerationStatus('正在创建 Agnes 视频任务...');

    const createRes = await fetch('/api/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: text,
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text().catch(() => '');
      throw new Error(`Agnes 创建任务失败 (${createRes.status}): ${errorText}`);
    }

    const createData = await createRes.json();
    const videoId = createData.video_id || createData.id || createData.task_id;
    if (!videoId) {
      throw new Error(`Agnes 创建任务响应异常: ${JSON.stringify(createData).slice(0, 300)}`);
    }

    setGenerationStatus('视频任务已创建，等待生成...');

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      setGenerationStatus(`视频生成中... (${attempt + 1}/30)`);

      const pollRes = await fetch(`/api/agnes/video/${encodeURIComponent(videoId)}`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
      });

      if (!pollRes.ok) {
        lastError = new Error(`查询任务失败 (${pollRes.status})`);
        continue;
      }

      const pollData = await pollRes.json();
      const status = pollData.status || pollData.state;

      if (status === 'succeeded' || status === 'completed' || status === 'success') {
        const videoUrl =
          pollData.video_url ||
          pollData.url ||
          (pollData.video && (pollData.video.url || pollData.video.video_url)) ||
          (pollData.data && (pollData.data.url || pollData.data.video_url));

        if (videoUrl) return videoUrl as string;
      } else if (status === 'failed' || status === 'error' || status === 'cancelled') {
        const errMsg = pollData.error?.message || pollData.message || `任务状态: ${status}`;
        throw new Error(`视频生成失败: ${errMsg}`);
      }

      lastError = null;
    }

    throw lastError || new Error('视频生成超时，请稍后重试');
  }, []);

  const videoToAudio = useCallback(async (videoUrl: string): Promise<string> => {
    setGenerationStatus('正在从视频中提取音频...');

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.muted = false;

      let stream: MediaStream | null = null;
      let mediaRecorder: MediaRecorder | null = null;
      let audioChunks: Blob[] = [];

      const cleanup = () => {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          try { mediaRecorder.stop(); } catch { /* noop */ }
        }
        video.pause();
        video.src = '';
      };

      const startCapture = async () => {
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(video);
          const destination = audioCtx.createMediaStreamDestination();
          source.connect(destination);
          source.connect(audioCtx.destination);

          stream = destination.stream;
          const mimeTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/webm;codecs=opus'];
          let mimeType = '';
          for (const mt of mimeTypes) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mt)) {
              mimeType = mt;
              break;
            }
          }

          if (!mimeType) {
            cleanup();
            reject(new Error('当前浏览器不支持 MediaRecorder API'));
            return;
          }

          mediaRecorder = new MediaRecorder(stream, { mimeType });
          audioChunks = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunks.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            if (audioChunks.length === 0) {
              cleanup();
              reject(new Error('未捕获到音频数据'));
              return;
            }
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            cleanup();
            resolve(audioUrl);
          };

          mediaRecorder.start(100);
          video.play().catch(err => {
            cleanup();
            reject(new Error(`视频播放失败: ${err.message}`));
          });
        } catch (err) {
          cleanup();
          reject(new Error(`音频捕获失败: ${(err as Error).message}`));
        }
      };

      video.addEventListener('loadeddata', () => {
        startCapture().catch(reject);
      });

      video.addEventListener('error', () => {
        cleanup();
        reject(new Error('视频加载失败，可能是跨域限制'));
      });

      video.addEventListener('ended', () => {
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 200);
      });

      setTimeout(() => {
        video.play().catch(() => {});
      }, 500);

      setTimeout(() => {
        video.pause();
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 8000);
    });
  }, []);

  const hasChinese = (str: string) => /[\u4e00-\u9fff]/.test(str);

  const handleBrowserTTS = useCallback(async (text: string) => {
    if (!('speechSynthesis' in window)) {
      throw new Error('浏览器不支持语音合成');
    }
    const lang = hasChinese(text) ? 'zh-CN' : 'en-US';
    return new Promise<string>((resolve, reject) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      if (settings.providers.browser.voiceId) {
        const voice = browserVoices.find(v => v.name === settings.providers.browser.voiceId);
        if (voice) utter.voice = voice;
      }
      utter.onend = () => resolve('browser-tts-done');
      utter.onerror = (e) => reject(new Error(`浏览器 TTS 错误: ${e.error}`));
      window.speechSynthesis.speak(utter);
    });
  }, [hasChinese, settings.providers.browser.voiceId, browserVoices]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 44100, channelCount: 1 } });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      recordChunksRef.current = [];
      setRecordDuration(0);
      setRecordError(null);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      recordTimerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
    } catch (err) {
      setRecordError(`无法访问麦克风: ${(err as Error).message}`);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        resolve(null);
        return;
      }

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recorder.onstop = () => {
        const stream = recorder.stream;
        stream?.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        setPendingRecordingBlob(blob);
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  const cloneVoice = useCallback(async (audioBlob: Blob, voiceName: string) => {
    const config = settings.providers.elevenlabs;
    if (!config.apiKey) throw new Error('请先在「AI 配置」中配置 ElevenLabs API Key');

    setGenerationStatus('正在上传音频样本...');
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(audioBlob);
    });

    setGenerationStatus('正在克隆音色...');
    const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: voiceName,
        description: `用户录制的音色 - ${new Date().toLocaleString('zh-CN')}`,
        files: [base64],
        labels: {},
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`音色克隆失败 (${res.status}): ${errText || '请检查 API Key 和权限'}`);
    }

    const data = await res.json();
    const voiceId = data.voice_id;
    if (!voiceId) throw new Error('克隆成功但未返回 voice_id');

    // 保存到自定义音色
    const newVoice = { id: voiceId, name: voiceName, audio: URL.createObjectURL(audioBlob) };
    const updated = [...customVoices, newVoice];
    setCustomVoices(updated);
    localStorage.setItem('audiomaster_custom_voices', JSON.stringify(updated));

    // 更新设置中的音色
    setSettings({
      ...settings,
      activeProvider: 'elevenlabs',
      providers: {
        ...settings.providers,
        elevenlabs: { ...settings.providers.elevenlabs, voiceId },
      },
    });

    return voiceId;
  }, [settings, customVoices]);

  const confirmName = useCallback(async () => {
    const blob = pendingRecordingBlob;
    if (!blob) return;
    const name = voiceNameInput.trim();
    if (!name) return;
    setShowNameDialog(false);
    setVoiceNameInput('');
    setGenerationStatus('正在克隆音色...');
    try {
      await cloneVoice(blob, name);
      setGenerationStatus(null);
      setCustomVoices(prev => [...prev, { id: '', name, audio: URL.createObjectURL(blob) }]);
    } catch (err) {
      setGenerationError(`克隆失败: ${(err as Error).message}`);
      setGenerationStatus(null);
    }
    setPendingRecordingBlob(null);
  }, [pendingRecordingBlob, voiceNameInput, cloneVoice]);

  const transcribeAudio = useCallback(async (file: File) => {
    const config = settings.providers.elevenlabs;
    if (!config.apiKey) throw new Error('请先在「AI 配置」中配置 ElevenLabs API Key');

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/audio/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: config.apiKey, file: base64 }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || '转录失败');
    return data.text;
  }, [settings.providers.elevenlabs.apiKey]);

  const startListening = useCallback(() => {
    const Recognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setText(prev => prev ? prev + transcript : transcript);
      setTranscribeResult(transcript);
    };
    recognition.onerror = (e: any) => {
      setGenerationError(`语音识别错误: ${e.error}`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const handleSynthesize = useCallback(async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStatus('初始化中...');
    setCurrentAudioUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCurrentVideoUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const provider = settings.activeProvider;
    const config = settings.providers[provider];

    try {
      if (provider === 'browser') {
        setGenerationStatus('浏览器合成中...');
        await handleBrowserTTS(text);
        setGenerationStatus(null);
        setGenerationError(null);
        setIsGenerating(false);
        return;
      }

      if (provider === 'agnes_video') {
        if (!config.apiKey) {
          throw new Error('请先在设置中配置 Agnes Video API Key');
        }

        const videoUrl = await synthesizeAgnesVideo(text, config);
        setCurrentVideoUrl(videoUrl);
        setGenerationStatus('视频已生成，正在提取音频...');

        const audioUrl = await videoToAudio(videoUrl);
        setCurrentAudioUrl(audioUrl);

        setGenerationStatus(null);
        setGenerationError(null);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // autoplay blocked, user can press play
        });
        audio.onended = () => setIsPlaying(false);
        setIsGenerating(false);
        return;
      }

      if (provider === 'agnes') {
        if (!config.apiKey) {
          throw new Error('请先在设置中配置 Agnes API Key');
        }

        setGenerationStatus('正在调用 Agnes TTS...');
        try {
          const res = await fetch('/api/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: config.model || 'tts-1',
              input: text,
              voice: config.voiceId || 'onyx',
              response_format: 'mp3',
            }),
          });

          console.log('[TTS] Response status:', res.status, 'contentType:', res.headers.get('content-type'));
          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error('TTS API error:', res.status, errText);
            setGenerationStatus(null);
            setIsGenerating(false);
            if (errText && errText.includes('model') && errText.includes('tts')) {
              throw new Error(`TTS 模型不支持该文本（可能是中文）。建议切换到「Agnes 视频转音频」模式，该模式对中文支持更好。`);
            }
            throw new Error(`Agnes TTS 失败 (${res.status}): ${errText || '请稍后重试'}`);
          }

          const blob = await res.blob();
          console.log('[TTS] Blob size:', blob.size, 'type:', blob.type);
          if (blob.size === 0) {
            setGenerationStatus(null);
            setIsGenerating(false);
            throw new Error('Agnes 返回了空音频数据，可能是文本过长或模型不支持该语言');
          }
          const audioUrl = URL.createObjectURL(blob);
          setCurrentAudioUrl(audioUrl);

          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.play().catch(() => {});
          setIsGenerating(false);
          setGenerationStatus(null);
          return;
        } catch (ttsErr) {
          console.warn('Agnes TTS 失败，尝试视频转音频:', ttsErr);
          const videoConfig = settings.providers.agnes_video;
          if (videoConfig.apiKey) {
            setGenerationError('Agnes TTS 不可用，自动切换到视频转音频模式...');
            try {
              const videoUrl = await synthesizeAgnesVideo(text, videoConfig);
              setCurrentVideoUrl(videoUrl);
              const audioUrl = await videoToAudio(videoUrl);
              setCurrentAudioUrl(audioUrl);

              const audio = new Audio(audioUrl);
              audioRef.current = audio;
              audio.play().catch(() => {});
              setGenerationError(null);
              setIsGenerating(false);
              return;
            } catch (videoErr) {
              console.error('视频转音频也失败:', videoErr);
            }
          }
          throw ttsErr;
        }
      }

      throw new Error(`暂不支持的提供商: ${provider}`);
    } catch (err) {
      const message = (err as Error).message || '未知错误';
      setGenerationError(`生成失败: ${message}`);
      setGenerationStatus(null);
      setIsGenerating(false);
    }
  }, [text, settings, synthesizeAgnesVideo, videoToAudio, handleBrowserTTS]);

  const togglePlay = () => {
    if (!audioRef.current || !currentAudioUrl) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const currentProviderInfo = PROVIDER_INFO[settings.activeProvider];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AudioMaster Pro</h1>
              <p className="text-xs text-white/50">AI 语音合成工作台</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">AI 配置</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            当前引擎：{currentProviderInfo.name}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Agnes 视频转音频测试
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            利用 Agnes 视频生成 API 的音频轨道，将文本转为语音输出。当 TTS 服务不可用时，自动降级到视频转音频模式。
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
          <div>
            <label className="text-sm text-white/70 mb-2 block">输入文本</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="输入要合成的文本..."
              rows={4}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="relative">
            <label className="text-sm text-white/70 mb-2 block">上传音频（自动转录为中文）</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadFile({ name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB` });
                setIsUploading(true);
                setTranscribeResult(null);
                try {
                  const result = await transcribeAudio(file);
                  setTranscribeResult(result);
                  setText(result);
                } catch (err) {
                  setTranscribeResult(null);
                  setGenerationError(`转录失败: ${(err as Error).message}`);
                } finally {
                  setIsUploading(false);
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-black/20 border border-dashed border-white/20 rounded-xl hover:bg-black/30 hover:border-indigo-400/50 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-sm text-white/60">转录中...</span>
                </>
              ) : transcribeResult ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-300">转录完成 — 已填入下方文本</span>
                </>
              ) : uploadFile ? (
                <>
                  <FileAudio className="w-5 h-5 text-white/40" />
                  <span className="text-sm text-white/50">{uploadFile.name} · {uploadFile.size}</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-white/40" />
                  <span className="text-sm text-white/40">点击或拖拽音频文件到此处</span>
                </>
              )}
            </button>
            {isUploading && (
              <p className="text-xs text-white/40 mt-2 text-center">正在将音频转换为中文文本，请稍候...</p>
            )}
          </div>

          {settings.activeProvider === 'browser' && !settings.providers.elevenlabs.apiKey && (
            <div className="flex items-center gap-3">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isListening
                    ? 'bg-red-500/20 border-red-400/50 text-red-300 animate-pulse'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Mic className={`w-4 h-4 ${isListening ? 'text-red-400' : ''}`} />
                {isListening ? '停止听写' : '语音输入（中文）'}
              </button>
              {isListening && (
                <p className="text-xs text-red-300/70 animate-pulse">正在听你说中文，请开始说话...</p>
              )}
              {!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window) && (
                <p className="text-xs text-amber-300/70">浏览器不支持语音识别，请使用 Chrome 或 Edge</p>
              )}
            </div>
          )}

          {(settings.activeProvider === 'agnes' || settings.activeProvider === 'elevenlabs' || settings.activeProvider === 'azure') && (
            <div>
              <label className="text-sm text-white/70 mb-2 block">选择音色</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(VOICE_OPTIONS[settings.activeProvider as Provider] || []).map(v => (
                  <button
                    key={v.value}
                    onClick={() => setSettings({ ...settings, providers: { ...settings.providers, [settings.activeProvider]: { ...settings.providers[settings.activeProvider], voiceId: v.value } } })}
                    className={`px-3 py-2 rounded-lg text-left text-sm transition-all border ${
                      settings.providers[settings.activeProvider].voiceId === v.value
                        ? 'bg-indigo-500/30 border-indigo-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-medium">{v.label}</div>
                    <div className="text-xs text-white/50 mt-0.5">{v.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {settings.activeProvider === 'browser' && browserVoices.length > 0 && (
            <div>
              <label className="text-sm text-white/70 mb-2 block">选择音色</label>
              <select
                value={settings.providers.browser.voiceId || ''}
                onChange={e => setSettings({ ...settings, providers: { ...settings.providers, browser: { ...settings.providers.browser, voiceId: e.target.value } } })}
                className="w-full sm:w-64 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">默认系统音色</option>
                {browserVoices.map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          )}

          {(settings.activeProvider === 'elevenlabs' || settings.activeProvider === 'agnes') && (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={isRecording ? async () => { const blob = await stopRecording(); if (blob) setShowNameDialog(true); } : startRecording}
                  disabled={!settings.providers.elevenlabs.apiKey}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                    isRecording
                      ? 'bg-red-500/20 border-red-400/50 text-red-300 animate-pulse cursor-pointer'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Mic className={`w-4 h-4 ${isRecording ? 'text-red-400' : ''}`} />
                  {isRecording ? `停止录制 (${recordDuration}s)` : '录制我的声音'}
                </button>

                {isRecording && (
                  <div className="flex-1 h-1.5 bg-red-500/30 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${Math.min(recordDuration * 10, 100)}%` }} />
                  </div>
                )}
              </div>

              {recordError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {recordError}
                </div>
              )}

              {customVoices.length > 0 && (
                <div>
                  <label className="text-sm text-white/70 mb-2 block">自定义音色（已克隆）</label>
                  <div className="space-y-2">
                    {customVoices.map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSettings({
                            ...settings,
                            activeProvider: 'elevenlabs',
                            providers: { ...settings.providers, elevenlabs: { ...settings.providers.elevenlabs, voiceId: v.id } },
                          });
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all border ${
                          settings.providers.elevenlabs.voiceId === v.id
                            ? 'bg-indigo-500/30 border-indigo-400 text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${settings.providers.elevenlabs.voiceId === v.id ? 'bg-indigo-400' : 'bg-white/30'}`} />
                        <span className="font-medium">{v.name}</span>
                        <span className="text-xs text-white/40 ml-auto">自定义</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {settings.activeProvider === 'agnes' && !settings.providers.elevenlabs.apiKey && (
                <div className="text-xs text-amber-300/70 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  录制音色功能需要 ElevenLabs API Key。请在「AI 配置」中配置后使用。
                </div>
              )}
            </>
          )}

          {showNameDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4 shadow-2xl">
                <h3 className="text-lg font-semibold">为音色命名</h3>
                <p className="text-sm text-white/50">请给刚才录制的声音取一个名字，方便后续使用。</p>
                <input
                  type="text"
                  value={voiceNameInput}
                  onChange={e => setVoiceNameInput(e.target.value)}
                  placeholder="例如：我的声音、张三..."
                  autoFocus
                  maxLength={30}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && voiceNameInput.trim()) confirmName();
                    if (e.key === 'Escape') { setShowNameDialog(false); setPendingRecordingBlob(null); setVoiceNameInput(''); }
                  }}
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <div className="flex gap-3">
                  <button onClick={() => { setShowNameDialog(false); setPendingRecordingBlob(null); setVoiceNameInput(''); }} className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors">取消</button>
                  <button onClick={() => { if (voiceNameInput.trim()) confirmName(); }} disabled={!voiceNameInput.trim()} className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm transition-colors">确认克隆</button>
                </div>
              </div>
            </div>
          )}


          <div className="flex items-center gap-3">
            <button
              onClick={handleSynthesize}
              disabled={isGenerating || !text.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  {settings.activeProvider === 'agnes_video' ? (
                    <Video className="w-4 h-4" />
                  ) : settings.activeProvider === 'browser' ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                  <span>{settings.activeProvider === 'agnes_video' ? '视频转音频' : '开始合成'}</span>
                </>
              )}
            </button>
          </div>

          {generationStatus && (
            <div className="flex items-center gap-2 text-sm text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{generationStatus}</span>
            </div>
          )}

          {generationError && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {hasChinese(text) && settings.activeProvider !== 'agnes_video' && (
            <div className="flex items-start gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">检测到中文文本</p>
                <p className="text-amber-300/70 mt-0.5">
                  当前「{currentProviderInfo.name}」模式对中文支持有限。
                  <button
                    onClick={() => setSettings({ ...settings, activeProvider: 'agnes_video' })}
                    className="underline ml-1 hover:text-amber-200"
                  >
                    切换到 Agnes 视频转音频
                  </button>
                  模式，该模式对中文支持更好。
                </p>
              </div>
            </div>
          )}
        </section>

        {(currentAudioUrl || currentVideoUrl) && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-400" />
              合成结果
            </h3>

            {currentAudioUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
                  >
                    <Play className={`w-5 h-5 text-white ml-0.5 ${isPlaying ? 'opacity-60' : ''}`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium">提取的音频</p>
                    <p className="text-xs text-white/50">点击播放/暂停</p>
                  </div>
                </div>
                <audio
                  ref={audioRef}
                  src={currentAudioUrl}
                  controls
                  className="w-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}

            {currentVideoUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Video className="w-4 h-4" />
                  <span>原始视频源</span>
                </div>
                <video
                  src={currentVideoUrl}
                  controls
                  crossOrigin="anonymous"
                  className="w-full rounded-xl bg-black"
                  style={{ maxHeight: '300px' }}
                />
              </div>
            )}
          </section>
        )}

        {settings.activeProvider === 'agnes_video' && !activeConfig.apiKey && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">尚未配置 Agnes Video API Key</p>
              <p className="text-xs text-amber-300/70 mt-1">
                请点击右上角「AI 配置」按钮，在 Agnes 视频转音频面板中填入您的 API Key。
              </p>
            </div>
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <footer className="max-w-4xl mx-auto px-6 pb-8 pt-4 space-y-2">
        <p className="text-xs text-white/25">
          · 浏览器内置 TTS 需要系统安装对应语言的语音包（Windows/Mac 默认支持中英文）
        </p>
        <p className="text-xs text-white/25">
          · Agnes TTS 当前为灰度测试，中文效果建议使用「Agnes 视频转音频」模式
        </p>
        <p className="text-xs text-white/25">
          · ElevenLabs 声音克隆需要 Creator 及以上订阅计划
        </p>
        <p className="text-xs text-white/25">
          · 语音输入功能（浏览器模式）仅在 Chrome / Edge 浏览器可用
        </p>
        <p className="text-xs text-white/25">
          · 上传音频文件转录功能需要配置 ElevenLabs API Key
        </p>
      </footer>
    </div>
  );
}
