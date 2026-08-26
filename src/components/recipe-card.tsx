import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DishPlaceholder } from '@/components/icons';
import { TagPill } from '@/components/tag-chip';
import { AbsoluteFill, Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeSummary } from '@/lib/db';

export function RecipeCard({
  recipe,
  onPress,
}: {
  recipe: RecipeSummary;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.line },
        pressed && { opacity: 0.85 },
      ]}>
      <View style={[styles.image, { backgroundColor: theme.surfaceSunken }]}>
        {recipe.imageUri ? (
          <Image source={{ uri: recipe.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <DishPlaceholder size={40} color={theme.inkFaint} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.ink }]} numberOfLines={2}>
          {recipe.title}
        </Text>

        {recipe.description.length > 0 ? (
          <Text style={[styles.description, { color: theme.inkMuted }]} numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}

        {recipe.tags.length > 0 ? (
          <View style={styles.tags}>
            {recipe.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1.5,
  },
  placeholder: {
    ...AbsoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 12,
    gap: 5,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 11.5,
    lineHeight: 15.5,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
});
