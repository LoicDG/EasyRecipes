import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackIcon, CheckCircle, ClockIcon, DishPlaceholder, PencilIcon, TrashIcon } from '@/components/icons';
import { TagPill } from '@/components/tag-chip';
import { AbsoluteFill, Fonts, Radius, Spacing } from '@/constants/theme';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { deleteRecipe, getRecipe, listOrphanImageUris } from '@/lib/db';
import { deleteStoredImage } from '@/lib/images';

function toSteps(instructions: string): string[] {
  return instructions
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function RecipeDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);

  const { data: recipe } = useDbQuery(
    (database) => getRecipe(database, recipeId),
    String(recipeId)
  );

  const steps = useMemo(() => toSteps(recipe?.instructions ?? ''), [recipe?.instructions]);
  const haveCount = recipe?.ingredients.filter((item) => item.have).length ?? 0;

  function confirmDelete() {
    if (!recipe) return;
    Alert.alert('Delete this recipe?', `"${recipe.title}" will be removed for good.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const imageUri = recipe.imageUri;
          await deleteRecipe(db, recipe.id);
          if (imageUri) {
            const orphans = await listOrphanImageUris(db, [imageUri]);
            orphans.forEach(deleteStoredImage);
          }
          router.back();
        },
      },
    ]);
  }

  if (!recipe) {
    return <View style={[styles.screen, { backgroundColor: theme.background }]} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.hero, { backgroundColor: theme.surfaceSunken }]}>
          {recipe.imageUri ? (
            <Image source={{ uri: recipe.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <DishPlaceholder size={72} color={theme.inkFaint} />
            </View>
          )}
        </View>

        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: theme.ink }]}>{recipe.title}</Text>

            <View style={styles.metaRow}>
              {recipe.timeMinutes !== null ? (
                <View style={[styles.timeBadge, { backgroundColor: theme.ink }]}>
                  <ClockIcon size={14} color={theme.background} />
                  <Text style={[styles.timeText, { color: theme.background }]}>
                    {recipe.timeMinutes} min
                  </Text>
                </View>
              ) : null}
              {recipe.tags.map((tag) => (
                <TagPill key={tag.id} tag={tag} size="medium" />
              ))}
            </View>

            {recipe.description.length > 0 ? (
              <Text style={[styles.description, { color: theme.inkMuted }]}>
                {recipe.description}
              </Text>
            ) : null}
          </View>

          {recipe.ingredients.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.ink }]}>Ingredients</Text>
                <Text style={[styles.sectionMeta, { color: theme.olive }]}>
                  {haveCount} of {recipe.ingredients.length} in your kitchen
                </Text>
              </View>

              <View
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                {recipe.ingredients.map((ingredient, index) => (
                  <View
                    key={ingredient.id}
                    style={[
                      styles.ingredientRow,
                      index < recipe.ingredients.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.surfaceSunken,
                      },
                    ]}>
                    <CheckCircle
                      size={20}
                      color={ingredient.have ? theme.olive : theme.inkFaint}
                      filled={ingredient.have}
                    />
                    <Text
                      style={[
                        styles.ingredientName,
                        { color: ingredient.have ? theme.ink : theme.inkFaint },
                      ]}>
                      {ingredient.name}
                    </Text>
                    {ingredient.quantity.length > 0 ? (
                      <Text
                        style={[
                          styles.ingredientQuantity,
                          { color: ingredient.have ? theme.inkMuted : theme.inkFaint },
                        ]}>
                        {ingredient.quantity}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {steps.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.ink }]}>Instructions</Text>
              <View style={styles.steps}>
                {steps.map((step, index) => (
                  <View key={index} style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.accentSoft }]}>
                      <Text style={[styles.stepNumberText, { color: theme.accent }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.ink }]}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.floatingBar, { top: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.roundButton,
            { backgroundColor: theme.overlay },
            pressed && { opacity: 0.8 },
          ]}>
          <BackIcon size={21} color={theme.ink} />
        </Pressable>

        <View style={styles.floatingRight}>
          <Pressable
            onPress={() => router.push({ pathname: '/recipe/edit', params: { id: recipe.id } })}
            accessibilityLabel="Edit recipe"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.roundButton,
              { backgroundColor: theme.overlay },
              pressed && { opacity: 0.8 },
            ]}>
            <PencilIcon size={20} color={theme.ink} />
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            accessibilityLabel="Delete recipe"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.roundButton,
              { backgroundColor: theme.overlay },
              pressed && { opacity: 0.8 },
            ]}>
            <TrashIcon size={20} color={theme.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hero: {
    width: '100%',
    height: 268,
  },
  heroPlaceholder: {
    ...AbsoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    marginTop: -22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: 22,
    gap: 24,
  },
  titleBlock: {
    gap: 11,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  timeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12.5,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 21,
    letterSpacing: -0.2,
  },
  sectionMeta: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12.5,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ingredientName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14.5,
  },
  ingredientQuantity: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  steps: {
    gap: 13,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  stepNumber: {
    width: 27,
    height: 27,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 22,
    paddingTop: 3,
  },
  floatingBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingRight: {
    flexDirection: 'row',
    gap: 9,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
