import {
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import type {
  ActiveDownloadId,
  AudioLevelEvent,
  AudioRecordingResult,
  SpeechStatusEvent,
  DownloadSnapshot,
  ExportedModelInfo,
  ExportResult,
  GemmaGenerateTextOptions,
  GemmaGenerateTextResult,
  GemmaGenerationStream,
  LiteRTLMCapabilities,
  LiteRTLMBenchmarkOptions,
  LiteRTLMBenchmarkResult,
  LiteRTLMRuntimeInfo,
  ModelDownloadOptions,
  ModelFileInfo,
  StorageCheckResult,
  SystemLanguageModelAvailability,
  TransferProgressEvent,
} from './types';

export type {
  ActiveDownloadId,
  AudioLevelEvent,
  AudioRecordingResult,
  SpeechStatusEvent,
  DownloadSnapshot,
  DownloadStatus,
  ExportedModelInfo,
  ExportResult,
  GemmaDownloadOptions,
  GemmaGenerateTextOptions,
  GemmaGenerateTextResult,
  GemmaGenerationStream,
  LiteRTLMCapabilities,
  LiteRTLMBenchmarkOptions,
  LiteRTLMBenchmarkResult,
  LiteRTLMRuntimeInfo,
  ModelDownloadOptions,
  ModelFileInfo,
  StorageCheckResult,
  SystemLanguageModelAvailability,
  TransferProgressEvent,
} from './types';

const DEFAULT_FILE_NAME = 'gemma_4_e2b.litertlm';

const normalizeGenerationOptions = (
  options?: GemmaGenerateTextOptions,
  modality: 'text' | 'image' | 'audio' = 'text',
): GemmaGenerateTextOptions => {
  const schema = options?.responseFormat?.type === 'json_schema'
    ? options.responseFormat.schema
    : undefined;
  const normalized: GemmaGenerateTextOptions = {
    ...options,
    visionBackend: options?.visionBackend ?? (modality === 'image' ? 'cpu' : 'disabled'),
    audioBackend: options?.audioBackend ?? (modality === 'audio' ? 'cpu' : 'disabled'),
  };
  if (!schema || typeof schema === 'string') return normalized;
  normalized.responseFormat = {type: 'json_schema', schema: JSON.stringify(schema)};
  return normalized;
};

type GemmaNativeModule = {
  checkStorage(
    requiredBytes: number,
    safetyBufferBytes: number,
  ): Promise<StorageCheckResult>;
  startModelDownload(
    url: string,
    wifiOnly: boolean,
    fileName: string,
  ): Promise<number>;
  getDownloadStatus(downloadId: number): Promise<DownloadSnapshot>;
  getActiveDownloadId?(): Promise<ActiveDownloadId>;
  getActiveDownloadIdForFile?(fileName: string): Promise<ActiveDownloadId>;
  exportModelToDownloads?(
    fileName: string,
    exportDirName: string,
  ): Promise<ExportResult>;
  importModelFromDownloads?(
    fileName: string,
    exportDirName: string,
  ): Promise<ModelFileInfo>;
  getExportedModelInfo?(
    fileName: string,
    exportDirName: string,
  ): Promise<ExportedModelInfo>;
  openExportedModelInFiles?(
    fileName: string,
    exportDirName: string,
  ): Promise<boolean>;
  finalizeModelDownload(fileName: string): Promise<boolean>;
  cancelDownload(downloadId: number): Promise<boolean>;
  getModelFileInfo(fileName: string): Promise<ModelFileInfo>;
  deleteModel?(fileName: string): Promise<boolean>;
  getCurrentNetworkClass?(): Promise<{
    isConnected: boolean;
    connectionType: 'wifi' | 'cellular' | 'other' | 'none' | string;
    cellularGeneration: '2g' | '3g' | '4g' | '5g' | 'unknown' | 'none' | string;
  }>;
  generateText?(
    prompt: string,
    options?: GemmaGenerateTextOptions,
  ): Promise<GemmaGenerateTextResult>;
  generateTextStream?(
    prompt: string,
    requestId: string,
    options?: GemmaGenerateTextOptions,
  ): Promise<GemmaGenerateTextResult>;
  getSystemLanguageModelAvailability?(): Promise<SystemLanguageModelAvailability>;
  generateTextWithSystemLanguageModel?(prompt: string): Promise<GemmaGenerateTextResult>;
  generateTextWithImage?(
    prompt: string,
    imagePath: string,
    options?: GemmaGenerateTextOptions,
  ): Promise<GemmaGenerateTextResult>;
  isImageTextRecognitionAvailable?(): Promise<{available: boolean; languages: string[]}>;
  recognizeTextInImage?(imagePath: string): Promise<{text: string; lineCount: number}>;
  generateTextWithAudio?(
    prompt: string,
    audioPath: string,
    options?: GemmaGenerateTextOptions,
  ): Promise<GemmaGenerateTextResult>;
  cancelTextGeneration?(): Promise<boolean>;
  resetConversation?(): Promise<boolean>;
  unloadModel?(): Promise<boolean>;
  getLiteRTLMCapabilities?(fileName: string): Promise<LiteRTLMCapabilities>;
  getLiteRTLMRuntimeInfo?(): Promise<LiteRTLMRuntimeInfo>;
  benchmarkLiteRTLM?(options: LiteRTLMBenchmarkOptions): Promise<LiteRTLMBenchmarkResult>;
  startAudioRecording?(): Promise<boolean>;
  stopAudioRecording?(): Promise<AudioRecordingResult>;
  cancelAudioRecording?(): Promise<boolean>;
  pickAudioFile?(): Promise<AudioRecordingResult>;
  speakText?(text: string): Promise<boolean>;
  stopSpeaking?(): Promise<boolean>;
};

const getNativeModule = (): GemmaNativeModule => {
  const moduleRef = NativeModules.TcbsGemmaModule as
    | GemmaNativeModule
    | undefined;
  if (!moduleRef) {
    throw new Error(
      Platform.OS === 'ios'
        ? 'TcbsGemmaModule is not available on iOS build.'
        : 'TcbsGemmaModule is not available on Android build.',
    );
  }
  return moduleRef;
};

export const checkStorage = async (options: {
  requiredBytes: number;
  safetyBufferBytes?: number;
}): Promise<StorageCheckResult> => {
  const mod = getNativeModule();
  return mod.checkStorage(
    options.requiredBytes,
    options.safetyBufferBytes ?? 250 * 1024 * 1024,
  );
};

export const startModelDownload = async (
  options: ModelDownloadOptions,
): Promise<number> => {
  const mod = getNativeModule();
  const fileName = String(options.fileName || DEFAULT_FILE_NAME);
  return mod.startModelDownload(
    options.url,
    options.wifiOnly !== false,
    fileName,
  );
};

export const getDownloadStatus = async (
  downloadId: number,
): Promise<DownloadSnapshot> => {
  const mod = getNativeModule();
  return mod.getDownloadStatus(downloadId);
};

export const getActiveDownloadId = async (): Promise<ActiveDownloadId> => {
  const mod = getNativeModule();
  if (typeof mod.getActiveDownloadId !== 'function') return null;
  return mod.getActiveDownloadId();
};

export const getActiveDownloadIdForFile = async (
  fileName: string,
): Promise<ActiveDownloadId> => {
  const mod = getNativeModule();
  if (typeof mod.getActiveDownloadIdForFile !== 'function')
    return mod.getActiveDownloadId?.() ?? null;
  return mod.getActiveDownloadIdForFile(String(fileName || DEFAULT_FILE_NAME));
};

export const finalizeModelDownload = async (
  fileName = DEFAULT_FILE_NAME,
): Promise<boolean> => {
  const mod = getNativeModule();
  return mod.finalizeModelDownload(fileName);
};

export const exportModelToDownloads = async (options?: {
  fileName?: string;
  exportDirName?: string;
}): Promise<ExportResult> => {
  const mod = getNativeModule();
  if (typeof mod.exportModelToDownloads !== 'function') {
    throw new Error(
      'exportModelToDownloads is not available on this platform build.',
    );
  }
  return mod.exportModelToDownloads(
    String(options?.fileName || DEFAULT_FILE_NAME),
    String(options?.exportDirName || 'SubraAI'),
  );
};

export const importModelFromDownloads = async (options?: {
  fileName?: string;
  exportDirName?: string;
}): Promise<ModelFileInfo> => {
  const mod = getNativeModule();
  if (typeof mod.importModelFromDownloads !== 'function') {
    throw new Error(
      'importModelFromDownloads is not available on this platform build.',
    );
  }
  return mod.importModelFromDownloads(
    String(options?.fileName || DEFAULT_FILE_NAME),
    String(options?.exportDirName || 'SubraAI'),
  );
};

export const getExportedModelInfo = async (options?: {
  fileName?: string;
  exportDirName?: string;
}): Promise<ExportedModelInfo | null> => {
  const mod = getNativeModule();
  if (typeof mod.getExportedModelInfo !== 'function') return null;
  return mod.getExportedModelInfo(
    String(options?.fileName || DEFAULT_FILE_NAME),
    String(options?.exportDirName || 'SubraAI'),
  );
};

export const openExportedModelInFiles = async (options?: {
  fileName?: string;
  exportDirName?: string;
}): Promise<boolean> => {
  const mod = getNativeModule();
  if (typeof mod.openExportedModelInFiles !== 'function') {
    throw new Error(
      'openExportedModelInFiles is not available on this platform build.',
    );
  }
  return mod.openExportedModelInFiles(
    String(options?.fileName || DEFAULT_FILE_NAME),
    String(options?.exportDirName || 'SubraAI'),
  );
};

export const cancelDownload = async (downloadId: number): Promise<boolean> => {
  const mod = getNativeModule();
  return mod.cancelDownload(downloadId);
};

export const getModelFileInfo = async (
  fileName = DEFAULT_FILE_NAME,
): Promise<ModelFileInfo> => {
  const mod = getNativeModule();
  return mod.getModelFileInfo(fileName);
};

export const deleteModel = async (
  fileName = DEFAULT_FILE_NAME,
): Promise<boolean> => {
  const mod = getNativeModule();
  if (typeof mod.deleteModel !== 'function') {
    throw new Error('deleteModel is not available on this platform build.');
  }
  return mod.deleteModel(String(fileName || DEFAULT_FILE_NAME));
};

export const getCurrentNetworkClass = async (): Promise<{
  isConnected: boolean;
  connectionType: 'wifi' | 'cellular' | 'other' | 'none' | string;
  cellularGeneration: '2g' | '3g' | '4g' | '5g' | 'unknown' | 'none' | string;
}> => {
  const mod = getNativeModule();
  if (typeof mod.getCurrentNetworkClass !== 'function') {
    return {
      isConnected: true,
      connectionType: 'other',
      cellularGeneration: 'unknown',
    };
  }
  return mod.getCurrentNetworkClass();
};

export const generateText = async (
  prompt: string,
  options?: GemmaGenerateTextOptions,
): Promise<GemmaGenerateTextResult> => {
  const mod = getNativeModule();
  if (typeof mod.generateText !== 'function') {
    throw new Error('generateText is not available on this platform build.');
  }
  return mod.generateText(String(prompt || ''), normalizeGenerationOptions(options));
};

let generationStreamSequence = 0;

/** Starts text generation and delivers native response chunks as they arrive. */
export const generateTextStream = (
  prompt: string,
  onChunk: (chunk: GemmaGenerateTextResult) => void,
  options?: GemmaGenerateTextOptions,
): GemmaGenerationStream => {
  const mod = getNativeModule();
  if (typeof mod.generateTextStream !== 'function') {
    throw new Error('Streaming generation is not available on this platform build.');
  }
  const requestId = `litertlm-${Date.now()}-${++generationStreamSequence}`;
  const emitter = Platform.OS === 'ios'
    ? new NativeEventEmitter(NativeModules.TcbsGemmaModule)
    : DeviceEventEmitter;
  const subscription = emitter.addListener(
    'tcbsGemmaGenerationChunk',
    (event: {requestId?: string; chunk?: GemmaGenerateTextResult}) => {
      if (event?.requestId === requestId && event.chunk) onChunk(event.chunk);
    },
  );
  const result = mod
    .generateTextStream(
      String(prompt || ''),
      requestId,
      normalizeGenerationOptions(options),
    )
    .finally(() => subscription.remove());
  return {result, cancel: cancelTextGeneration};
};

export const generateTextWithImage = async (
  prompt: string,
  imagePath: string,
  options?: GemmaGenerateTextOptions,
): Promise<GemmaGenerateTextResult> => {
  const mod = getNativeModule();
  if (typeof mod.generateTextWithImage !== 'function') {
    throw new Error('Image inference is not available on this platform build.');
  }
  return mod.generateTextWithImage(
    String(prompt || ''),
    String(imagePath || ''),
    normalizeGenerationOptions(options, 'image'),
  );
};

export const recognizeTextInImage = async (
  imagePath: string,
): Promise<{text: string; lineCount: number}> => {
  const mod = getNativeModule();
  if (typeof mod.recognizeTextInImage !== 'function') {
    throw new Error('On-device image text recognition is unavailable on this platform.');
  }
  return mod.recognizeTextInImage(String(imagePath || ''));
};

export const getSystemLanguageModelAvailability = async (): Promise<SystemLanguageModelAvailability> => {
  const mod = getNativeModule();
  if (typeof mod.getSystemLanguageModelAvailability !== 'function') {
    return {available: false, reason: 'native_api_unavailable'};
  }
  const result = await mod.getSystemLanguageModelAvailability();
  return {available: Boolean(result?.available), reason: String(result?.reason || '')};
};

export const generateTextWithSystemLanguageModel = async (
  prompt: string,
): Promise<GemmaGenerateTextResult> => {
  const mod = getNativeModule();
  if (typeof mod.generateTextWithSystemLanguageModel !== 'function') {
    throw new Error('Apple Foundation Models is unavailable on this platform build.');
  }
  return mod.generateTextWithSystemLanguageModel(String(prompt || ''));
};

export const isImageTextRecognitionAvailable = async (): Promise<{
  available: boolean;
  languages: string[];
}> => {
  const mod = getNativeModule();
  if (typeof mod.isImageTextRecognitionAvailable !== 'function') {
    return {available: false, languages: []};
  }
  const result = await mod.isImageTextRecognitionAvailable();
  return {
    available: Boolean(result?.available),
    languages: Array.isArray(result?.languages) ? result.languages.map(String) : [],
  };
};

export const generateTextWithAudio = async (
  prompt: string,
  audioPath: string,
  options?: GemmaGenerateTextOptions,
): Promise<GemmaGenerateTextResult> => {
  const mod = getNativeModule();
  if (typeof mod.generateTextWithAudio !== 'function') {
    throw new Error(
      'generateTextWithAudio is not available on this platform build.',
    );
  }
  return mod.generateTextWithAudio(
    String(prompt || ''),
    String(audioPath || ''),
    normalizeGenerationOptions(options, 'audio'),
  );
};

export const cancelTextGeneration = async (): Promise<boolean> => {
  const mod = getNativeModule();
  if (typeof mod.cancelTextGeneration !== 'function') {
    return false;
  }
  return mod.cancelTextGeneration();
};

/** Clears chat/KV-cache state while keeping the downloaded model file. */
export const resetConversation = async (): Promise<boolean> => {
  const mod = getNativeModule();
  return typeof mod.resetConversation === 'function'
    ? mod.resetConversation()
    : false;
};

/** Deterministically releases the multi-gigabyte LiteRT-LM engine. */
export const unloadModel = async (): Promise<boolean> => {
  const mod = getNativeModule();
  return typeof mod.unloadModel === 'function' ? mod.unloadModel() : false;
};

export const getLiteRTLMCapabilities = async (
  fileName = DEFAULT_FILE_NAME,
): Promise<LiteRTLMCapabilities> => {
  const mod = getNativeModule();
  return typeof mod.getLiteRTLMCapabilities === 'function'
    ? mod.getLiteRTLMCapabilities(fileName)
    : {speculativeDecoding: false};
};

export const getLiteRTLMRuntimeInfo = async (): Promise<LiteRTLMRuntimeInfo> => {
  const mod = getNativeModule();
  return typeof mod.getLiteRTLMRuntimeInfo === 'function'
    ? mod.getLiteRTLMRuntimeInfo()
    : {engineVersion: '0.16.0', modelLoaded: false, tokenCount: null};
};

/** Runs Google's experimental on-device prefill/decode benchmark. */
export const benchmarkLiteRTLM = async (
  options: LiteRTLMBenchmarkOptions = {},
): Promise<LiteRTLMBenchmarkResult> => {
  const mod = getNativeModule();
  if (typeof mod.benchmarkLiteRTLM !== 'function') {
    throw new Error('LiteRT-LM benchmark is not available on this platform build.');
  }
  return mod.benchmarkLiteRTLM({
    ...options,
    fileName: options.fileName || DEFAULT_FILE_NAME,
    backend: options.backend || 'cpu',
    prefillTokens: options.prefillTokens ?? 256,
    decodeTokens: options.decodeTokens ?? 256,
    prompt: options.prompt || 'How are you',
  });
};

export const startAudioRecording = async (): Promise<boolean> => {
  const mod = getNativeModule();
  if (typeof mod.startAudioRecording !== 'function') {
    throw new Error(
      'Audio recording is not available on this platform build.',
    );
  }
  return mod.startAudioRecording();
};

export const stopAudioRecording =
  async (): Promise<AudioRecordingResult> => {
    const mod = getNativeModule();
    if (typeof mod.stopAudioRecording !== 'function') {
      throw new Error(
        'Audio recording is not available on this platform build.',
      );
    }
    return mod.stopAudioRecording();
  };

export const cancelAudioRecording = async (): Promise<boolean> => {
  const mod = getNativeModule();
  if (typeof mod.cancelAudioRecording !== 'function') {
    throw new Error(
      'Audio recording is not available on this platform build.',
    );
  }
  return mod.cancelAudioRecording();
};

export const subscribeAudioLevel = (
  listener: (event: AudioLevelEvent) => void,
): (() => void) => {
  const emitter =
    Platform.OS === 'ios'
      ? new NativeEventEmitter(NativeModules.TcbsGemmaModule)
      : DeviceEventEmitter;
  const subscription = emitter.addListener(
    'tcbsGemmaAudioLevel',
    (event: AudioLevelEvent) => {
      listener({
        level: Math.max(0, Math.min(1, Number(event?.level) || 0)),
      });
    },
  );
  return () => {
    subscription.remove();
  };
};

export const pickAudioFile = async (): Promise<AudioRecordingResult> => {
  const mod = getNativeModule();
  if (typeof mod.pickAudioFile !== 'function') {
    throw new Error(
      'Audio file selection is not available on this platform build.',
    );
  }
  return mod.pickAudioFile();
};

export const speakText = async (text: string): Promise<boolean> => {
  const mod = getNativeModule();
  if (typeof mod.speakText !== 'function') {
    throw new Error('Text-to-speech is not available on this platform build.');
  }
  return mod.speakText(String(text || ''));
};

export const stopSpeaking = async (): Promise<boolean> => {
  const mod = getNativeModule();
  if (typeof mod.stopSpeaking !== 'function') return false;
  return mod.stopSpeaking();
};

export const subscribeSpeechStatus = (
  listener: (event: SpeechStatusEvent) => void,
): (() => void) => {
  const emitter =
    Platform.OS === 'ios'
      ? new NativeEventEmitter(NativeModules.TcbsGemmaModule)
      : DeviceEventEmitter;
  const subscription = emitter.addListener(
    'tcbsGemmaSpeechStatus',
    listener,
  );
  return () => subscription.remove();
};

export const DEFAULT_GEMMA_MODEL_FILE_NAME = DEFAULT_FILE_NAME;

export type GemmaInferenceRequest = {
  systemPrompt: string;
  userPrompt: string;
  generationConfig?: GemmaGenerateTextOptions;
};

export type GemmaInferenceFacade = {
  generateText(request: GemmaInferenceRequest): Promise<string>;
  generate(messages: Array<{ role: string; content: string }>): Promise<string>;
  interrupt(): void;
  configure(_: { generationConfig?: GemmaGenerateTextOptions }): void;
};

const GemmaFacade: GemmaInferenceFacade = {
  async generateText(request: GemmaInferenceRequest) {
    const prompt = [request.systemPrompt, request.userPrompt]
      .filter(Boolean)
      .join('\n\n');
    const result = await generateText(prompt, request.generationConfig);
    return result.text;
  },
  async generate(messages: Array<{ role: string; content: string }>) {
    const prompt = messages
      .map(message => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');
    const result = await generateText(prompt);
    return result.text;
  },
  interrupt() {
    void cancelTextGeneration();
  },
  configure() {
    // Configuration is passed per request from the app layer.
  },
};

export const GemmaModule = GemmaFacade;
export default GemmaFacade;

export const subscribeTransferProgress = (
  listener: (event: TransferProgressEvent) => void,
): (() => void) => {
  const subscription = DeviceEventEmitter.addListener(
    'tcbsGemmaTransferProgress',
    (event: TransferProgressEvent) => {
      listener(event);
    },
  );
  return () => {
    subscription.remove();
  };
};
