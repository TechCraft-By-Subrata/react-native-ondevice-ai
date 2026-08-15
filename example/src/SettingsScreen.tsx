import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { TcbsText, useTcbsColorStore } from '@tcbs/react-native-mazic-ui';
import { useNavigation } from '@react-navigation/native';
import { useMMKVBoolean } from 'react-native-mmkv';
import {
  speakText,
  stopSpeaking,
} from '@tcbs/react-native-ondevice-ai';
import {
  SETTINGS_SCREEN_GEMMA4,
  SETTINGS_SCREEN_YOLO26N,
} from './utils/features';
import {
  preferencesStorage,
  SPEAK_RESPONSES_KEY,
} from './preferences';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { tcbsTheme, themeColors, toggleTcbsTheme } = useTcbsColorStore();
  const [storedSpeakResponses, setSpeakResponses] = useMMKVBoolean(
    SPEAK_RESPONSES_KEY,
    preferencesStorage,
  );
  const speakResponses = storedSpeakResponses ?? true;
  const themeLabel = tcbsTheme.charAt(0).toUpperCase() + tcbsTheme.slice(1);

  const cardStyle = {
    backgroundColor: themeColors.cardBgColor,
    borderColor: themeColors.cardBorderColor,
  };

  async function setSpeakResponsesEnabled(enabled: boolean) {
    setSpeakResponses(enabled);
    if (!enabled) {
      await stopSpeaking().catch(() => undefined);
      return;
    }

    try {
      await speakText('Speak responses is on.');
    } catch {
      Alert.alert(
        'App rebuild required',
        'Text-to-speech uses a native iOS component. Rebuild and reinstall the app once, then this setting will work.',
      );
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: themeColors.screenBgColor }}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      <TcbsText
        variant="caption"
        style={{ ...styles.intro, color: themeColors.textSecondary }}
      >
        Personalize Subra AI and manage models stored on this device.
      </TcbsText>

      <TcbsText variant="subtitle" style={styles.sectionTitle}>
        Preferences
      </TcbsText>
      <View style={[styles.card, cardStyle]} testID="theme-card">
        <Pressable
          testID="set-theme-button"
          accessibilityRole="button"
          accessibilityLabel="Toggle App Theme"
          accessibilityHint="Cycles through light, dark, and system themes"
          accessibilityValue={{ text: themeLabel }}
          onPress={toggleTcbsTheme}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowCopy}>
            <TcbsText variant="subtitle" style={styles.rowTitle}>
              Appearance
            </TcbsText>
            <TcbsText
              style={{
                ...styles.rowDescription,
                color: themeColors.textSecondary,
              }}
            >
              Tap to cycle light, dark, and system
            </TcbsText>
          </View>
          <View
            style={[
              styles.valuePill,
              { backgroundColor: themeColors.primaryColor },
            ]}
          >
            <TcbsText style={styles.valueText}>{themeLabel}</TcbsText>
          </View>
        </Pressable>
        <View
          style={[
            styles.row,
            styles.dividedRow,
            { borderTopColor: themeColors.cardBorderColor },
          ]}
        >
          <View style={styles.rowCopy}>
            <TcbsText variant="subtitle" style={styles.rowTitle}>
              Speak responses
            </TcbsText>
            <TcbsText
              style={{
                ...styles.rowDescription,
                color: themeColors.textSecondary,
              }}
            >
              Read each completed AI reply aloud
            </TcbsText>
          </View>
          <Switch
            testID="speak-responses-switch"
            accessibilityLabel="Speak responses"
            accessibilityHint="Reads completed AI replies aloud"
            value={speakResponses}
            onValueChange={setSpeakResponsesEnabled}
            trackColor={{
              false: themeColors.borderColor,
              true: themeColors.primaryColor,
            }}
            thumbColor={speakResponses ? '#07110D' : undefined}
          />
        </View>
      </View>

      {(SETTINGS_SCREEN_GEMMA4 || SETTINGS_SCREEN_YOLO26N) && (
        <>
          <TcbsText variant="subtitle" style={styles.sectionTitle}>
            Local AI models
          </TcbsText>
          <View style={[styles.card, cardStyle]}>
            {SETTINGS_SCREEN_GEMMA4 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manage Gemma 4 model"
                accessibilityHint="Opens download and storage settings for Gemma 4"
                onPress={() => navigation.navigate('ModelManagement')}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowCopy}>
                  <TcbsText variant="subtitle" style={styles.rowTitle}>
                    Gemma 4
                  </TcbsText>
                  <TcbsText
                    style={{
                      ...styles.rowDescription,
                      color: themeColors.textSecondary,
                    }}
                  >
                    Manage download and local storage
                  </TcbsText>
                </View>
                <Text
                  style={{
                    ...styles.chevron,
                    color: themeColors.textSecondary,
                  }}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  ›
                </Text>
              </Pressable>
            )}
            {SETTINGS_SCREEN_YOLO26N && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manage YOLO26n model"
                accessibilityHint="Opens download and storage settings for YOLO26n"
                onPress={() => navigation.navigate('YoloModelManagement')}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowCopy}>
                  <TcbsText variant="subtitle" style={styles.rowTitle}>
                    YOLO26n
                  </TcbsText>
                  <TcbsText
                    style={{
                      ...styles.rowDescription,
                      color: themeColors.textSecondary,
                    }}
                  >
                    Manage download and local storage
                  </TcbsText>
                </View>
                <Text
                  style={{
                    ...styles.chevron,
                    color: themeColors.textSecondary,
                  }}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  ›
                </Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    minHeight: 84,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowPressed: {
    opacity: 0.72,
  },
  dividedRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowCopy: {
    flex: 1,
    gap: 5,
  },
  rowTitle: {
    fontSize: 18,
  },
  rowDescription: {
    fontSize: 14,
    lineHeight: 19,
  },
  valuePill: {
    minWidth: 76,
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: '#07110D',
    fontSize: 14,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 32,
    lineHeight: 34,
  },
});
