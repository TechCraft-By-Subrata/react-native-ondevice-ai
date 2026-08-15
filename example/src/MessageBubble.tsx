import { Image, Pressable, StyleSheet, View } from 'react-native';
import { TcbsText, useTcbsColorStore } from '@tcbs/react-native-mazic-ui';

import type { ChatMessage } from './types';

type MessageBubbleProps = {
  message: ChatMessage;
  isSpeaking?: boolean;
  onToggleSpeech?: () => void;
};

export function MessageBubble({
  message,
  isSpeaking = false,
  onToggleSpeech,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { themeColors } = useTcbsColorStore();
  const bubbleTextColor = isUser ? '#07110D' : themeColors.textPrimary;

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser
              ? themeColors.primaryColor
              : themeColors.cardBgColor,
            borderColor: isUser
              ? themeColors.primaryColor
              : themeColors.cardBorderColor,
          },
        ]}
      >
        <TcbsText variant="caption" style={{ color: bubbleTextColor }}>
          {isUser ? 'You' : 'Subra AI'}
        </TcbsText>

        {message.imageUri ? (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.messageImage}
          />
        ) : null}

        <TcbsText variant="body" style={{ color: bubbleTextColor }}>
          {message.text}
        </TcbsText>

        {!isUser ? (
          <View style={styles.assistantActions}>
            {typeof message.processingSeconds === 'number' ? (
              <View style={styles.processingMetaRow}>
                <TcbsText variant="caption" style={styles.processingMetaIcon}>
                  ⏱
                </TcbsText>
                <TcbsText variant="caption" style={styles.processingMeta}>
                  {message.processingSeconds}s response time
                </TcbsText>
              </View>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isSpeaking ? 'Stop reading response' : 'Read response aloud'
              }
              accessibilityState={{ selected: isSpeaking }}
              hitSlop={8}
              onPress={onToggleSpeech}
              style={({ pressed }) => [
                styles.speechButton,
                {
                  borderColor: themeColors.cardBorderColor,
                  backgroundColor: themeColors.screenBgColor,
                },
                pressed && styles.speechButtonPressed,
              ]}
            >
              <TcbsText
                style={{
                  ...styles.speechButtonText,
                  color: themeColors.accentColor,
                }}
              >
                {isSpeaking ? '■' : '🔊'}
              </TcbsText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginBottom: 12,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  processingMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assistantActions: {
    marginTop: 5,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  processingMeta: {
    color: '#718096',
    fontSize: 8,
  },
  processingMetaIcon: {
    color: '#718096',
    fontSize: 10,
    lineHeight: 10,
  },
  speechButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechButtonPressed: {
    opacity: 0.65,
  },
  speechButtonText: {
    fontSize: 14,
    lineHeight: 18,
  },
});
