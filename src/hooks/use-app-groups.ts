"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppGroup } from "@/lib/types";

const STORAGE_KEY = "storefront-app-groups";

export function useAppGroups() {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setGroups(JSON.parse(raw));
      } catch {}
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next: AppGroup[]) => {
    setGroups(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addGroup = useCallback(
    (group: AppGroup) => {
      persist([...groups, group]);
    },
    [groups, persist]
  );

  const updateGroup = useCallback(
    (id: string, patch: Partial<AppGroup>) => {
      persist(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    },
    [groups, persist]
  );

  const removeGroup = useCallback(
    (id: string) => {
      persist(groups.filter((g) => g.id !== id));
    },
    [groups, persist]
  );

  return { groups, loaded, addGroup, updateGroup, removeGroup };
}
