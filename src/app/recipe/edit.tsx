import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon, ClockIcon, PhotoIcon, PlusIcon } from '@/components/icons';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useKeyboardAwareScroll } from '@/hooks/use-keyboard-aware-scroll';
import { useTheme } from '@/hooks/use-theme';
import { tagPalette } from '@/lib/color';
import {
  createRecipe,
  createTag,
  deleteTag,
  getRecipe,
  listTags,
  updateRecipe,
  type Tag,
} from '@/lib/db';
import { deleteStoredImage, pickRecipeImage } from '@/lib/images';

type IngredientDraft = { key: string; name: string; quantity: string };

function newIngredient(): IngredientDraft {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: '', quantity: '' };
}

export default function EditRecipeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { scrollRef, keyboardHeight, onInputFocus, onScroll } = useKeyboardAwareScroll();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const recipeId = id ? Number(id) : null;
  const isEditing = recipeId !== null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([newIngredient()]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const [loaded, setLoaded] = useState(!isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listTags(db).then(setTags);
  }, [db]);

  useEffect(() => {
    if (recipeId === null) return;
    getRecipe(db, recipeId).then((recipe) => {
      if (!recipe) return;
      setTitle(recipe.title);
      setDescription(recipe.description);
      setTime(recipe.timeMinutes === null ? '' : String(recipe.timeMinutes));
      setInstructions(recipe.instructions);
      setImageUri(recipe.imageUri);
      setOriginalImageUri(recipe.imageUri);
      setSelectedTagIds(recipe.tags.map((tag) => tag.id));
      setIngredients(
        recipe.ingredients.length > 0
          ? recipe.ingredients.map((ingredient) => ({
              key: String(ingredient.id),
              name: ingredient.name,
              quantity: ingredient.quantity,
            }))
          : [newIngredient()]
      );
      setLoaded(true);
    });
  }, [db, recipeId]);

  async function choosePhoto() {
    const picked = await pickRecipeImage();
    if (!picked) return;
    // Drop a previous pick that was never saved so it does not linger on disk.
    if (imageUri && imageUri !== originalImageUri) deleteStoredImage(imageUri);
    setImageUri(picked);
  }

  function removePhoto() {
    if (imageUri && imageUri !== originalImageUri) deleteStoredImage(imageUri);
    setImageUri(null);
  }

  function updateIngredient(key: string, field: 'name' | 'quantity', value: string) {
    setIngredients((current) =>
      current.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }

  function removeIngredient(key: string) {
    setIngredients((current) => {
      const next = current.filter((item) => item.key !== key);
      return next.length > 0 ? next : [newIngredient()];
    });
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((value) => value !== tagId) : [...current, tagId]
    );
  }

  async function addTag() {
    const created = await createTag(db, newTagName);
    if (!created) return;
    setTags(await listTags(db));
    setSelectedTagIds((current) =>
      current.includes(created.id) ? current : [...current, created.id]
    );
    setNewTagName('');
    setCreatingTag(false);
  }

  function confirmDeleteTag(tag: Tag) {
    Alert.alert('Delete this tag?', `"${tag.name}" will be removed from every recipe.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTag(db, tag.id);
          setTags(await listTags(db));
          setSelectedTagIds((current) => current.filter((value) => value !== tag.id));
        },
      },
    ]);
  }

  function cancel() {
    if (imageUri && imageUri !== originalImageUri) deleteStoredImage(imageUri);
    router.back();
  }

  async function save() {
    if (title.trim() === '') {
      Alert.alert('A title is needed', 'Give the recipe a name before saving it.');
      return;
    }
    if (saving) return;
    setSaving(true);

    const parsedTime = Number.parseInt(time, 10);
    const input = {
      title,
      description,
      timeMinutes: Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null,
      imageUri,
      instructions,
      tagIds: selectedTagIds,
      ingredients: ingredients
        .filter((item) => item.name.trim() !== '')
        .map((item) => ({ name: item.name, quantity: item.quantity })),
    };

    if (recipeId === null) {
      await createRecipe(db, input);
    } else {
      await updateRecipe(db, recipeId, input);
      if (originalImageUri && originalImageUri !== imageUri) {
        deleteStoredImage(originalImageUri);
      }
    }
    router.back();
  }

  if (!loaded) {
    return <View style={[styles.screen, { backgroundColor: theme.background }]} />;
  }

  const filledIngredients = ingredients.filter((item) => item.name.trim() !== '').length;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={cancel} hitSlop={10}>
          <Text style={[styles.headerAction, { color: theme.inkMuted }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.ink }]}>
          {isEditing ? 'Edit recipe' : 'New recipe'}
        </Text>
        <Pressable onPress={save} hitSlop={10} disabled={saving}>
          <Text style={[styles.headerAction, styles.headerSave, { color: theme.accent }]}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          // The keyboard draws over the bottom of the screen rather than
          // shrinking it, so the content needs room to scroll clear of it.
          { paddingBottom: (keyboardHeight > 0 ? keyboardHeight : insets.bottom) + 40 },
        ]}>
        {imageUri ? (
          <View style={styles.photoWrapper}>
            <Image source={{ uri: imageUri }} style={styles.photo} contentFit="cover" />
            <Pressable
              onPress={removePhoto}
              accessibilityLabel="Remove photo"
              accessibilityRole="button"
              style={[styles.photoRemove, { backgroundColor: theme.overlay }]}>
              <CloseIcon size={18} color={theme.ink} />
            </Pressable>
            <Pressable
              onPress={choosePhoto}
              style={[styles.photoChange, { backgroundColor: theme.overlay }]}>
              <Text style={[styles.photoChangeText, { color: theme.ink }]}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={choosePhoto}
            style={({ pressed }) => [
              styles.photoPicker,
              { borderColor: theme.line, backgroundColor: theme.surfaceSunken },
              pressed && { opacity: 0.85 },
            ]}>
            <PhotoIcon size={30} color={theme.inkFaint} />
            <Text style={[styles.photoPickerTitle, { color: theme.ink }]}>Add a photo</Text>
            <Text style={[styles.photoPickerHint, { color: theme.inkFaint }]}>
              Choose from your gallery
            </Text>
          </Pressable>
        )}

        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.inkMuted }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={onInputFocus}
              placeholder="What is it called?"
              placeholderTextColor={theme.inkFaint}
              style={[
                styles.input,
                { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.inkMuted }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              onFocus={onInputFocus}
              placeholder="A line or two that shows on the recipe card…"
              placeholderTextColor={theme.inkFaint}
              multiline
              style={[
                styles.input,
                styles.multiline,
                { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink },
              ]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.inkMuted }]}>Total time</Text>
            <View
              style={[
                styles.timeRow,
                { backgroundColor: theme.surface, borderColor: theme.line },
              ]}>
              <ClockIcon size={18} color={theme.inkFaint} />
              <TextInput
                value={time}
                onChangeText={setTime}
                onFocus={onInputFocus}
                placeholder="45"
                placeholderTextColor={theme.inkFaint}
                keyboardType="number-pad"
                style={[styles.timeInput, { color: theme.ink }]}
              />
              <Text style={[styles.timeSuffix, { color: theme.inkFaint }]}>minutes</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.inkMuted }]}>Tags</Text>
          <View style={styles.tagWrap}>
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              const { foreground } = tagPalette(tag.color, false);
              return (
                <Pressable
                  key={tag.id}
                  onPress={() => toggleTag(tag.id)}
                  onLongPress={() => confirmDeleteTag(tag)}
                  style={({ pressed }) => [
                    styles.tagChip,
                    selected
                      ? { backgroundColor: foreground, borderColor: foreground }
                      : { backgroundColor: theme.surface, borderColor: theme.line },
                    pressed && { opacity: 0.75 },
                  ]}>
                  {selected ? <CheckIcon size={13} color="#FFFFFF" /> : null}
                  <Text
                    style={[
                      styles.tagChipText,
                      {
                        color: selected ? '#FFFFFF' : theme.ink,
                        fontFamily: selected ? Fonts.bodySemi : Fonts.bodyMedium,
                      },
                    ]}>
                    {tag.name}
                  </Text>
                </Pressable>
              );
            })}

            {creatingTag ? (
              <View
                style={[
                  styles.newTagRow,
                  { backgroundColor: theme.surface, borderColor: theme.accent },
                ]}>
                <TextInput
                  value={newTagName}
                  onChangeText={setNewTagName}
                  onFocus={onInputFocus}
                  placeholder="Tag name"
                  placeholderTextColor={theme.inkFaint}
                  autoFocus
                  onSubmitEditing={addTag}
                  returnKeyType="done"
                  style={[styles.newTagInput, { color: theme.ink }]}
                />
                <Pressable onPress={addTag} hitSlop={8}>
                  <CheckIcon size={16} color={theme.accent} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setCreatingTag(false);
                    setNewTagName('');
                  }}
                  hitSlop={8}>
                  <CloseIcon size={16} color={theme.inkFaint} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setCreatingTag(true)}
                style={({ pressed }) => [
                  styles.tagChip,
                  styles.dashed,
                  { borderColor: theme.inkFaint },
                  pressed && { opacity: 0.75 },
                ]}>
                <PlusIcon size={13} color={theme.inkMuted} />
                <Text style={[styles.tagChipText, { color: theme.inkMuted, fontFamily: Fonts.bodySemi }]}>
                  New tag
                </Text>
              </Pressable>
            )}
          </View>
          {tags.length > 0 ? (
            <Text style={[styles.hint, { color: theme.inkFaint }]}>
              Long-press a tag to delete it.
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: theme.inkMuted }]}>Ingredients</Text>
            <Text style={[styles.hint, { color: theme.inkFaint }]}>{filledIngredients} added</Text>
          </View>

          <View style={styles.ingredientList}>
            {ingredients.map((ingredient) => (
              <View key={ingredient.key} style={styles.ingredientRow}>
                <TextInput
                  value={ingredient.name}
                  onChangeText={(value) => updateIngredient(ingredient.key, 'name', value)}
                  onFocus={onInputFocus}
                  placeholder="Ingredient"
                  placeholderTextColor={theme.inkFaint}
                  style={[
                    styles.input,
                    styles.ingredientName,
                    { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink },
                  ]}
                />
                <TextInput
                  value={ingredient.quantity}
                  onChangeText={(value) => updateIngredient(ingredient.key, 'quantity', value)}
                  onFocus={onInputFocus}
                  placeholder="Amount"
                  placeholderTextColor={theme.inkFaint}
                  style={[
                    styles.input,
                    styles.ingredientQuantity,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.line,
                      color: theme.inkMuted,
                    },
                  ]}
                />
                <Pressable
                  onPress={() => removeIngredient(ingredient.key)}
                  accessibilityLabel={`Remove ${ingredient.name || 'ingredient'}`}
                  hitSlop={8}
                  style={styles.ingredientRemove}>
                  <CloseIcon size={17} color={theme.inkFaint} />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() => setIngredients((current) => [...current, newIngredient()])}
              style={({ pressed }) => [
                styles.addRow,
                styles.dashed,
                { borderColor: theme.inkFaint },
                pressed && { opacity: 0.75 },
              ]}>
              <PlusIcon size={15} color={theme.inkMuted} />
              <Text style={[styles.addRowText, { color: theme.inkMuted }]}>Add ingredient</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.inkMuted }]}>Instructions</Text>
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            onFocus={onInputFocus}
            placeholder={'One step per line.\n\nSteep the shiitake in just-boiled water…'}
            placeholderTextColor={theme.inkFaint}
            multiline
            style={[
              styles.input,
              styles.instructions,
              { backgroundColor: theme.surface, borderColor: theme.line, color: theme.ink },
            ]}
          />
        </View>

        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.accent },
            (pressed || saving) && { opacity: 0.85 },
          ]}>
          <Text style={[styles.saveButtonText, { color: theme.onAccent }]}>
            {isEditing ? 'Save changes' : 'Save recipe'}
          </Text>
        </Pressable>
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
    paddingBottom: 16,
  },
  headerAction: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
  },
  headerSave: {
    fontFamily: Fonts.bodyBold,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 19,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: 22,
  },
  photoPicker: {
    height: 172,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  photoPickerTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
  },
  photoPickerHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  photoWrapper: {
    height: 172,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoChange: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoChangeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
  },
  fields: {
    gap: 14,
  },
  field: {
    gap: 7,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: Fonts.body,
    fontSize: 15,
    minHeight: 48,
  },
  // The multiline fields are capped so they scroll internally instead of growing
  // taller than the space left above the keyboard.
  multiline: {
    minHeight: 76,
    maxHeight: 150,
    textAlignVertical: 'top',
    lineHeight: 21,
  },
  instructions: {
    minHeight: 140,
    maxHeight: 230,
    textAlignVertical: 'top',
    lineHeight: 22,
    fontSize: 14.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 15,
    minHeight: 48,
  },
  timeInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    paddingVertical: 13,
  },
  timeSuffix: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  tagChipText: {
    fontSize: 13.5,
  },
  dashed: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  newTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  newTagInput: {
    minWidth: 110,
    fontFamily: Fonts.body,
    fontSize: 14,
    paddingVertical: 0,
  },
  ingredientList: {
    gap: Spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14.5,
  },
  ingredientQuantity: {
    width: 96,
    fontSize: 14.5,
  },
  ingredientRemove: {
    width: 30,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: Radius.md,
    minHeight: 48,
  },
  addRowText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
  },
  saveButton: {
    borderRadius: Radius.lg,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15.5,
  },
});
