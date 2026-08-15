import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TcbsLiquidGlassButton,
  TcbsLiquidGlassIconButton,
  TcbsText,
} from '@tcbs/react-native-mazic-ui';
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  detectObjects,
  type ObjectDetection,
  type ObjectDetectionResult,
} from '@tcbs/react-native-ondevice-ai';

type PreviewSize = { width: number; height: number };

export function ObjectDetectionScreen() {
  const navigation = useNavigation<any>();
  const [image, setImage] = useState<Asset | null>(null);
  const [result, setResult] = useState<ObjectDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [previewSize, setPreviewSize] = useState<PreviewSize>({ width: 0, height: 0 });

  async function selectAndDetect(source: 'camera' | 'gallery') {
    try {
      const pickerResult = source === 'camera'
        ? await launchCamera({ mediaType: 'photo', cameraType: 'back', quality: 1 })
        : await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 1 });
      if (pickerResult.didCancel) return;
      if (pickerResult.errorCode) {
        Alert.alert('Could not select image', pickerResult.errorMessage || pickerResult.errorCode);
        return;
      }
      const selected = pickerResult.assets?.[0];
      if (!selected?.uri) return;
      setImage(selected);
      setResult(null);
      setIsDetecting(true);
      setResult(await detectObjects(selected.uri, {
        confidenceThreshold: 0.7,
        maxResults: 50,
      }));
    } catch (error) {
      Alert.alert(
        'Detection failed',
        error instanceof Error ? error.message : 'Please try another image.',
      );
    } finally {
      setIsDetecting(false);
    }
  }

  const imageFrame = useMemo(() => {
    const imageWidth = result?.imageWidth || image?.width || 1;
    const imageHeight = result?.imageHeight || image?.height || 1;
    const scale = Math.min(previewSize.width / imageWidth, previewSize.height / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    return {
      x: (previewSize.width - width) / 2,
      y: (previewSize.height - height) / 2,
      width,
      height,
    };
  }, [image, previewSize, result]);

  function onPreviewLayout(event: LayoutChangeEvent) {
    setPreviewSize(event.nativeEvent.layout);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TcbsLiquidGlassIconButton
          accessibilityLabel="Go back"
          label="‹"
          onPress={() => navigation.goBack()}
          size={36}
        />
        <TcbsText variant="title">Detect Objects</TcbsText>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TcbsText variant="body" style={styles.instructions}>
          Take a photo or choose one from the gallery. The pretrained YOLO26n FP32 model detects common COCO objects entirely on this device.
        </TcbsText>
        <View style={styles.actions}>
          <TcbsLiquidGlassButton
            disabled={isDetecting}
            onPress={() => selectAndDetect('camera')}
            size="lg"
            title="Camera"
          />
          <TcbsLiquidGlassButton
            disabled={isDetecting}
            onPress={() => selectAndDetect('gallery')}
            size="lg"
            title="Gallery"
          />
        </View>

        {image?.uri ? (
          <View style={styles.preview} onLayout={onPreviewLayout}>
            <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            {result?.detections.map((detection, index) => (
              <DetectionBox
                key={`${detection.classId}-${index}`}
                detection={detection}
                frame={imageFrame}
              />
            ))}
          </View>
        ) : null}

        {isDetecting ? <TcbsText variant="body" style={styles.status}>Detecting objects…</TcbsText> : null}
        {result ? (
          <View style={styles.resultCard}>
            <TcbsText variant="title">
              {result.detections.length} object{result.detections.length === 1 ? '' : 's'} detected
            </TcbsText>
            <TcbsText variant="caption">Inference: {result.inferenceTimeMs.toFixed(0)} ms</TcbsText>
            {result.detections.length === 0 ? (
              <TcbsText variant="body">No object passed the 70% confidence threshold.</TcbsText>
            ) : result.detections.map((detection, index) => (
              <TcbsText key={`${detection.classId}-result-${index}`} variant="body">
                {detection.label}: {(detection.confidence * 100).toFixed(1)}%
              </TcbsText>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetectionBox({ detection, frame }: { detection: ObjectDetection; frame: PreviewSize & { x: number; y: number } }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        {
          left: frame.x + detection.x * frame.width,
          top: frame.y + detection.y * frame.height,
          width: detection.width * frame.width,
          height: detection.height * frame.height,
        },
      ]}
    >
      <TcbsText variant="caption" style={styles.boxLabel}>
        {detection.label} {(detection.confidence * 100).toFixed(0)}%
      </TcbsText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#CBD5E1' },
  headerSpacer: { width: 36 },
  content: { padding: 20, gap: 20 },
  instructions: { textAlign: 'center', color: '#475569' },
  actions: { gap: 14 },
  preview: { width: '100%', height: 360, overflow: 'hidden', borderRadius: 18, backgroundColor: '#E2E8F0' },
  status: { textAlign: 'center', color: '#475569' },
  resultCard: { gap: 8, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7E1EF' },
  box: { position: 'absolute', borderWidth: 2, borderColor: '#00E5FF' },
  boxLabel: { position: 'absolute', left: -2, top: -22, paddingHorizontal: 4, paddingVertical: 2, color: '#FFFFFF', backgroundColor: '#006D77' },
});
