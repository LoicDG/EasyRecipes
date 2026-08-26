import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { ThemePreferences, useTheme, useThemePreference } from '@/hooks/use-theme';

/** Two stacked bars in the palette a choice would apply, shown next to it. */
function Swatch({ dark }: { dark: boolean }) {
  const palette = dark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.swatch, { backgroundColor: palette.background, borderColor: palette.line }]}>
      <View style={[styles.swatchBar, { backgroundColor: palette.accent }]} />
      <View style={[styles.swatchBar, styles.swatchBarShort, { backgroundColor: palette.inkFaint }]} />
    </View>
  );
}

/** The "Match my phone" swatch shows both palettes, split down the middle. */
function SystemSwatch() {
  return (
    <View style={[styles.systemSwatch, { borderColor: Colors.light.line }]}>
      <View style={[styles.systemHalf, { backgroundColor: Colors.light.background }]}>
        <View style={[styles.swatchBar, { backgroundColor: Colors.light.accent }]} />
      </View>
      <View style={[styles.systemHalf, { backgroundColor: Colors.dark.background }]}>
        <View style={[styles.swatchBar, { backgroundColor: Colors.dark.accent }]} />
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.ink }]}>Settings</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Close settings"
          accessibilityRole="button"
          hitSlop={10}
          style={[styles.close, { backgroundColor: theme.surfaceSunken }]}>
          <CloseIcon size={18} color={theme.inkMuted} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={[styles.label, { color: theme.inkMuted }]}>Appearance</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {ThemePreferences.map((option, index) => {
            const selected = option.value === preference;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPreference(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && { borderTopWidth: 1, borderTopColor: theme.line },
                  pressed && { backgroundColor: theme.surfaceSunken },
                ]}>
                {option.value === 'system' ? <SystemSwatch /> : <Swatch dark={option.value === 'dark'} />}

                <View style={styles.optionText}>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: theme.ink,
                        fontFamily: selected ? Fonts.bodyBold : Fonts.bodyMedium,
                      },
                    ]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionHint, { color: theme.inkMuted }]}>{option.hint}</Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    selected
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : { borderColor: theme.line },
                  ]}>
                  {selected ? <CheckIcon size={13} color={theme.onAccent} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.footnote, { color: theme.inkFaint }]}>
          The choice is saved on this phone and applies straight away.
        </Text>
      </ScrollView>
    </View>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: 6,
    paddingBottom: 18,
  },
  headerTitle: {
    fontFamily: Fonts.displayRegular,
    fontSize: 26,
    letterSpacing: -0.3,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  swatchBar: {
    height: 4,
    borderRadius: 2,
  },
  swatchBarShort: {
    width: '60%',
  },
  systemSwatch: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  systemHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  footnote: {
    fontFamily: Fonts.body,
    fontSize: 12,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
});
