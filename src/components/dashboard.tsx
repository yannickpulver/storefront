"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppGroupCard } from "@/components/app-group-card";
import { AddGroupDialog } from "@/components/add-group-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { EmptyState } from "@/components/empty-state";
import { useAppGroups } from "@/hooks/use-app-groups";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings } from "lucide-react";

export function Dashboard() {
  const { groups, loaded, addGroup, updateGroup, removeGroup } = useAppGroups();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const linkedAppleAppIds = groups.map((g) => g.apple?.appId).filter(Boolean) as string[];

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Storefront</h1>
          <p className="text-sm text-muted-foreground">
            Reviews & releases across stores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDialogOpen(true)}>Add App</Button>
        </div>
      </header>

      {groups.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <AppGroupCard
              key={group.id}
              group={group}
              onRemove={removeGroup}
              onUpdate={updateGroup}
              linkedAppleAppIds={linkedAppleAppIds}
            />
          ))}
        </div>
      )}

      <AddGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={addGroup}
        linkedAppleAppIds={linkedAppleAppIds}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
