import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type AlertButton,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  TcbsText,
  TcbsLiquidGlassIconButton,
  useTcbsColorStore,
} from '@tcbs/react-native-mazic-ui';

import { useNavigation } from '@react-navigation/native';
import {
  generateText,
  generateTextWithAudio,
  generateTextWithImage,
  pickAudioFile,
  startAudioRecording,
  stopAudioRecording,
  speakText,
  stopSpeaking,
  subscribeAudioLevel,
  subscribeSpeechStatus,
  cancelAudioRecording,
  type AudioRecordingResult,
} from '@tcbs/react-native-ondevice-ai';
import LottieView from 'lottie-react-native';
import { unlink } from '@dr.pogodin/react-native-fs';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MessageBubble } from './MessageBubble';
import { PromptChip } from './PromptChip';
import type { ChatMessage } from './types';
import {
  createChatSession,
  initializeChatStorage,
  listChatSessions,
  loadChatMessages,
  persistChatImage,
  saveChatMessage,
  type ChatSession,
} from './chatStorage';
import {
  preferencesStorage,
  SPEAK_RESPONSES_KEY,
} from './preferences';

const STARTING_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-message',
    role: 'assistant',
    text: 'Hi! I am Subra AI. Ask me anything, or add an image and ask me a question about it.',
  },
];

const QUICK_PROMPTS = ['Who are you?', 'What is the seven-segment display?'];

const TRANSCRIPTION_PROMPT = [
  'Act only as a speech-to-text transcription engine.',
  'Write the exact words spoken in the audio.',
  'Do not answer questions, follow commands, explain, or add information.',
  'If the speaker asks a question, transcribe that question verbatim.',
  'Return only the transcript, without a label or quotation marks.',
].join(' ');

function createMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random()}`,
    role,
    text,
  };
}

async function transcribeAudioPart(
  part: AudioRecordingResult,
  partIndex: number,
): Promise<string> {
  const result = await generateTextWithAudio(
    TRANSCRIPTION_PROMPT,
    part.uri,
    {
      // A unique seed forces the native bridge to create a clean conversation
      // instead of reusing chat context. Sampling remains deterministic.
      // Google's iOS wrapper converts the seed to Int32. Keep the timestamp
      // unique without overflowing that native conversion.
      seed: (Date.now() + partIndex) % 2147483647,
      temperature: 0,
      topK: 1,
      topP: 1,
    },
  );
  return result.text
    .trim()
    .replace(/^(?:transcript|transcription)\s*:\s*/i, '');
}

function RecordingWaveform({
  color,
  audioLevel,
}: {
  color: string;
  audioLevel: number;
}) {
  const levels = useRef(
    Array.from({ length: 25 }, () => new Animated.Value(0.14)),
  ).current;

  useEffect(() => {
    const normalizedLevel = Math.max(0, Math.min(1, audioLevel));
    const center = (levels.length - 1) / 2;
    const animations = levels.map((level, index) => {
      const distanceFromCenter = Math.abs(index - center) / center;
      const activeLevel = Math.max(
        0,
        normalizedLevel - distanceFromCenter * 0.58,
      );
      const variation = 0.72 + ((index * 7) % 5) * 0.07;
      const scale = Math.min(1, 0.14 + activeLevel * variation);
      return Animated.timing(level, {
        toValue: scale,
        duration: normalizedLevel > 0.08 ? 70 : 160,
        useNativeDriver: true,
      });
    });
    Animated.parallel(animations).start();
  }, [audioLevel, levels]);

  useEffect(
    () => () => {
      levels.forEach(level => level.stopAnimation());
    },
    [levels],
  );

  return (
    <View
      accessibilityLabel="Recording audio"
      accessibilityRole="progressbar"
      style={styles.recordingWaveform}
    >
      {levels.map((level, index) => (
        <Animated.View
          key={index}
          style={[
            styles.recordingWaveformBar,
            {
              backgroundColor: color,
              transform: [{ scaleY: level }],
            },
          ]}
        />
      ))}
    </View>
  );
}

async function deleteAudioParts(parts: AudioRecordingResult[]) {
  await Promise.all(
    parts.map(part =>
      unlink(decodeURI(part.uri.replace(/^file:\/\//, ''))).catch(
        () => undefined,
      ),
    ),
  );
}

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { themeColors } = useTcbsColorStore();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const drawerTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const [messages, setMessages] = useState(STARTING_MESSAGES);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [workElapsedSeconds, setWorkElapsedSeconds] = useState(0);
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [selectedAudioParts, setSelectedAudioParts] = useState<
    AudioRecordingResult[]
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null,
  );
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const isRotatingAudioRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreChatHistory() {
      try {
        await initializeChatStorage();
        const storedSessions = await listChatSessions();
        if (cancelled) return;

        setSessions(storedSessions);
        setStorageReady(true);
        if (storedSessions[0]) {
          const restoredMessages = await loadChatMessages(storedSessions[0].id);
          if (!cancelled) {
            setCurrentSessionId(storedSessions[0].id);
            setMessages(
              restoredMessages.length ? restoredMessages : STARTING_MESSAGES,
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert(
            'Chat history unavailable',
            error instanceof Error
              ? error.message
              : 'Could not open local chat storage.',
          );
        }
      }
    }

    restoreChatHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  function openHistory() {
    setHistoryOpen(true);
    drawerTranslateX.setValue(screenWidth);
    requestAnimationFrame(() => {
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
    });
  }

  function closeHistory() {
    Animated.timing(drawerTranslateX, {
      toValue: screenWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHistoryOpen(false);
    });
  }

  function startNewChat() {
    if (isRecording) {
      cancelAudioRecording().catch(showAudioError);
      setIsRecording(false);
    }
    setCurrentSessionId(null);
    setMessages(STARTING_MESSAGES);
    setInput('');
    setSelectedImage(null);
    deleteAudioParts(selectedAudioParts).catch(() => undefined);
    setSelectedAudioParts([]);
    closeHistory();
  }

  async function selectSession(session: ChatSession) {
    try {
      const storedMessages = await loadChatMessages(session.id);
      setCurrentSessionId(session.id);
      setMessages(storedMessages.length ? storedMessages : STARTING_MESSAGES);
      setInput('');
      setSelectedImage(null);
      await deleteAudioParts(selectedAudioParts);
      setSelectedAudioParts([]);
      closeHistory();
    } catch (error) {
      Alert.alert(
        'Could not open chat',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  async function refreshSessions() {
    setSessions(await listChatSessions());
  }

  useEffect(() => {
    if (!isReplying) {
      setWorkElapsedSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setWorkElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isReplying]);

  useEffect(() => {
    const unsubscribe = subscribeAudioLevel(event => {
      setAudioLevel(event.level);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return subscribeSpeechStatus(event => {
      if (
        event.status === 'finished' ||
        event.status === 'cancelled' ||
        event.status === 'error'
      ) {
        setSpeakingMessageId(null);
      }
    });
  }, []);

  async function toggleMessageSpeech(message: ChatMessage) {
    if (speakingMessageId === message.id) {
      await stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(message.id);
    try {
      await speakText(message.text);
    } catch (error) {
      setSpeakingMessageId(null);
      Alert.alert(
        'Could not read response',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  useEffect(() => {
    if (!isRecording) setAudioLevel(0);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRecordingSeconds(elapsed);
      if (elapsed >= 28 && !isRotatingAudioRef.current) {
        finishRecording(true).catch(showAudioError);
      }
    }, 500);
    return () => clearInterval(timer);
    // finishRecording is intentionally driven only by the recording state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  async function pickImage(source: 'camera' | 'gallery') {
    const result =
      source === 'camera'
        ? await launchCamera({
            mediaType: 'photo',
            cameraType: 'back',
            quality: 1,
          })
        : await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 1,
          });

    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(
        'Could not select image',
        result.errorMessage || result.errorCode,
      );
      return;
    }

    const asset = result.assets?.[0];
    if (asset?.uri) {
      await deleteAudioParts(selectedAudioParts);
      setSelectedAudioParts([]);
      setSelectedImage(asset);
    }
  }

  async function pickAttachedAudio() {
    const audio = await pickAudioFile();
    if (audio.durationMs > 30_000) {
      await deleteAudioParts([audio]);
      Alert.alert(
        'Audio is too long',
        'Choose an audio file up to 30 seconds. For longer audio, use the microphone—the app will split it into parts automatically.',
      );
      return;
    }
    await deleteAudioParts(selectedAudioParts);
    setSelectedImage(null);
    setSelectedAudioParts([audio]);
  }

  function showAttachmentPicker() {
    const buttons: AlertButton[] = [
      {
        text: 'Camera',
        onPress: () => {
          pickImage('camera').catch(showPickerError);
        },
      },
      {
        text: 'Photo library',
        onPress: () => {
          pickImage('gallery').catch(showPickerError);
        },
      },
      {
        text: 'Audio file',
        onPress: () => {
          pickAttachedAudio().catch(showAudioError);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ];

    Alert.alert(
      'Add attachment',
      'Choose an image or audio source.',
      Platform.OS === 'android' ? [...buttons].reverse() : buttons,
    );
  }

  function showPickerError(error: unknown) {
    Alert.alert(
      'Could not select image',
      error instanceof Error ? error.message : 'Please try again.',
    );
  }

  function showAudioError(error: unknown) {
    setIsRecording(false);
    setIsTranscribing(false);
    Alert.alert(
      'Audio unavailable',
      error instanceof Error ? error.message : 'Please try recording again.',
    );
  }

  async function requestMicrophonePermission() {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone access',
        message:
          'Subra AI uses your microphone to understand audio on this device.',
        buttonPositive: 'Continue',
        buttonNegative: 'Not now',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function beginRecording(preserveParts = false) {
    if (isReplying || isTranscribing) return;
    const granted = await requestMicrophonePermission();
    if (!granted) {
      Alert.alert(
        'Microphone permission needed',
        'Enable microphone access in Settings to record an audio message.',
      );
      return;
    }
    setSelectedImage(null);
    if (!preserveParts) {
      await deleteAudioParts(selectedAudioParts);
      setSelectedAudioParts([]);
    }
    await startAudioRecording();
    setIsRecording(true);
  }

  async function finishRecording(continueRecording = false) {
    if (!isRecording) return;
    isRotatingAudioRef.current = true;
    setIsRecording(false);
    try {
      const recording = await stopAudioRecording();
      if (recording.durationMs < 300) {
        await deleteAudioParts([recording]);
        if (!continueRecording) {
          Alert.alert(
            'Recording too short',
            'Please record a little more audio.',
          );
        }
      } else if (continueRecording) {
        setSelectedAudioParts(current => [...current, recording]);
        await beginRecording(true);
      } else {
        const audioParts = [...selectedAudioParts, recording];
        setSelectedAudioParts(audioParts);
        setIsTranscribing(true);
        try {
          const transcripts: string[] = [];
          for (let index = 0; index < audioParts.length; index += 1) {
            const text = await transcribeAudioPart(
              audioParts[index],
              index,
            );
            if (text) transcripts.push(text);
          }
          const transcript = transcripts.join(' ').replace(/\s+/g, ' ').trim();
          if (!transcript) {
            throw new Error('I could not understand the recorded audio.');
          }
          setInput(current =>
            current.trim() ? `${current.trim()} ${transcript}` : transcript,
          );
        } finally {
          await deleteAudioParts(audioParts);
          setSelectedAudioParts([]);
          setIsTranscribing(false);
        }
      }
    } finally {
      isRotatingAudioRef.current = false;
    }
  }

  async function discardRecording() {
    if (isRecording) {
      await cancelAudioRecording();
      setIsRecording(false);
    }
    await deleteAudioParts(selectedAudioParts);
    setSelectedAudioParts([]);
  }

  function toggleRecording() {
    if (isTranscribing) return;
    const operation = isRecording ? finishRecording(false) : beginRecording();
    operation.catch(showAudioError);
  }

  async function sendMessage(text = input) {
    const prompt = text.trim();
    const image = selectedImage;
    const audioParts = selectedAudioParts;

    if (
      (!prompt && !image?.uri && audioParts.length === 0) ||
      isReplying ||
      isRecording ||
      isTranscribing
    ) {
      return;
    }

    if (!storageReady) {
      Alert.alert('Chat history is loading', 'Please try again in a moment.');
      return;
    }

    let persistedSessionId: string | null = null;
    let requestStartedAtMs: number | null = null;

    try {
      setInput('');
      setSelectedImage(null);
      setSelectedAudioParts([]);
      setIsReplying(true);
      requestStartedAtMs = Date.now();

      const storedImageUri = image ? await persistChatImage(image) : undefined;
      let transcript = '';
      if (audioParts.length) {
        const transcripts: string[] = [];
        for (let index = 0; index < audioParts.length; index += 1) {
          const part = audioParts[index];
          const partTranscript = await transcribeAudioPart(part, index);
          if (partTranscript) transcripts.push(partTranscript);
        }
        transcript = transcripts.join(' ').replace(/\s+/g, ' ').trim();
        if (!transcript) {
          throw new Error('I could not understand the recorded audio.');
        }
      }

      const displayPrompt =
        prompt || transcript || (image?.uri ? 'What is in this image?' : '');
      const conversation = messages
        .filter(message => message.id !== 'welcome-message')
        .map(
          message =>
            `${message.role === 'user' ? 'USER' : 'ASSISTANT'}: ${
              message.text
            }`,
        )
        .join('\n\n');
      const contextualPrompt = [
        'Continue this conversation naturally and answer the latest user request directly.',
        conversation,
        `USER: ${displayPrompt}`,
        'ASSISTANT:',
      ]
        .filter(Boolean)
        .join('\n\n');
      const sessionId =
        currentSessionId ?? (await createChatSession(displayPrompt));
      persistedSessionId = sessionId;
      const userMessage = {
        ...createMessage('user', displayPrompt),
        imageUri: storedImageUri,
      };

      if (!currentSessionId) setCurrentSessionId(sessionId);
      await saveChatMessage(sessionId, userMessage);
      setMessages(current => [...current, userMessage]);
      await refreshSessions();

      let result;
      if (storedImageUri) {
        result = await generateTextWithImage(contextualPrompt, storedImageUri);
      } else if (audioParts.length) {
        const isTranscriptionRequest =
          /\b(transcribe|transcription)\b/i.test(prompt);
        result = isTranscriptionRequest
          ? { text: transcript }
          : prompt
            ? await generateText(
                [
                  'Use the audio transcript below as context and follow the user instruction.',
                  `AUDIO TRANSCRIPT: ${transcript}`,
                  `USER: ${prompt}`,
                  'ASSISTANT:',
                ].join('\n\n'),
              )
            : await generateText(contextualPrompt);
      } else {
        result = await generateText(contextualPrompt);
      }
      const reply =
        result.text.trim() || 'I could not generate a response right now.';
      const assistantMessage = {
        ...createMessage('assistant', reply),
        processingSeconds: Math.max(
          1,
          Math.round((Date.now() - requestStartedAtMs) / 1000),
        ),
      };

      await saveChatMessage(sessionId, assistantMessage);
      setMessages(current => [...current, assistantMessage]);
      if (preferencesStorage.getBoolean(SPEAK_RESPONSES_KEY) !== false) {
        setSpeakingMessageId(assistantMessage.id);
        requestAnimationFrame(() => {
          speakText(reply).catch(() => {
            setSpeakingMessageId(null);
          });
        });
      }
      await refreshSessions();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'I could not generate a response right now.';
      if (persistedSessionId && requestStartedAtMs !== null) {
        const assistantMessage = {
          ...createMessage('assistant', message),
          processingSeconds: Math.max(
            1,
            Math.round((Date.now() - requestStartedAtMs) / 1000),
          ),
        };
        try {
          await saveChatMessage(persistedSessionId, assistantMessage);
          setMessages(current => [...current, assistantMessage]);
          await refreshSessions();
        } catch {
          Alert.alert('Could not save the response', message);
        }
      } else {
        Alert.alert('Could not save chat', message);
      }
    } finally {
      await deleteAudioParts(audioParts);
      setIsReplying(false);
    }
  }

  const hasComposerContent =
    Boolean(input.trim()) ||
    Boolean(selectedImage?.uri) ||
    selectedAudioParts.length > 0;
  const sendDisabled =
    !hasComposerContent || isReplying || isRecording || isTranscribing;
  const composerShellThemeStyle = {
    backgroundColor: themeColors.inputBgColor,
    borderColor: isRecording ? '#D64545' : themeColors.inputBorderColor,
  };
  const voiceActionTextStyle = {
    color: isRecording ? '#FFFFFF' : themeColors.accentColor,
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: themeColors.screenBgColor }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.screen, { backgroundColor: themeColors.screenBgColor }]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: themeColors.dividerColor },
          ]}
        >
          <View style={styles.headerContent}>
            <TcbsLiquidGlassIconButton
              accessibilityLabel="Go back"
              label="‹"
              onPress={() => navigation.goBack()}
              size={36}
            />
            <View>
              <TcbsText variant="title">Subra AI</TcbsText>
              <TcbsText variant="caption">
                On-device model • Runs offline
              </TcbsText>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: themeColors.accentColor },
              ]}
            />
            <TcbsLiquidGlassIconButton
              accessibilityLabel="Open chat history"
              accessibilityHint="Shows previous conversations and starts a new chat"
              disabled={isReplying}
              label="☰"
              onPress={openHistory}
              size={40}
              textStyle={styles.menuIcon}
            />
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={message => message.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isSpeaking={speakingMessageId === item.id}
              onToggleSpeech={
                item.role === 'assistant'
                  ? () => {
                      toggleMessageSpeech(item).catch(error => {
                        Alert.alert(
                          'Could not control speech',
                          error instanceof Error
                            ? error.message
                            : 'Please try again.',
                        );
                      });
                    }
                  : undefined
              }
            />
          )}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: true });
          }}
          ListFooterComponent={
            isReplying ? (
              <View style={styles.thinkingBubble}>
                <LottieView
                  source={require('./assets/lottie/thinking.json')}
                  autoPlay
                  loop
                  style={styles.thinkingAnimation}
                />
                <TcbsText variant="caption" style={styles.processingMeta}>
                  Working... {workElapsedSeconds}s
                </TcbsText>
              </View>
            ) : null
          }
        />

        <View style={styles.quickPrompts}>
          {QUICK_PROMPTS.map(prompt => (
            <PromptChip
              key={prompt}
              label={prompt}
              disabled={isReplying}
              onPress={() => sendMessage(prompt)}
            />
          ))}
        </View>

        <View
          style={[
            styles.composer,
            {
              backgroundColor: themeColors.cardBgColor,
              borderTopColor: themeColors.borderColor,
            },
          ]}
        >
          {selectedImage?.uri ? (
            <View style={styles.selectedImageContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.selectedImage}
              />
              <Pressable
                accessibilityLabel="Remove selected image"
                onPress={() => setSelectedImage(null)}
                style={[
                  styles.removeImageButton,
                  { backgroundColor: themeColors.textPrimary },
                ]}
              >
                <TcbsText variant="body" style={styles.removeImageText}>
                  ×
                </TcbsText>
              </Pressable>
            </View>
          ) : null}

          {selectedAudioParts.length && !isRecording && !isTranscribing ? (
            <View
              style={[
                styles.selectedAudioContainer,
                {
                  backgroundColor: themeColors.tertiaryColor,
                  borderColor: themeColors.secondaryColor,
                },
              ]}
            >
              <View style={styles.audioAttachmentInfo}>
                <TcbsText style={{ color: themeColors.textPrimary }}>
                  Audio ·{' '}
                  {Math.max(
                    1,
                    Math.round(
                      selectedAudioParts.reduce(
                        (total, part) => total + part.durationMs,
                        0,
                      ) / 1000,
                    ),
                  )}
                  s · {selectedAudioParts.length}{' '}
                  {selectedAudioParts.length === 1 ? 'part' : 'parts'}
                </TcbsText>
              </View>
              <Pressable
                accessibilityLabel="Remove recorded audio"
                onPress={() => {
                  discardRecording().catch(showAudioError);
                }}
              >
                <TcbsText style={{ color: themeColors.accentColor }}>
                  Remove
                </TcbsText>
              </Pressable>
            </View>
          ) : null}

          <View
            style={[styles.composerInputShell, composerShellThemeStyle]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add image or audio attachment"
              accessibilityHint="Opens camera, photo library, and audio file options"
              accessibilityState={{
                disabled: isReplying || isRecording || isTranscribing,
              }}
              disabled={isReplying || isRecording || isTranscribing}
              hitSlop={4}
              onPress={showAttachmentPicker}
              style={({ pressed }) => [
                styles.composerIconButton,
                pressed && styles.composerButtonPressed,
              ]}
            >
              <TcbsText style={{ color: themeColors.accentColor }}>
                Add
              </TcbsText>
            </Pressable>

            {isRecording ? (
              <View style={styles.recordingStatus}>
                <RecordingWaveform
                  audioLevel={audioLevel}
                  color="#D64545"
                />
                <TcbsText style={styles.recordingTime}>
                  {recordingSeconds}s
                </TcbsText>
              </View>
            ) : isTranscribing ? (
              <View
                accessibilityLabel="Transcribing recorded audio"
                accessibilityRole="progressbar"
                style={styles.transcribingStatus}
              >
                <ActivityIndicator
                  color={themeColors.accentColor}
                  size="small"
                />
                <TcbsText style={{ color: themeColors.textSecondary }}>
                  Transcribing…
                </TcbsText>
              </View>
            ) : (
              <TextInput
                accessibilityLabel="Message"
                editable={!isReplying}
                multiline
                onChangeText={setInput}
                placeholder="Message…"
                placeholderTextColor={themeColors.textSecondary}
                style={[styles.input, { color: themeColors.textPrimary }]}
                value={input}
              />
            )}

            {isReplying || isTranscribing ? (
              <View style={styles.composerIconButton}>
                {isReplying ? (
                  <ActivityIndicator color={themeColors.accentColor} />
                ) : null}
              </View>
            ) : hasComposerContent && !isRecording ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                accessibilityHint="Sends your message to Subra AI"
                accessibilityState={{ disabled: sendDisabled }}
                disabled={sendDisabled}
                onPress={() => sendMessage()}
                style={({ pressed }) => [
                  styles.composerIconButton,
                  styles.sendIconButton,
                  { backgroundColor: themeColors.primaryColor },
                  pressed && styles.composerButtonPressed,
                ]}
              >
                <TcbsText style={styles.sendActionText}>Send</TcbsText>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isRecording ? 'Stop recording' : 'Record audio'
                }
                accessibilityHint={
                  isRecording
                    ? 'Stops and attaches the current recording'
                    : 'Starts recording a voice message'
                }
                accessibilityState={{
                  busy: isRecording,
                  disabled: isReplying || isTranscribing,
                }}
                disabled={isReplying || isTranscribing}
                onPress={toggleRecording}
                style={({ pressed }) => [
                  styles.composerIconButton,
                  isRecording && styles.stopRecordingButton,
                  pressed && styles.composerButtonPressed,
                ]}
              >
                <TcbsText style={voiceActionTextStyle}>
                  {isRecording ? 'Stop' : 'Voice'}
                </TcbsText>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={closeHistory}
        statusBarTranslucent
        transparent
        visible={historyOpen}
      >
        <View style={styles.drawerLayer}>
          <Pressable
            accessibilityLabel="Close chat history"
            onPress={closeHistory}
            style={styles.drawerScrim}
          />
          <Animated.View
            style={[
              styles.drawer,
              {
                width: Math.min(screenWidth * 0.86, 390),
                backgroundColor: themeColors.screenBgColor,
                borderLeftColor: themeColors.borderColor,
                transform: [{ translateX: drawerTranslateX }],
              },
            ]}
          >
            <View
              style={[
                styles.drawerSafeArea,
                {
                  paddingTop: Math.max(insets.top, 12),
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <View style={styles.drawerHeader}>
                <TcbsText variant="title">Chats</TcbsText>
                <TcbsLiquidGlassIconButton
                  accessibilityLabel="Close chat history"
                  label="×"
                  onPress={closeHistory}
                  size={36}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start a new chat"
                onPress={startNewChat}
                style={({ pressed }) => [
                  styles.newChatButton,
                  { backgroundColor: themeColors.primaryColor },
                  pressed && styles.drawerRowPressed,
                ]}
              >
                <TcbsText style={styles.newChatIcon}>＋</TcbsText>
                <TcbsText style={styles.newChatText}>New chat</TcbsText>
              </Pressable>

              <TcbsText
                variant="caption"
                style={{
                  ...styles.historyLabel,
                  color: themeColors.textSecondary,
                }}
              >
                RECENT
              </TcbsText>

              <FlatList
                data={sessions}
                keyExtractor={session => session.id}
                contentContainerStyle={styles.sessionList}
                ListEmptyComponent={
                  <TcbsText style={{ color: themeColors.textSecondary }}>
                    Your conversations will appear here after you send a
                    message.
                  </TcbsText>
                }
                renderItem={({ item }) => {
                  const selected = item.id === currentSessionId;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open chat ${item.title}`}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        selectSession(item);
                      }}
                      style={({ pressed }) => [
                        styles.sessionRow,
                        {
                          backgroundColor: selected
                            ? themeColors.tertiaryColor
                            : themeColors.cardBgColor,
                          borderColor: selected
                            ? themeColors.primaryColor
                            : themeColors.cardBorderColor,
                        },
                        pressed && styles.drawerRowPressed,
                      ]}
                    >
                      <TcbsText style={styles.sessionTitle}>
                        {item.title}
                      </TcbsText>
                      <TcbsText
                        variant="caption"
                        style={{ color: themeColors.textSecondary }}
                      >
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </TcbsText>
                    </Pressable>
                  );
                }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  selectedImageContainer: {
    width: '100%',
    position: 'relative',
  },
  selectedAudioContainer: {
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioAttachmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedImage: {
    width: 88,
    height: 66,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    left: 76,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  removeImageText: {
    color: '#FFFFFF',
    lineHeight: 20,
  },
  composerInputShell: {
    width: '100%',
    minHeight: 52,
    maxHeight: 128,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  composerIconButton: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  sendIconButton: {
    marginLeft: 2,
  },
  sendActionText: {
    color: '#07110D',
    fontWeight: '700',
  },
  stopRecordingButton: {
    backgroundColor: '#D64545',
  },
  composerButtonPressed: {
    opacity: 0.68,
    transform: [{ scale: 0.96 }],
  },
  recordingWaveform: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recordingWaveformBar: {
    width: 3,
    height: 24,
    borderRadius: 2,
  },
  recordingStatus: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingTime: {
    color: '#D64545',
  },
  transcribingStatus: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
  },
  thinkingBubble: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  thinkingAnimation: {
    width: 120,
    height: 54,
    marginLeft: -8,
    marginBottom: -6,
  },
  processingMeta: {
    color: '#718096',
    fontSize: 8,
  },
  drawerLayer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
  },
  drawer: {
    height: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 20,
  },
  drawerSafeArea: {
    flex: 1,
    paddingHorizontal: 18,
  },
  drawerHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newChatButton: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  newChatIcon: {
    color: '#07110D',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '700',
  },
  newChatText: {
    color: '#07110D',
    fontSize: 16,
    fontWeight: '700',
  },
  historyLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  sessionList: {
    gap: 10,
    paddingBottom: 30,
  },
  sessionRow: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 5,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  drawerRowPressed: {
    opacity: 0.72,
  },
});
