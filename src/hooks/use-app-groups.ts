"use client";

import { useCallback } from "react";
import useSWR from "swr";
import type { AppGroup } from "@/lib/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

export function useAppGroups() {
  const { data, isLoading, mutate } = useSWR<AppGroup[]>(
    "/api/app-groups",
    fetcher,
    { onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 5000 * (retryCount + 1));
      },
    }
  );

  const groups = data ?? [];
  const loaded = !isLoading;

  const addGroup = useCallback(
    async (group: AppGroup) => {
      const res = await fetch("/api/app-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
      const created = await res.json();
      mutate([...groups, created], false);
    },
    [groups, mutate]
  );

  const updateGroup = useCallback(
    async (id: string, patch: Partial<AppGroup>) => {
      const res = await fetch(`/api/app-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const updated = await res.json();
      mutate(
        groups.map((g) => (g.id === id ? updated : g)),
        false
      );
    },
    [groups, mutate]
  );

  const removeGroup = useCallback(
    async (id: string) => {
      await fetch(`/api/app-groups/${id}`, { method: "DELETE" });
      mutate(
        groups.filter((g) => g.id !== id),
        false
      );
    },
    [groups, mutate]
  );

  const reorderGroups = useCallback(
    async (ids: string[]) => {
      const reordered = ids.map((id) => groups.find((g) => g.id === id)!).filter(Boolean);
      mutate(reordered, false);
      await fetch("/api/app-groups/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
    [groups, mutate]
  );

  return { groups, loaded, addGroup, updateGroup, removeGroup, reorderGroups };
}
