import type { SQLiteDatabase } from 'expo-sqlite';

import { TagColors } from '@/constants/theme';

/**
 * Ingredients are matched across recipes by a normalised key, so "Garlic",
 * "garlic " and "GARLIC" are one entry in the pantry.
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type RecipeSummary = {
  id: number;
  title: string;
  description: string;
  timeMinutes: number | null;
  imageUri: string | null;
  tags: Tag[];
};

export type RecipeIngredient = {
  id: number;
  name: string;
  quantity: string;
  have: boolean;
};

export type Recipe = RecipeSummary & {
  instructions: string;
  ingredients: RecipeIngredient[];
};

export type PantryItem = {
  nameKey: string;
  name: string;
  recipeCount: number;
  checked: boolean;
};

export type GroceryItem = {
  nameKey: string;
  name: string;
  /** Recipes that call for it; 0 for something only added by hand. */
  recipeCount: number;
  /** Added by hand, as opposed to only being on the list because it is missing. */
  manual: boolean;
  /** A recipe needs it and the pantry doesn't have it, so it's on the list regardless. */
  missing: boolean;
};

export type RecipeInput = {
  title: string;
  description: string;
  timeMinutes: number | null;
  imageUri: string | null;
  instructions: string;
  tagIds: number[];
  ingredients: { name: string; quantity: string }[];
};

export type RecipeFilter = {
  tagIds: number[];
  onlyCanMake: boolean;
};

const SCHEMA_VERSION = 3;

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        time_minutes INTEGER,
        image_uri TEXT,
        instructions TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL
      );

      CREATE TABLE recipe_tags (
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (recipe_id, tag_id)
      );

      CREATE TABLE recipe_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL,
        quantity TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE pantry (
        name_key TEXT PRIMARY KEY,
        checked INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
      CREATE INDEX idx_recipe_ingredients_key ON recipe_ingredients(name_key);
      CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag_id);
    `);
  }

  if (current < 2) {
    await db.execAsync(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  if (current < 3) {
    // Only items typed in by hand. A missing ingredient needs no row: the list
    // is derived from the pantry.
    await db.execAsync(`
      CREATE TABLE grocery (
        name_key TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

/**
 * Read synchronously: the theme preference is needed on the very first render,
 * and awaiting it would paint the app in the wrong colours first.
 */
export function getSettingSync(db: SQLiteDatabase, key: string): string | null {
  try {
    const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

/**
 * A recipe counts as makeable when it lists at least one ingredient and every
 * one of them is ticked in the pantry. Recipes with no ingredients recorded are
 * excluded — we have nothing to check them against.
 */
const CAN_MAKE_PREDICATE = `
  EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id)
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    LEFT JOIN pantry p ON p.name_key = ri.name_key
    WHERE ri.recipe_id = r.id AND COALESCE(p.checked, 0) = 0
  )
`;

type RecipeRow = {
  id: number;
  title: string;
  description: string;
  time_minutes: number | null;
  image_uri: string | null;
  instructions: string;
};

type TagRow = { id: number; name: string; color: string };

async function attachTags(
  db: SQLiteDatabase,
  recipes: Omit<RecipeSummary, 'tags'>[]
): Promise<RecipeSummary[]> {
  if (recipes.length === 0) return [];

  const placeholders = recipes.map(() => '?').join(', ');
  const rows = await db.getAllAsync<TagRow & { recipe_id: number }>(
    `SELECT rt.recipe_id, t.id, t.name, t.color
       FROM recipe_tags rt
       JOIN tags t ON t.id = rt.tag_id
      WHERE rt.recipe_id IN (${placeholders})
      ORDER BY t.name COLLATE NOCASE`,
    recipes.map((r) => r.id)
  );

  const byRecipe = new Map<number, Tag[]>();
  for (const row of rows) {
    const list = byRecipe.get(row.recipe_id) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color });
    byRecipe.set(row.recipe_id, list);
  }

  return recipes.map((recipe) => ({ ...recipe, tags: byRecipe.get(recipe.id) ?? [] }));
}

function toSummary(row: RecipeRow): Omit<RecipeSummary, 'tags'> {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    timeMinutes: row.time_minutes,
    imageUri: row.image_uri,
  };
}

/**
 * Selected tags narrow the list: a recipe must carry every tag that is active.
 */
export async function listRecipes(
  db: SQLiteDatabase,
  filter: RecipeFilter
): Promise<RecipeSummary[]> {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filter.tagIds.length > 0) {
    const placeholders = filter.tagIds.map(() => '?').join(', ');
    clauses.push(`(
      SELECT COUNT(DISTINCT rt.tag_id) FROM recipe_tags rt
       WHERE rt.recipe_id = r.id AND rt.tag_id IN (${placeholders})
    ) = ?`);
    params.push(...filter.tagIds, filter.tagIds.length);
  }

  if (filter.onlyCanMake) {
    clauses.push(`(${CAN_MAKE_PREDICATE})`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.getAllAsync<RecipeRow>(
    `SELECT r.id, r.title, r.description, r.time_minutes, r.image_uri, r.instructions
       FROM recipes r
       ${where}
      ORDER BY r.created_at DESC, r.id DESC`,
    params
  );

  return attachTags(db, rows.map(toSummary));
}

export async function getRecipe(db: SQLiteDatabase, id: number): Promise<Recipe | null> {
  const row = await db.getFirstAsync<RecipeRow>(
    `SELECT id, title, description, time_minutes, image_uri, instructions
       FROM recipes WHERE id = ?`,
    id
  );
  if (!row) return null;

  const [withTags] = await attachTags(db, [toSummary(row)]);

  const ingredientRows = await db.getAllAsync<{
    id: number;
    name: string;
    quantity: string;
    checked: number | null;
  }>(
    `SELECT ri.id, ri.name, ri.quantity, p.checked
       FROM recipe_ingredients ri
       LEFT JOIN pantry p ON p.name_key = ri.name_key
      WHERE ri.recipe_id = ?
      ORDER BY ri.position, ri.id`,
    id
  );

  return {
    ...withTags,
    instructions: row.instructions,
    ingredients: ingredientRows.map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity,
      have: (ing.checked ?? 0) === 1,
    })),
  };
}

async function writeChildren(
  db: SQLiteDatabase,
  recipeId: number,
  input: RecipeInput
): Promise<void> {
  await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', recipeId);
  await db.runAsync('DELETE FROM recipe_tags WHERE recipe_id = ?', recipeId);

  let position = 0;
  for (const ingredient of input.ingredients) {
    const name = ingredient.name.trim();
    if (name === '') continue;
    await db.runAsync(
      `INSERT INTO recipe_ingredients (recipe_id, name, name_key, quantity, position)
       VALUES (?, ?, ?, ?, ?)`,
      recipeId,
      name,
      normalizeName(name),
      ingredient.quantity.trim(),
      position++
    );
  }

  for (const tagId of input.tagIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)',
      recipeId,
      tagId
    );
  }
}

export async function createRecipe(db: SQLiteDatabase, input: RecipeInput): Promise<number> {
  let newId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO recipes (title, description, time_minutes, image_uri, instructions, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.title.trim(),
      input.description.trim(),
      input.timeMinutes,
      input.imageUri,
      input.instructions.trim(),
      Date.now()
    );
    newId = result.lastInsertRowId;
    await writeChildren(db, newId, input);
  });
  return newId;
}

export async function updateRecipe(
  db: SQLiteDatabase,
  id: number,
  input: RecipeInput
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE recipes
          SET title = ?, description = ?, time_minutes = ?, image_uri = ?, instructions = ?
        WHERE id = ?`,
      input.title.trim(),
      input.description.trim(),
      input.timeMinutes,
      input.imageUri,
      input.instructions.trim(),
      id
    );
    await writeChildren(db, id, input);
  });
}

export async function deleteRecipe(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recipes WHERE id = ?', id);
}

export async function listTags(db: SQLiteDatabase): Promise<Tag[]> {
  return db.getAllAsync<TagRow>('SELECT id, name, color FROM tags ORDER BY name COLLATE NOCASE');
}

/** Returns the existing tag when the name is already taken, so names stay unique. */
export async function createTag(db: SQLiteDatabase, rawName: string): Promise<Tag | null> {
  const name = rawName.trim();
  if (name === '') return null;
  const nameKey = normalizeName(name);

  const existing = await db.getFirstAsync<TagRow>(
    'SELECT id, name, color FROM tags WHERE name_key = ?',
    nameKey
  );
  if (existing) return existing;

  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tags');
  const color = TagColors[(countRow?.count ?? 0) % TagColors.length];

  const result = await db.runAsync(
    'INSERT INTO tags (name, name_key, color) VALUES (?, ?, ?)',
    name,
    nameKey,
    color
  );
  return { id: result.lastInsertRowId, name, color };
}

export async function deleteTag(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM tags WHERE id = ?', id);
}

/**
 * Every distinct ingredient across all recipes, with how many recipes use it and
 * whether it is ticked. The name shown is the most recently entered spelling.
 */
export async function listPantry(db: SQLiteDatabase): Promise<PantryItem[]> {
  const rows = await db.getAllAsync<{
    name_key: string;
    name: string;
    recipe_count: number;
    checked: number | null;
  }>(
    `SELECT ri.name_key,
            (SELECT r2.name FROM recipe_ingredients r2
              WHERE r2.name_key = ri.name_key ORDER BY r2.id DESC LIMIT 1) AS name,
            COUNT(DISTINCT ri.recipe_id) AS recipe_count,
            p.checked
       FROM recipe_ingredients ri
       LEFT JOIN pantry p ON p.name_key = ri.name_key
      GROUP BY ri.name_key
      ORDER BY name COLLATE NOCASE`
  );

  return rows.map((row) => ({
    nameKey: row.name_key,
    name: row.name,
    recipeCount: row.recipe_count,
    checked: (row.checked ?? 0) === 1,
  }));
}

export async function setPantryChecked(
  db: SQLiteDatabase,
  nameKey: string,
  checked: boolean
): Promise<void> {
  await db.runAsync(
    `INSERT INTO pantry (name_key, checked) VALUES (?, ?)
     ON CONFLICT(name_key) DO UPDATE SET checked = excluded.checked`,
    nameKey,
    checked ? 1 : 0
  );
}

export async function clearPantry(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('UPDATE pantry SET checked = 0');
}

/**
 * The grocery list: every recipe ingredient not ticked in the pantry, plus
 * anything added by hand. Ticking an ingredient in the pantry takes it off;
 * unticking puts it back.
 */
export async function listGrocery(db: SQLiteDatabase): Promise<GroceryItem[]> {
  const rows = await db.getAllAsync<{
    name_key: string;
    name: string;
    recipe_count: number;
    manual: number;
    missing: number;
  }>(
    `WITH missing AS (
       SELECT DISTINCT ri.name_key FROM recipe_ingredients ri
         LEFT JOIN pantry p ON p.name_key = ri.name_key
        WHERE COALESCE(p.checked, 0) = 0
     ),
     keys AS (
       SELECT name_key FROM missing
       UNION
       SELECT name_key FROM grocery
     )
     SELECT k.name_key,
            COALESCE(
              g.name,
              (SELECT r2.name FROM recipe_ingredients r2
                WHERE r2.name_key = k.name_key ORDER BY r2.id DESC LIMIT 1)
            ) AS name,
            (SELECT COUNT(DISTINCT r3.recipe_id) FROM recipe_ingredients r3
              WHERE r3.name_key = k.name_key) AS recipe_count,
            g.name_key IS NOT NULL AS manual,
            k.name_key IN (SELECT name_key FROM missing) AS missing
       FROM keys k
       LEFT JOIN grocery g ON g.name_key = k.name_key
      ORDER BY name COLLATE NOCASE`
  );

  return rows.map((row) => ({
    nameKey: row.name_key,
    name: row.name,
    recipeCount: row.recipe_count,
    manual: row.manual === 1,
    missing: row.missing === 1,
  }));
}

/** Adding something the pantry already has still lists it: it may just be running low. */
export async function addGroceryItem(db: SQLiteDatabase, rawName: string): Promise<void> {
  const name = rawName.trim();
  if (name === '') return;
  await db.runAsync(
    `INSERT INTO grocery (name_key, name) VALUES (?, ?)
     ON CONFLICT(name_key) DO UPDATE SET name = excluded.name`,
    normalizeName(name),
    name
  );
}

export async function removeGroceryItem(db: SQLiteDatabase, nameKey: string): Promise<void> {
  await db.runAsync('DELETE FROM grocery WHERE name_key = ?', nameKey);
}

/**
 * Ticking an item off takes it off the list and ticks the ingredient of the same
 * name in the pantry, if a recipe uses one — buying it means having it.
 */
export async function tickGroceryItem(db: SQLiteDatabase, nameKey: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM grocery WHERE name_key = ?', nameKey);
    await db.runAsync(
      `INSERT INTO pantry (name_key, checked)
       SELECT ?, 1 WHERE EXISTS (SELECT 1 FROM recipe_ingredients WHERE name_key = ?)
       ON CONFLICT(name_key) DO UPDATE SET checked = 1`,
      nameKey,
      nameKey
    );
  });
}

/** Undoes `tickGroceryItem`, given the item as it was listed before the tick. */
export async function restoreGroceryItem(db: SQLiteDatabase, item: GroceryItem): Promise<void> {
  await db.withTransactionAsync(async () => {
    if (item.manual) {
      await db.runAsync(
        'INSERT OR IGNORE INTO grocery (name_key, name) VALUES (?, ?)',
        item.nameKey,
        item.name
      );
    }
    if (item.missing) {
      await db.runAsync('UPDATE pantry SET checked = 0 WHERE name_key = ?', item.nameKey);
    }
  });
}

export type Stats = {
  recipeCount: number;
  canMakeCount: number;
  ingredientCount: number;
  checkedCount: number;
};

export async function getStats(db: SQLiteDatabase): Promise<Stats> {
  const recipes = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM recipes'
  );
  const canMake = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM recipes r WHERE ${CAN_MAKE_PREDICATE}`
  );
  const ingredients = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(DISTINCT name_key) AS count FROM recipe_ingredients'
  );
  const checked = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM pantry p
      WHERE p.checked = 1
        AND EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.name_key = p.name_key)`
  );

  return {
    recipeCount: recipes?.count ?? 0,
    canMakeCount: canMake?.count ?? 0,
    ingredientCount: ingredients?.count ?? 0,
    checkedCount: checked?.count ?? 0,
  };
}

/** Image files that no recipe points at any more — used to tidy up after deletes. */
export async function listOrphanImageUris(
  db: SQLiteDatabase,
  candidates: string[]
): Promise<string[]> {
  if (candidates.length === 0) return [];
  const placeholders = candidates.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ image_uri: string }>(
    `SELECT image_uri FROM recipes WHERE image_uri IN (${placeholders})`,
    candidates
  );
  const stillUsed = new Set(rows.map((row) => row.image_uri));
  return candidates.filter((uri) => !stillUsed.has(uri));
}
