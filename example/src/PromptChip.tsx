import { Pressable, StyleSheet } from 'react-native';
import { TcbsText, useTcbsColorStore } from '@tcbs/react-native-mazic-ui';

type PromptChipProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PromptChip({
  label,
  onPress,
  disabled = false,
}: PromptChipProps) {
  const { themeColors } = useTcbsColorStore();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ask: ${label}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: pressed
            ? themeColors.tertiaryColor
            : themeColors.cardBgColor,
          borderColor:
            themeColors.secondaryColor ?? themeColors.cardBorderColor,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <TcbsText variant="caption" style={{ color: themeColors.textPrimary }}>
        {label}
      </TcbsText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.4,
  },
});
