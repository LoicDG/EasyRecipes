import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { SQLiteDatabase } from 'expo-sqlite';

import { listOrphanImageUris } from '@/lib/db';

const IMAGE_DIR_NAME = 'recipe-images';

function imageDirectory(): Directory {
  const dir = new Directory(Paths.document, IMAGE_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function extensionFor(uri: string): string {
  const match = /\.([a-zA-Z0-9]{3,4})(?:\?|$)/.exec(uri);
  return match ? `.${match[1].toLowerCase()}` : '.jpg';
}

/**
 * Opens the gallery and copies the chosen photo into the app's document
 * directory. The picker hands back a cache URI that Android is free to purge,
 * so the copy is what makes the image survive a restart.
 *
 * Returns null when the user cancels or denies permission.
 */
export async function pickRecipeImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const destination = new File(
    imageDirectory(),
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensionFor(asset.uri)}`
  );

  new File(asset.uri).copy(destination);
  return destination.uri;
}

/**
 * Deletes stored images no recipe points at. A photo can be left behind when a
 * half-finished recipe is abandoned, so this runs once at launch rather than
 * trying to catch every way out of the form.
 */
export async function sweepOrphanImages(db: SQLiteDatabase): Promise<void> {
  try {
    const entries = imageDirectory().list();
    const uris = entries.filter((entry): entry is File => entry instanceof File).map((f) => f.uri);
    const orphans = await listOrphanImageUris(db, uris);
    orphans.forEach(deleteStoredImage);
  } catch {
    // Housekeeping only — never block startup on it.
  }
}

/** Removes a stored image, ignoring one that is already gone. */
export function deleteStoredImage(uri: string | null | undefined): void {
  if (!uri || !uri.includes(IMAGE_DIR_NAME)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing or unreadable file is not worth interrupting the user for.
  }
}
