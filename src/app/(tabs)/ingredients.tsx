import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { CheckBox } from '@/components/icons';
import { Fonts, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { clearPantry, getStats, listPantry, setPantryChecked, type PantryItem } from '@/lib/db';

type Section = { title: string; data: PantryItem[] };

function groupByInitial(items: PantryItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const first = item.name.charAt(0).toUpperCase();
    const title = /[A-Z]/.test(first) ? first : '#';
    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.data.push(item);
    } else {
      sections.push({ title, data: [item] });
    }
  }
  return sections;
}

export default function IngredientsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const { data: pantry, reload: reloadPantry } = useDbQuery(listPantry);
  const { data: stats, reload: reloadStats } = useDbQuery(getStats);

  // Ticks are applied locally the moment they are tapped, so the row responds
  // without waiting on the write. They are pinned to the result they were made
  // against: the grocery list ticks the pantry too, so a refetch is the truth
  // and any overrides made before it are dropped.
  const [local, setLocal] = useState<{
    base: PantryItem[] | null;
    overrides: Record<string, boolean>;
  }>({ base: null, overrides: {} });

  const items = useMemo<PantryItem[]>(() => {
    const overrides = local.base === pantry ? local.overrides : {};
    return (pantry ?? []).map((item) => ({
      ...item,
      checked: overrides[item.nameKey] ?? item.checked,
    }));
  }, [pantry, local]);

  const sections = useMemo(() => groupByInitial(items), [items]);
  const checkedCount = items.filter((item) => item.checked).length;

  async function toggle(item: PantryItem) {
    const next = !item.checked;
    setLocal((current) => ({
      base: pantry,
      overrides: {
        ...(current.base === pantry ? current.overrides : {}),
        [item.nameKey]: next,
      },
    }));
    await setPantryChecked(db, item.nameKey, next);
    reloadStats();
  }

  function confirmClear() {
    Alert.alert('Clear the list?', 'Every ingredient will be unchecked.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearPantry(db);
          reloadPantry();
          reloadStats();
        },
      },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.ink }]}>Ingredients</Text>
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>
            {stats
              ? `Everything your ${stats.recipeCount} ${
                  stats.recipeCount === 1 ? 'recipe calls' : 'recipes call'
                } for`
              : ' '}
          </Text>
        </View>
        {checkedCount > 0 ? (
          <Pressable onPress={confirmClear} hitSlop={10} style={styles.clear}>
            <Text style={[styles.clearText, { color: theme.accent }]}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      {items.length > 0 ? (
        <View style={[styles.summary, { backgroundColor: theme.oliveSoft }]}>
          <Text style={[styles.summaryNumber, { color: theme.oliveInk }]}>{checkedCount}</Text>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryTitle, { color: theme.oliveInk }]}>
              of {items.length} ingredients checked
            </Text>
            <Text style={[styles.summarySubtitle, { color: theme.olive }]}>
              {stats
                ? stats.canMakeCount === 0
                  ? 'Not enough for a full recipe yet'
                  : `Enough for ${stats.canMakeCount} ${
                      stats.canMakeCount === 1 ? 'recipe' : 'recipes'
                    } right now`
                : ' '}
            </Text>
          </View>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.nameKey}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: TabBarHeight + insets.bottom + 24 },
        ]}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: theme.inkFaint }]}>{section.title}</Text>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
        renderItem={({ item, index, section }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          return (
            <Pressable
              onPress={() => toggle(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.line,
                  borderTopWidth: isFirst ? 1 : 0,
                  borderBottomWidth: 1,
                  borderTopLeftRadius: isFirst ? Radius.lg : 0,
                  borderTopRightRadius: isFirst ? Radius.lg : 0,
                  borderBottomLeftRadius: isLast ? Radius.lg : 0,
                  borderBottomRightRadius: isLast ? Radius.lg : 0,
                },
                pressed && { opacity: 0.8 },
              ]}>
              <CheckBox
                size={22}
                color={theme.olive}
                emptyColor={theme.inkFaint}
                checked={item.checked}
              />
              <Text
                style={[
                  styles.rowName,
                  {
                    color: item.checked ? theme.ink : theme.inkMuted,
                    fontFamily: item.checked ? Fonts.bodyMedium : Fonts.body,
                  },
                ]}
                numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.rowCount, { color: theme.inkFaint }]}>
                {item.recipeCount} {item.recipeCount === 1 ? 'recipe' : 'recipes'}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          pantry === null ? null : (
            <EmptyState
              title="Nothing to shop for"
              message="Ingredients appear here as soon as you add them to a recipe."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: 2,
    paddingBottom: 14,
  },
  headerText: {
    gap: 3,
    flexShrink: 1,
  },
  title: {
    fontFamily: Fonts.displayRegular,
    fontSize: 30,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
  },
  clear: {
    paddingTop: 8,
  },
  clearText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  summaryNumber: {
    fontFamily: Fonts.display,
    fontSize: 30,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
  },
  summarySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: Spacing.xl,
  },
  sectionHeader: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    paddingBottom: Spacing.sm,
    paddingLeft: 2,
  },
  sectionFooter: {
    height: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 15,
    minHeight: 52,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
  },
  rowCount: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
});
