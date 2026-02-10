"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppGroupCard } from "@/components/app-group-card";
import { AddGroupDialog } from "@/components/add-group-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { EmptyState } from "@/components/empty-state";
import { useAppGroups } from "@/hooks/use-app-groups";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Dashboard({ userEmail }: { userEmail: string }) {
  const { groups, loaded, addGroup, updateGroup, removeGroup, reorderGroups } = useAppGroups();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const linkedAppleAppIds = groups.map((g) => g.apple?.appId).filter(Boolean) as string[];
  const linkedGooglePackageNames = groups.map((g) => g.google?.packageName).filter(Boolean) as string[];

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
      <header className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Storefront</h1>
          <p className="text-sm text-muted-foreground truncate">
            {userEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>Add App</Button>
        </div>
      </header>

      {groups.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="space-y-6">
          {groups.map((group, i) => (
            <AppGroupCard
              key={group.id}
              group={group}
              onRemove={removeGroup}
              onUpdate={updateGroup}
              onMoveUp={i > 0 ? () => {
                const ids = groups.map((g) => g.id);
                [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                reorderGroups(ids);
              } : undefined}
              onMoveDown={i < groups.length - 1 ? () => {
                const ids = groups.map((g) => g.id);
                [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                reorderGroups(ids);
              } : undefined}
              linkedAppleAppIds={linkedAppleAppIds}
              linkedGooglePackageNames={linkedGooglePackageNames}
            />
          ))}
        </div>
      )}

      <AddGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={addGroup}
        linkedAppleAppIds={linkedAppleAppIds}
        linkedGooglePackageNames={linkedGooglePackageNames}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
