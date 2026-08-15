import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { TcbsText, useTcbsColorStore } from '@tcbs/react-native-mazic-ui';
import { useDownload } from './context/DownloadContext';

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  accessibilityHint?: string;
};

function ActionButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'secondary',
  accessibilityHint,
}: ActionButtonProps) {
  const { themeColors } = useTcbsColorStore();
  const isDisabled = disabled || loading;
  const backgroundColor =
    variant === 'primary' ? themeColors.primaryColor : themeColors.cardBgColor;
  const borderColor =
    variant === 'danger'
      ? themeColors.errorColor
      : variant === 'primary'
      ? themeColors.primaryColor
      : themeColors.cardBorderColor;
  const textColor =
    variant === 'primary'
      ? '#07110D'
      : variant === 'danger'
      ? themeColors.errorColor
      : themeColors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor, borderColor },
        isDisabled && styles.actionButtonDisabled,
        pressed && styles.actionButtonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <TcbsText style={{ ...styles.actionButtonText, color: textColor }}>
          {title}
        </TcbsText>
      )}
    </Pressable>
  );
}

export function ModelManagementScreen() {
  const { themeColors } = useTcbsColorStore();
  const {
    config,
    state,
    startDownload,
    exportModel,
    importModel,
    deleteModel,
    viewExportedFile,
  } = useDownload();
  const busy =
    state.isChecking ||
    state.isDownloading ||
    state.isExporting ||
    state.isImporting ||
    state.isDeleting;
  const isBundled = config.source === 'bundled';

  const confirmDelete = () => {
    Alert.alert(
      'Delete model?',
      `This removes the local ${config.displayName} model from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteModel();
          },
        },
      ],
    );
  };

  const cardColors = {
    backgroundColor: themeColors.cardBgColor,
    borderColor: themeColors.cardBorderColor,
  };

  return (
    <ScrollView
      style={{ backgroundColor: themeColors.screenBgColor }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
    >
      <TcbsText variant="title" style={styles.pageTitle}>
        {config.displayName}
      </TcbsText>
      <TcbsText
        style={{ ...styles.subtitle, color: themeColors.textSecondary }}
      >
        {isBundled
          ? 'This offline model is included with the installed app.'
          : 'Manage the offline model stored on this device.'}
      </TcbsText>

      <View style={[styles.card, cardColors]}>
        <View style={styles.statusHeader}>
          <TcbsText
            variant="caption"
            style={{ ...styles.eyebrow, color: themeColors.textSecondary }}
          >
            STATUS
          </TcbsText>
          {state.modelReady ? (
            <View
              style={[
                styles.readyBadge,
                { backgroundColor: themeColors.tertiaryColor },
              ]}
            >
              <View
                style={[
                  styles.readyDot,
                  { backgroundColor: themeColors.primaryColor },
                ]}
              />
              <TcbsText style={styles.readyBadgeText}>Ready on device</TcbsText>
            </View>
          ) : null}
        </View>

        <TcbsText variant="title" style={styles.statusText}>
          {state.statusText}
        </TcbsText>

        {!state.modelReady ? (
          <>
            <TcbsText style={{ color: themeColors.textSecondary }}>
              {state.progressText}
            </TcbsText>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: themeColors.dividerColor },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(0, state.progressPercent),
                    )}%`,
                    backgroundColor:
                      themeColors.primaryColor ?? themeColors.themeColor,
                  },
                ]}
              />
            </View>
          </>
        ) : null}

        <TcbsText style={styles.storageText}>{state.sizeText}</TcbsText>
        <TcbsText
          variant="caption"
          style={{ ...styles.fileText, color: themeColors.textSecondary }}
        >
          {config.fileName}
        </TcbsText>
        {state.downloadNetworkLabel ? (
          <TcbsText
            variant="caption"
            style={{ color: themeColors.textSecondary }}
          >
            Network: {state.downloadNetworkLabel}
          </TcbsText>
        ) : null}
      </View>

      {!state.modelReady && !isBundled ? (
        <ActionButton
          title={
            state.isDownloading
              ? `Downloading ${state.progressText}`
              : 'Download model'
          }
          onPress={() => {
            startDownload();
          }}
          disabled={busy}
          loading={state.isChecking || state.isDownloading}
          variant="primary"
          accessibilityHint="Downloads the model for offline use"
        />
      ) : null}

      {!isBundled ? (
        <View style={styles.section}>
          <TcbsText variant="subtitle">Transfer model</TcbsText>
          <TcbsText
            style={{ ...styles.sectionCopy, color: themeColors.textSecondary }}
          >
            Export a copy for another device, or import an existing model file.
          </TcbsText>
          <View style={[styles.card, styles.actionCard, cardColors]}>
            <View style={styles.actionRow}>
              <View style={styles.actionColumn}>
                <ActionButton
                  title={state.isExporting ? 'Exporting…' : 'Export'}
                  onPress={() => {
                    exportModel();
                  }}
                  disabled={busy || !state.modelReady}
                  loading={state.isExporting}
                  accessibilityHint="Exports the model to a file"
                />
              </View>
              <View style={styles.actionColumn}>
                <ActionButton
                  title={state.isImporting ? 'Importing…' : 'Import'}
                  onPress={() => {
                    importModel();
                  }}
                  disabled={busy}
                  loading={state.isImporting}
                  accessibilityHint="Imports a model file from this device"
                />
              </View>
            </View>
            {Platform.OS === 'android' && state.exportedModelExists ? (
              <ActionButton
                title="View exported file"
                onPress={() => {
                  viewExportedFile();
                }}
                disabled={busy}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {!isBundled && state.modelReady ? (
        <View style={styles.section}>
          <TcbsText variant="subtitle">Danger zone</TcbsText>
          <TcbsText
            style={{ ...styles.sectionCopy, color: themeColors.textSecondary }}
          >
            Deleting frees local storage. You can download or import the model
            again later.
          </TcbsText>
          <ActionButton
            title={state.isDeleting ? 'Deleting…' : 'Delete model'}
            onPress={confirmDelete}
            disabled={busy}
            loading={state.isDeleting}
            variant="danger"
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 30,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 24,
  },
  card: {
    width: '100%',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  statusHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  readyBadge: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 22,
  },
  storageText: {
    fontSize: 15,
    fontWeight: '600',
  },
  fileText: {
    fontSize: 12,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  section: {
    marginTop: 28,
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  actionCard: {
    padding: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionColumn: {
    flex: 1,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
});
