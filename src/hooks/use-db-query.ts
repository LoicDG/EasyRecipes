import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs a query against the app database and re-runs it whenever the screen
 * regains focus, so edits made on another screen show up on the way back.
 *
 * `key` stands in for a dependency list: change it when the query's inputs
 * change (for example the active filters) and the query runs again.
 */
export function useDbQuery<T>(
  run: (db: SQLiteDatabase) => Promise<T>,
  key: string = ''
): { data: T | null; reload: () => void } {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | null>(null);
  const [nonce, setNonce] = useState(0);

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      runRef.current(db).then((result) => {
        if (active) setData(result);
      });
      return () => {
        active = false;
      };
      // `key` and `nonce` are the re-run triggers. The query is read from a ref,
      // so the linter cannot see that either one changes what this effect does.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, key, nonce])
  );

  return { data, reload };
}
