import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TcbsText,
  TcbsLiquidGlassButton,
  useTcbsColorStore,
} from '@tcbs/react-native-mazic-ui';
import {
  HOME_SCREEN_CHAT,
  HOME_SCREEN_DETECT_SEVEN_SEGMENT,
  HOME_SCREEN_DETECT_OBJECTS,
} from './utils/features';
import {
  legalLinks,
  moreCommunityLinks,
  primaryCommunityLinks,
  type ExternalLink,
} from './externalLinks';

async function openExternalLink(link: ExternalLink) {
  try {
    const supported = await Linking.canOpenURL(link.url);

    if (!supported) {
      throw new Error('Unsupported URL');
    }

    await Linking.openURL(link.url);
  } catch {
    Alert.alert(
      'Unable to open link',
      `Please try opening ${link.url} in your browser.`,
    );
  }
}

export function SelectionScreen() {
  const navigation = useNavigation<any>();
  const { themeColors } = useTcbsColorStore();
  const [showMoreLinks, setShowMoreLinks] = useState(false);

  const renderCommunityLink = (link: ExternalLink) => (
    <Pressable
      key={link.label}
      accessibilityRole="link"
      accessibilityLabel={`Open ${link.label}`}
      accessibilityHint="Opens in your browser or the corresponding app"
      onPress={() => {
        openExternalLink(link);
      }}
      style={({ pressed }) => [
        styles.communityChip,
        {
          borderColor: link.color,
          backgroundColor: themeColors.cardBgColor,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.brandDot, { backgroundColor: link.color }]} />
      <TcbsText style={styles.communityChipText}>{link.label}</TcbsText>
    </Pressable>
  );

  const renderLegalLink = (label: string, url: `https://${string}` | null) => {
    const enabled = Boolean(url);

    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={() => {
          if (url) {
            openExternalLink({
              label,
              url,
              color:
                themeColors.accentColor ??
                themeColors.primaryColor ??
                themeColors.themeColor,
            });
          }
        }}
        style={({ pressed }) => [
          styles.legalLink,
          !enabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <TcbsText
          style={{ ...styles.legalLinkText, color: themeColors.textSecondary }}
        >
          {label}
        </TcbsText>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: themeColors.screenBgColor }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
    >
      <View style={styles.hero}>
        <TcbsText variant="title" style={styles.title}>
          Welcome to Subra AI
        </TcbsText>
        <TcbsText
          variant="caption"
          style={{ ...styles.subtitle, color: themeColors.textSecondary }}
        >
          Choose an option to continue
        </TcbsText>

        <View style={styles.buttonContainer}>
          {HOME_SCREEN_CHAT && (
            <TcbsLiquidGlassButton
              title="Chat"
              onPress={() => navigation.navigate('Chat')}
              size="lg"
            />
          )}
          {HOME_SCREEN_DETECT_SEVEN_SEGMENT && (
            <TcbsLiquidGlassButton
              title="Detect Seven Segment"
              onPress={() => navigation.navigate('SevenSegment')}
              size="lg"
            />
          )}
          {HOME_SCREEN_DETECT_OBJECTS && (
            <TcbsLiquidGlassButton
              title="Detect Objects"
              onPress={() => navigation.navigate('ObjectDetection')}
              size="lg"
            />
          )}
          <TcbsLiquidGlassButton
            title="Settings"
            onPress={() => navigation.navigate('Settings')}
            size="lg"
          />
        </View>
      </View>

      <View
        style={[
          styles.communityCard,
          {
            backgroundColor: themeColors.cardBgColor,
            borderColor: themeColors.cardBorderColor,
          },
        ]}
      >
        <TcbsText variant="subtitle">Connect with TCBS</TcbsText>
        <TcbsText
          style={{ ...styles.communityCopy, color: themeColors.textSecondary }}
        >
          Tutorials, source code, updates, and community channels.
        </TcbsText>
        <View style={styles.chipGrid}>
          {primaryCommunityLinks.map(renderCommunityLink)}
          {showMoreLinks ? moreCommunityLinks.map(renderCommunityLink) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showMoreLinks ? 'Show fewer community links' : 'Show more links'
          }
          accessibilityState={{ expanded: showMoreLinks }}
          onPress={() => setShowMoreLinks(value => !value)}
          style={({ pressed }) => [
            styles.moreButton,
            { borderColor: themeColors.cardBorderColor },
            pressed && styles.pressed,
          ]}
        >
          <TcbsText style={styles.moreButtonText}>
            {showMoreLinks ? 'Show less' : 'More community links'}
          </TcbsText>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={styles.legalRow}>
          {renderLegalLink('Privacy Policy', legalLinks.privacyPolicy)}
          <TcbsText style={{ color: themeColors.textSecondary }}>·</TcbsText>
          {renderLegalLink('Terms of Use', legalLinks.termsOfUse)}
        </View>
        {!legalLinks.privacyPolicy || !legalLinks.termsOfUse ? (
          <TcbsText
            variant="caption"
            style={{ ...styles.legalNote, color: themeColors.textSecondary }}
          >
            Legal pages coming soon
          </TcbsText>
        ) : null}
        <TcbsText
          variant="caption"
          style={{ ...styles.copyright, color: themeColors.textSecondary }}
        >
          © 2026 TechCraft by Subrata
        </TcbsText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  communityCard: {
    width: '100%',
    marginTop: 48,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  communityCopy: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  communityChip: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  communityChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  moreButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  moreButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  legalLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  legalLinkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  legalNote: {
    marginTop: -4,
    fontSize: 11,
  },
  copyright: {
    marginTop: 12,
    fontSize: 11,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.65,
  },
});
