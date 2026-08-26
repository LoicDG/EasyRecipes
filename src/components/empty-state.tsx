import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.inkMuted }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.accent },
            pressed && { opacity: 0.85 },
          ]}>
          <Text style={[styles.actionText, { color: theme.onAccent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 56,
    gap: 8,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 21,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
  },
  action: {
    marginTop: 12,
    paddingHorizontal: 22,
    minHeight: 46,
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  actionText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
});
