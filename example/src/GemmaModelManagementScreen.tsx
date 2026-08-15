import React from 'react';
import { ModelManagementScreen } from './ModelManagementScreen';
import {
  DownloadProvider,
  GEMMA_MODEL_CONFIG,
} from './context/DownloadContext';

export function GemmaModelManagementScreen() {
  return (
    <DownloadProvider config={GEMMA_MODEL_CONFIG}>
      <ModelManagementScreen />
    </DownloadProvider>
  );
}
