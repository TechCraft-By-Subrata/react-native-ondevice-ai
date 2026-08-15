import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TcbsLiquidGlassButton,
  TcbsLiquidGlassIconButton,
  TcbsText,
} from '@tcbs/react-native-mazic-ui';
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateTextWithImage } from '@tcbs/react-native-ondevice-ai';

const DETECTION_PROMPT = `Inspect the image and read the seven-segment display. Return the exact characters shown, preserving decimal points, minus signs, leading zeros, units, and left-to-right order. If a segment is genuinely unreadable, use ? for only that character. Give the reading first, then one short confidence note.`;

export function SevenSegmentScreen() {
  const navigation = useNavigation<any>();
  const [image, setImage] = useState<Asset | null>(null);
  const [result, setResult] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

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
      setResult('');
      setIsDetecting(true);
      const response = await generateTextWithImage(DETECTION_PROMPT, selected.uri);
      setResult(response.text.trim() || 'No display reading was detected.');
    } catch (error) {
      Alert.alert(
        'Detection failed',
        error instanceof Error ? error.message : 'Please try another image.',
      );
    } finally {
      setIsDetecting(false);
    }
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
        <TcbsText variant="title">Detect Seven Segment</TcbsText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <TcbsText variant="body" style={styles.instructions}>
          Take a clear photo or choose one from your gallery. Detection starts automatically.
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

        {image?.uri ? <Image source={{ uri: image.uri }} style={styles.preview} /> : null}

        {isDetecting ? (
          <TcbsText variant="body" style={styles.status}>Reading display…</TcbsText>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <TcbsText variant="caption">Detected reading</TcbsText>
            <TcbsText variant="body" style={styles.resultText}>{result}</TcbsText>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
  },
  headerSpacer: { width: 36 },
  content: { flex: 1, padding: 20, gap: 20 },
  instructions: { textAlign: 'center', color: '#475569' },
  actions: { gap: 14 },
  preview: { width: '100%', height: 260, borderRadius: 18, resizeMode: 'contain', backgroundColor: '#E2E8F0' },
  status: { textAlign: 'center', color: '#475569' },
  resultCard: { gap: 8, padding: 18, borderRadius: 18, backgroundColor: '#F0F1F4' },
  resultText: { color: '#0F172A' },
});
