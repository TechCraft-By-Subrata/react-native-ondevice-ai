import React from 'react';
import { ModelManagementScreen } from './ModelManagementScreen';
import { DownloadProvider, YOLO_MODEL_CONFIG } from './context/DownloadContext';

export function YoloModelManagementScreen() {
  return (
    <DownloadProvider config={YOLO_MODEL_CONFIG}>
      <ModelManagementScreen />
    </DownloadProvider>
  );
}
