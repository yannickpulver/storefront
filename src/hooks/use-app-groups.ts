"use client";

import { useCallback } from "react";
import useSWR from "swr";
import type { AppGroup } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAppGroups() {
  const { data, isLoading, mutate } = useSWR<AppGroup[]>("/api/app-groups", fetcher);

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

  return { groups, loaded, addGroup, updateGroup, removeGroup };
}
