import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { CheckBox, CloseIcon, PlusIcon } from '@/components/icons';
import { Fonts, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import {
  addGroceryItem,
  listGrocery,
  removeGroceryItem,
  restoreGroceryItem,
  tickGroceryItem,
  type GroceryItem,
} from '@/lib/db';

type Section = { title: string; data: GroceryItem[] };

/** Long enough to see the box fill before the row folds away. */
const TICK_LINGER_MS = 320;
const UNDO_MS = 4000;

export default function GroceriesScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const { data: grocery, reload } = useDbQuery(listGrocery);
  const [draft, setDraft] = useState('');
  const canAdd = draft.trim() !== '';

  // Rows tapped since the last refetch show as ticked until it lands and takes
  // them off. Pinned to the result they were made against, like the overrides
  // on the Ingredients screen.
  const [ticked, setTicked] = useState<{ base: GroceryItem[] | null; keys: string[] }>({
    base: null,
    keys: [],
  });

  const [undoItem, setUndoItem] = useState<GroceryItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sections = useMemo<Section[]>(() => {
    const all = grocery ?? [];
    // Something added by hand that a recipe also needs belongs with the recipes.
    const forRecipes = all.filter((item) => item.missing);
    const addedByYou = all.filter((item) => !item.missing);
    const result: Section[] = [];
    if (forRecipes.length > 0) result.push({ title: 'FOR YOUR RECIPES', data: forRecipes });
    if (addedByYou.length > 0) result.push({ title: 'ADDED BY YOU', data: addedByYou });
    return result;
  }, [grocery]);

  const tickedKeys = ticked.base === grocery ? ticked.keys : [];
  const remaining = (grocery?.length ?? 0) - tickedKeys.length;

  function showUndo(item: GroceryItem) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoItem(item);
    undoTimer.current = setTimeout(() => setUndoItem(null), UNDO_MS);
  }

  async function tick(item: GroceryItem) {
    if (tickedKeys.includes(item.nameKey)) return;
    setTicked((current) => ({
      base: grocery,
      keys: [...(current.base === grocery ? current.keys : []), item.nameKey],
    }));
    await Promise.all([
      tickGroceryItem(db, item.nameKey),
      new Promise((resolve) => setTimeout(resolve, TICK_LINGER_MS)),
    ]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reload();
    showUndo(item);
  }

  async function undo() {
    if (!undoItem) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const item = undoItem;
    setUndoItem(null);
    await restoreGroceryItem(db, item);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reload();
  }

  async function add() {
    if (!canAdd) return;
    await addGroceryItem(db, draft);
    setDraft('');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reload();
  }

  async function remove(item: GroceryItem) {
    await removeGroceryItem(db, item.nameKey);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reload();
  }

  const recipeNeeds = sections.find((s) => s.title === 'FOR YOUR RECIPES')?.data.length ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.ink }]}>Groceries</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>
          What your recipes are missing, plus your extras
        </Text>
      </View>

      {grocery && grocery.length > 0 ? (
        <View style={[styles.summary, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.summaryNumber, { color: theme.accent }]}>{remaining}</Text>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryTitle, { color: theme.ink }]}>
              {remaining === 1 ? 'thing' : 'things'} to buy
            </Text>
            <Text style={[styles.summarySubtitle, { color: theme.inkMuted }]}>
              {recipeNeeds > 0
                ? 'Ticking one off ticks it in Ingredients too'
                : 'Your recipes have everything they need'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Kept above the list rather than inside it, so the keyboard never covers it. */}
      <View style={[styles.addRow, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add something else…"
          placeholderTextColor={theme.inkFaint}
          onSubmitEditing={add}
          submitBehavior="submit"
          returnKeyType="done"
          autoCapitalize="sentences"
          style={[styles.addInput, { color: theme.ink }]}
        />
        <Pressable
          onPress={add}
          hitSlop={8}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityLabel="Add to list"
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: canAdd ? theme.accent : theme.surfaceSunken },
            pressed && { opacity: 0.85 },
          ]}>
          <PlusIcon size={18} color={canAdd ? theme.onAccent : theme.inkFaint} />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.nameKey}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          { paddingBottom: TabBarHeight + insets.bottom + 72 },
        ]}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: theme.inkFaint }]}>{section.title}</Text>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
        renderItem={({ item, index, section }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          const checked = tickedKeys.includes(item.nameKey);
          // Removing something a recipe still needs would leave it on the list.
          const removable = item.manual && !item.missing && !checked;
          return (
            <Pressable
              onPress={() => tick(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityHint="Ticks it off and removes it from the list"
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
              <CheckBox size={22} color={theme.olive} emptyColor={theme.inkFaint} checked={checked} />
              <Text
                style={[
                  styles.rowName,
                  checked
                    ? { color: theme.inkFaint, textDecorationLine: 'line-through' }
                    : { color: theme.ink },
                ]}
                numberOfLines={1}>
                {item.name}
              </Text>
              {item.recipeCount > 0 ? (
                <Text style={[styles.rowMeta, { color: theme.inkFaint }]}>
                  {item.recipeCount} {item.recipeCount === 1 ? 'recipe' : 'recipes'}
                </Text>
              ) : null}
              {removable ? (
                <Pressable
                  onPress={() => remove(item)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name}`}
                  style={({ pressed }) => [
                    styles.remove,
                    { backgroundColor: theme.surfaceSunken },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <CloseIcon size={13} color={theme.inkMuted} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          grocery === null ? null : (
            <EmptyState
              title="All stocked up"
              message="Ingredients you haven't ticked show up here on their own. Add anything else with the field above."
            />
          )
        }
      />

      {undoItem ? (
        <View
          style={[
            styles.undoBar,
            { backgroundColor: theme.ink, bottom: TabBarHeight + insets.bottom + Spacing.md },
          ]}>
          <Text style={[styles.undoText, { color: theme.background }]} numberOfLines={1}>
            {undoItem.name} ticked off
          </Text>
          <Pressable onPress={undo} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.undoAction, { color: theme.accentSoft }]}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    gap: 3,
    paddingHorizontal: Spacing.xl,
    paddingTop: 2,
    paddingBottom: 14,
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  summaryNumber: {
    fontFamily: Fonts.display,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingLeft: 15,
    paddingRight: 7,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  addInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    paddingVertical: 10,
  },
  addButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
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
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  rowMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  remove: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  undoBar: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
    borderRadius: Radius.md,
  },
  undoText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
  },
  undoAction: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
  },
});
