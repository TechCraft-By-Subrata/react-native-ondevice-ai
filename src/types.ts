export type DownloadStatus =
  | 'Pending'
  | 'Downloading'
  | 'Paused'
  | 'Successful'
  | string;

export type StorageCheckResult = {
  availableBytes: number;
  requiredBytes: number;
  hasEnoughSpace: boolean;
};

export type DownloadSnapshot = {
  progressPercent: number;
  downloadedBytes: number;
  totalBytes: number;
  status: DownloadStatus;
};

export type ModelFileInfo = {
  exists: boolean;
  sizeBytes: number;
  path: string;
};

export type ModelDownloadOptions = {
  url: string;
  wifiOnly?: boolean;
  fileName?: string;
};

/** @deprecated Use ModelDownloadOptions. */
export type GemmaDownloadOptions = ModelDownloadOptions;

export type ActiveDownloadId = number | null;

export type ExportResult = {
  uri: string;
  sizeBytes: number;
  displayName: string;
  relativePath: string;
};

export type ExportedModelInfo = {
  exists: boolean;
  sizeBytes: number;
  path: string;
  uri: string;
};

export type TransferProgressEvent = {
  operation: 'export' | 'import' | string;
  bytesCopied: number;
  totalBytes: number;
  progressPercent: number;
};

export type GemmaGenerateTextOptions = {
  /** Maximum output tokens for this response. */
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  seed?: number;
  /** Main text backend. GPU automatically falls back to CPU on iOS. */
  backend?: 'cpu' | 'gpu' | 'npu' | 'google-tensor';
  visionBackend?: 'cpu' | 'gpu' | 'npu' | 'google-tensor' | 'disabled';
  audioBackend?: 'cpu' | 'gpu' | 'npu' | 'google-tensor' | 'disabled';
  maxContextTokens?: number;
  /** Android only in LiteRT-LM 0.16.0; ignored on iOS. */
  maxImages?: number;
  cacheDir?: string;
  systemPrompt?: string;
  loraPath?: string;
  audioLoraPath?: string;
  loraRank?: number;
  audioLoraRank?: number;
  visualTokenBudget?: number;
  /** Experimental LiteRT-LM flag; the model must advertise support. */
  enableSpeculativeDecoding?: boolean;
  /** Experimental constrained decoding used by function-calling models. */
  enableConversationConstrainedDecoding?: boolean;
  /** Experimental: omit reasoning/channel content from the KV cache. */
  filterChannelContentFromKvCache?: boolean;
  /** Let LiteRT-LM invoke registered native tools automatically. Defaults to false. */
  automaticToolCalling?: boolean;
  thinking?: {
    enabled?: boolean;
    tokenBudget?: number;
  };
  repetitionPenalty?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  penaltyWindowSize?: number;
  noRepeatNgramSize?: number;
  noRepeatNgramWindowSize?: number;
  /** iOS only. Android 0.16 has an upstream JNI abort bug for this option. */
  suppressTokens?: number[];
  responseFormat?:
    | {type: 'regex'; pattern: string}
    | {type: 'json_schema'; schema: string | Record<string, unknown>};
};

export type GemmaGenerateTextResult = {
  text: string;
  channels?: Record<string, string>;
  toolCalls?: Array<{name: string; arguments: Record<string, unknown>}>;
};

export type GemmaGenerationStream = {
  /** Resolves with the complete accumulated response when native streaming ends. */
  result: Promise<GemmaGenerateTextResult>;
  /** Cancels this package's active LiteRT-LM generation. */
  cancel: () => Promise<boolean>;
};

export type LiteRTLMCapabilities = {
  speculativeDecoding: boolean;
};

export type LiteRTLMRuntimeInfo = {
  engineVersion: '0.16.0';
  modelLoaded: boolean;
  tokenCount: number | null;
};

export type LiteRTLMBenchmarkOptions = {
  fileName?: string;
  backend?: 'cpu' | 'gpu' | 'npu' | 'google-tensor';
  prefillTokens?: number;
  decodeTokens?: number;
  cacheDir?: string;
  prompt?: string;
};

export type LiteRTLMBenchmarkResult = {
  initTimeInSecond: number;
  timeToFirstTokenInSecond: number;
  lastPrefillTokenCount: number;
  lastDecodeTokenCount: number;
  lastPrefillTokensPerSecond: number;
  lastDecodeTokensPerSecond: number;
};

export type SystemLanguageModelAvailability = {
  available: boolean;
  reason: string;
};

export type AudioRecordingResult = {
  uri: string;
  durationMs: number;
};

export type AudioLevelEvent = {
  /** Normalized microphone level from 0 (silence) to 1 (loud). */
  level: number;
};

export type SpeechStatusEvent = {
  status: 'started' | 'finished' | 'cancelled' | 'error';
};
