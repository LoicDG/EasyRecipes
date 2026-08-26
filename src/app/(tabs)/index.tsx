import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { CheckIcon, PlusIcon, SlidersIcon } from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import { PlainChip, TagChip } from '@/components/tag-chip';
import { Fonts, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { deleteTag, getStats, listRecipes, listTags, type RecipeSummary, type Tag } from '@/lib/db';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [onlyCanMake, setOnlyCanMake] = useState(false);

  const { data: tags, reload: reloadTags } = useDbQuery(listTags);
  const { data: stats, reload: reloadStats } = useDbQuery(getStats);
  const { data: recipes, reload: reloadRecipes } = useDbQuery(
    (db) => listRecipes(db, { tagIds: selectedTagIds, onlyCanMake }),
    `${selectedTagIds.join(',')}|${onlyCanMake}`
  );

  const toggleTag = useCallback((id: number) => {
    setSelectedTagIds((current) =>
      current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id]
    );
  }, []);

  const confirmDeleteTag = useCallback(
    (tag: Tag) => {
      Alert.alert('Delete this tag?', `"${tag.name}" will be removed from every recipe.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTag(db, tag.id);
            setSelectedTagIds((current) => current.filter((tagId) => tagId !== tag.id));
            reloadTags();
            reloadRecipes();
            reloadStats();
          },
        },
      ]);
    },
    [db, reloadTags, reloadRecipes, reloadStats]
  );

  // A lone card on the final row would stretch across both columns, so pad the
  // data to an even length and render the extra slot as empty space.
  const gridData = useMemo<(RecipeSummary | null)[]>(() => {
    const list = recipes ?? [];
    return list.length % 2 === 1 ? [...list, null] : list;
  }, [recipes]);

  const filtersActive = selectedTagIds.length > 0 || onlyCanMake;
  const subtitle = stats
    ? `${stats.recipeCount} ${stats.recipeCount === 1 ? 'recipe' : 'recipes'} · ${
        stats.canMakeCount
      } you can cook now`
    : ' ';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.appTitle, { color: theme.ink }]}>EasyRecipes</Text>
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: theme.surface, borderColor: theme.line },
            pressed && { opacity: 0.7 },
          ]}>
          <SlidersIcon size={20} color={theme.inkMuted} />
        </Pressable>
      </View>

      {tags && tags.length > 0 ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            <PlainChip
              label="All"
              selected={selectedTagIds.length === 0}
              onPress={() => setSelectedTagIds([])}
            />
            {tags.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                selected={selectedTagIds.includes(tag.id)}
                onPress={() => toggleTag(tag.id)}
                onLongPress={() => confirmDeleteTag(tag)}
              />
            ))}
          </ScrollView>
          <Text style={[styles.chipHint, { color: theme.inkFaint }]}>
            Tap a tag to filter · long-press to delete it
          </Text>
        </>
      ) : null}

      <Pressable
        onPress={() => setOnlyCanMake((value) => !value)}
        style={({ pressed }) => [
          styles.toggleCard,
          { backgroundColor: theme.surface, borderColor: onlyCanMake ? theme.olive : theme.line },
          pressed && { opacity: 0.9 },
        ]}>
        <View style={[styles.toggleIcon, { backgroundColor: theme.oliveSoft }]}>
          <CheckIcon size={19} color={theme.olive} />
        </View>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleTitle, { color: theme.ink }]}>Only what I can make</Text>
          <Text style={[styles.toggleSubtitle, { color: theme.inkMuted }]}>
            {stats
              ? `Using the ${stats.checkedCount} ${
                  stats.checkedCount === 1 ? 'ingredient' : 'ingredients'
                } you have`
              : ' '}
          </Text>
        </View>
        <View
          style={[
            styles.switchTrack,
            {
              backgroundColor: onlyCanMake ? theme.olive : theme.line,
              alignItems: onlyCanMake ? 'flex-end' : 'flex-start',
            },
          ]}>
          <View style={[styles.switchKnob, { backgroundColor: theme.surface }]} />
        </View>
      </Pressable>

      <FlatList
        data={gridData}
        keyExtractor={(item, index) => (item ? String(item.id) : `spacer-${index}`)}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: TabBarHeight + insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          item ? (
            <RecipeCard recipe={item} onPress={() => router.push(`/recipe/${item.id}`)} />
          ) : (
            <View style={styles.gridSpacer} />
          )
        }
        ListEmptyComponent={
          recipes === null ? null : filtersActive ? (
            <EmptyState
              title="Nothing matches"
              message="No recipe carries every tag you picked. Try loosening the filters."
              actionLabel="Clear filters"
              onAction={() => {
                setSelectedTagIds([]);
                setOnlyCanMake(false);
              }}
            />
          ) : (
            <EmptyState
              title="No recipes yet"
              message="Add the first one and it will show up here with its photo and tags."
              actionLabel="Add a recipe"
              onAction={() => router.push('/recipe/edit')}
            />
          )
        }
      />

      <Pressable
        onPress={() => router.push('/recipe/edit')}
        accessibilityLabel="Add a recipe"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.accent,
            bottom: TabBarHeight + insets.bottom + 16,
          },
          pressed && { opacity: 0.85 },
        ]}>
        <PlusIcon size={26} color={theme.onAccent} />
      </Pressable>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: 2,
    paddingBottom: 14,
  },
  headerText: {
    gap: 3,
    flexShrink: 1,
  },
  appTitle: {
    fontFamily: Fonts.displayRegular,
    fontSize: 30,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12.5,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  chipRow: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 8,
  },
  chipHint: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 12,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    padding: 13,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  toggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    flex: 1,
    gap: 1,
  },
  toggleTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14.5,
  },
  toggleSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  switchTrack: {
    width: 46,
    height: 27,
    borderRadius: Radius.pill,
    padding: 3,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 21,
    height: 21,
    borderRadius: Radius.pill,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    gap: 14,
  },
  column: {
    gap: 14,
  },
  gridSpacer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#8C3A1C',
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
