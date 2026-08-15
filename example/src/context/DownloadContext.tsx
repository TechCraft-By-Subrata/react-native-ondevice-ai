import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import {
  checkStorage,
  deleteModel as deleteStoredModel,
  exportModelToDownloads,
  finalizeModelDownload,
  getActiveDownloadIdForFile,
  getDownloadStatus,
  getExportedModelInfo,
  getModelFileInfo,
  importModelFromDownloads,
  openExportedModelInFiles,
  startModelDownload,
  subscribeTransferProgress,
} from '@tcbs/react-native-ondevice-ai';

const SAFETY_BUFFER_BYTES = 250 * 1024 * 1024;
const EXPORT_DIR_NAME = 'SubraAI';
const STALLED_TIMEOUT_MS = 25_000;

export type ManagedModelConfig = {
  displayName: string;
  fileName: string;
  downloadUrl: string;
  requiredBytes: number;
  source?: 'remote' | 'bundled';
};

export const GEMMA_MODEL_CONFIG: ManagedModelConfig = {
  displayName: 'Gemma 4',
  fileName: 'gemma_4_e2b.litertlm',
  downloadUrl:
    'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm',
  requiredBytes: 2_581_242_684,
};

export const YOLO_MODEL_CONFIG: ManagedModelConfig = {
  displayName: 'YOLO26n',
  fileName: 'yolo26n.tflite',
  downloadUrl: '',
  requiredBytes: 10_274_276,
  source: 'bundled',
};

export type ModelTransferState = {
  statusText: string;
  progressPercent: number;
  progressText: string;
  sizeText: string;
  downloadNetworkLabel: string;
  modelReady: boolean;
  exportedModelExists: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  isExporting: boolean;
  isImporting: boolean;
  isDeleting: boolean;
};

type DownloadContextValue = {
  config: ManagedModelConfig;
  state: ModelTransferState;
  startDownload: () => Promise<void>;
  exportModel: () => Promise<void>;
  importModel: () => Promise<void>;
  deleteModel: () => Promise<void>;
  viewExportedFile: () => Promise<void>;
};

const initialState: ModelTransferState = {
  statusText: 'Ready',
  progressPercent: 0,
  progressText: '0.00%',
  sizeText: '0 B / 0 B',
  downloadNetworkLabel: '',
  modelReady: false,
  exportedModelExists: false,
  isChecking: false,
  isDownloading: false,
  isExporting: false,
  isImporting: false,
  isDeleting: false,
};

const DownloadContext = createContext<DownloadContextValue | undefined>(
  undefined,
);

function formatBytes(bytes: number) {
  const safe = Math.max(0, Number(bytes || 0));
  if (safe < 1024) return `${safe.toFixed(0)} B`;
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(2)} KB`;
  if (safe < 1024 * 1024 * 1024)
    return `${(safe / (1024 * 1024)).toFixed(2)} MB`;
  return `${(safe / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function DownloadProvider({
  children,
  config = GEMMA_MODEL_CONFIG,
}: {
  children: React.ReactNode;
  config?: ManagedModelConfig;
}) {
  const [state, setState] = useState(initialState);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeDownloadIdRef = useRef<number | null>(null);
  const stalledSinceRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
  }, []);

  const applyReadyState = useCallback(
    (sizeBytes: number) => {
      setState(prev => ({
        ...prev,
        modelReady: true,
        isDownloading: false,
        statusText:
          config.source === 'bundled'
            ? `${config.displayName} is bundled with the app`
            : `${config.displayName} is ready`,
        progressPercent: 100,
        progressText: '100.00%',
        sizeText: `${formatBytes(sizeBytes)} / ${formatBytes(sizeBytes)}`,
      }));
    },
    [config.displayName, config.source],
  );

  const refreshModelInfo = useCallback(async () => {
    if (config.source === 'bundled') {
      applyReadyState(config.requiredBytes);
      return {
        exists: true,
        sizeBytes: config.requiredBytes,
        path: `bundled://${config.fileName}`,
      };
    }
    const info = await getModelFileInfo(config.fileName);
    if (info.exists && Number(info.sizeBytes) > 0) {
      applyReadyState(Number(info.sizeBytes));
    } else {
      setState(prev =>
        prev.isDownloading
          ? prev
          : {
              ...prev,
              modelReady: false,
              progressPercent: 0,
              progressText: '0.00%',
              sizeText: '0 B / 0 B',
              statusText: 'Ready',
            },
      );
    }
    return info;
  }, [applyReadyState, config.fileName, config.requiredBytes, config.source]);

  const refreshExportInfo = useCallback(async () => {
    const info = await getExportedModelInfo({
      fileName: config.fileName,
      exportDirName: EXPORT_DIR_NAME,
    });
    setState(prev => ({ ...prev, exportedModelExists: Boolean(info?.exists) }));
  }, [config.fileName]);

  const pollDownload = useCallback(
    async (downloadId: number) => {
      const snapshot = await getDownloadStatus(downloadId);
      const status = String(snapshot.status || 'Unknown');
      const percent = Number(snapshot.progressPercent || 0);
      const downloaded = Number(snapshot.downloadedBytes || 0);
      const total = Number(snapshot.totalBytes || 0);

      setState(prev => ({
        ...prev,
        isDownloading:
          status !== 'Successful' &&
          !status.startsWith('Failed') &&
          status !== 'NotFound',
        statusText: status,
        progressPercent: percent,
        progressText: `${percent.toFixed(2)}%`,
        sizeText: `${formatBytes(downloaded)} / ${formatBytes(total)}`,
      }));

      if (status === 'Successful') {
        stopPolling();
        stalledSinceRef.current = null;
        setState(prev => ({ ...prev, statusText: 'Finishing setup...' }));
        let finalized = false;
        for (
          let attempt = 0;
          attempt < (Platform.OS === 'ios' ? 8 : 3);
          attempt += 1
        ) {
          finalized = await finalizeModelDownload(config.fileName);
          if (finalized) break;
          await new Promise<void>(resolve => setTimeout(resolve, 800));
        }
        activeDownloadIdRef.current = null;
        if (!finalized)
          throw new Error('The download completed, but model setup failed.');
        await refreshModelInfo();
        return;
      }

      if (status.startsWith('Failed') || status === 'NotFound') {
        stopPolling();
        activeDownloadIdRef.current = null;
        stalledSinceRef.current = null;
        setState(prev => ({ ...prev, isDownloading: false }));
        await refreshModelInfo();
        return;
      }

      if (status === 'Pending' || status === 'Paused') {
        stalledSinceRef.current ??= Date.now();
        if (Date.now() - stalledSinceRef.current >= STALLED_TIMEOUT_MS) {
          stopPolling();
          setState(prev => ({
            ...prev,
            isDownloading: false,
            statusText:
              'Download is paused. Connect to the selected network to continue.',
          }));
        }
      } else {
        stalledSinceRef.current = null;
      }
    },
    [config.fileName, refreshModelInfo, stopPolling],
  );

  const beginPolling = useCallback(
    (downloadId: number) => {
      activeDownloadIdRef.current = downloadId;
      stopPolling();
      setState(prev => ({ ...prev, isDownloading: true }));
      const tick = () => {
        void pollDownload(downloadId).catch(error => {
          stopPolling();
          setState(prev => ({
            ...prev,
            isDownloading: false,
            statusText: errorMessage(
              error,
              'Unable to read download progress.',
            ),
          }));
        });
      };
      tick();
      pollingRef.current = setInterval(tick, 1000);
    },
    [pollDownload, stopPolling],
  );

  const startDownload = useCallback(async () => {
    if (config.source === 'bundled') {
      applyReadyState(config.requiredBytes);
      return;
    }
    setState(prev => ({ ...prev, isChecking: true }));
    try {
      const existing = await getModelFileInfo(config.fileName);
      if (existing.exists && Number(existing.sizeBytes) > 0) {
        applyReadyState(Number(existing.sizeBytes));
        return;
      }

      const storage = await checkStorage({
        requiredBytes: config.requiredBytes,
        safetyBufferBytes: SAFETY_BUFFER_BYTES,
      });
      if (!storage.hasEnoughSpace) {
        Alert.alert(
          'Not enough storage',
          `Required: ${formatBytes(
            storage.requiredBytes,
          )}. Available: ${formatBytes(storage.availableBytes)}.`,
        );
        return;
      }

      const allowMobileData = await new Promise<boolean | null>(resolve => {
        Alert.alert(
          'Choose download network',
          `${config.displayName} is approximately ${formatBytes(
            config.requiredBytes,
          )}.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            { text: 'Wi-Fi only', onPress: () => resolve(false) },
            { text: 'Wi-Fi or mobile data', onPress: () => resolve(true) },
          ],
        );
      });
      if (allowMobileData === null) return;

      const networkLabel = allowMobileData
        ? 'Wi-Fi or mobile data'
        : 'Wi-Fi only';
      setState(prev => ({
        ...prev,
        statusText: 'Starting download...',
        progressPercent: 0,
        progressText: '0.00%',
        sizeText: '0 B / 0 B',
        downloadNetworkLabel: networkLabel,
      }));
      const id = await startModelDownload({
        url: config.downloadUrl,
        wifiOnly: !allowMobileData,
        fileName: config.fileName,
      });
      beginPolling(Number(id));
    } catch (error) {
      Alert.alert(
        'Download failed',
        errorMessage(error, 'Unable to start the model download.'),
      );
    } finally {
      setState(prev => ({ ...prev, isChecking: false }));
    }
  }, [applyReadyState, beginPolling, config]);

  const exportModel = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isExporting: true,
      progressPercent: 0,
      progressText: '0.00%',
    }));
    try {
      await exportModelToDownloads({
        fileName: config.fileName,
        exportDirName: EXPORT_DIR_NAME,
      });
      await refreshExportInfo();
      setState(prev => ({
        ...prev,
        statusText: 'Export completed',
        progressPercent: 100,
        progressText: '100.00%',
      }));
      Alert.alert(
        'Export completed',
        'The model was exported to SubraAI in Downloads/Files.',
      );
    } catch (error) {
      Alert.alert(
        'Export failed',
        errorMessage(error, 'Unable to export the model.'),
      );
    } finally {
      setState(prev => ({ ...prev, isExporting: false }));
    }
  }, [config.fileName, refreshExportInfo]);

  const importModel = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isImporting: true,
      progressPercent: 0,
      progressText: '0.00%',
    }));
    try {
      const result = await importModelFromDownloads({
        fileName: config.fileName,
        exportDirName: EXPORT_DIR_NAME,
      });
      applyReadyState(Number(result.sizeBytes || 0));
      Alert.alert('Import completed', `${config.displayName} is ready to use.`);
    } catch (error) {
      Alert.alert(
        'Import failed',
        errorMessage(error, 'Unable to import the model.'),
      );
    } finally {
      setState(prev => ({ ...prev, isImporting: false }));
    }
  }, [applyReadyState, config.displayName, config.fileName]);

  const deleteModel = useCallback(async () => {
    if (config.source === 'bundled') {
      Alert.alert('Bundled model', 'This model is part of the installed app and cannot be deleted.');
      return;
    }
    setState(prev => ({ ...prev, isDeleting: true }));
    try {
      await deleteStoredModel(config.fileName);
      setState(prev => ({
        ...initialState,
        exportedModelExists: prev.exportedModelExists,
        statusText: 'Model deleted',
      }));
      Alert.alert(
        'Deleted',
        `The local ${config.displayName} model was deleted.`,
      );
    } catch (error) {
      Alert.alert(
        'Delete failed',
        errorMessage(error, 'Unable to delete the model.'),
      );
    } finally {
      setState(prev => ({ ...prev, isDeleting: false }));
    }
  }, [config.displayName, config.fileName, config.source]);

  const viewExportedFile = useCallback(async () => {
    await openExportedModelInFiles({
      fileName: config.fileName,
      exportDirName: EXPORT_DIR_NAME,
    });
  }, [config.fileName]);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        await Promise.all([refreshModelInfo(), refreshExportInfo()]);
        const activeId = await getActiveDownloadIdForFile(config.fileName);
        if (mounted && activeId != null) beginPolling(Number(activeId));
      } catch (error) {
        if (mounted)
          setState(prev => ({
            ...prev,
            statusText: errorMessage(error, 'Unable to inspect the model.'),
          }));
      }
    };
    void restore();

    const unsubscribe = subscribeTransferProgress(event => {
      const percent = Number(event.progressPercent || 0);
      const operation = String(event.operation || '').toLowerCase();
      setState(prev => ({
        ...prev,
        statusText:
          operation === 'export' ? 'Exporting model...' : 'Importing model...',
        progressPercent: percent,
        progressText: `${percent.toFixed(2)}%`,
        sizeText: `${formatBytes(event.bytesCopied)} / ${formatBytes(
          event.totalBytes,
        )}`,
      }));
    });

    return () => {
      mounted = false;
      unsubscribe();
      stopPolling();
    };
  }, [
    beginPolling,
    config.fileName,
    refreshExportInfo,
    refreshModelInfo,
    stopPolling,
  ]);

  const value = useMemo(
    () => ({
      config,
      state,
      startDownload,
      exportModel,
      importModel,
      deleteModel,
      viewExportedFile,
    }),
    [
      config,
      deleteModel,
      exportModel,
      importModel,
      startDownload,
      state,
      viewExportedFile,
    ],
  );

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const context = useContext(DownloadContext);
  if (!context)
    throw new Error('useDownload must be used within DownloadProvider');
  return context;
}
