"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GoogleStoreEntry, AppleStoreEntry } from "@/components/app-store-entry";
import { LinkStoreDialog } from "@/components/link-store-dialog";
import type { AppGroup } from "@/lib/types";
import { Plus } from "lucide-react";

export function AppGroupCard({
  group,
  onRemove,
  onUpdate,
  linkedAppleAppIds,
}: {
  group: AppGroup;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<AppGroup>) => void;
  linkedAppleAppIds: string[];
}) {
  const [linkStore, setLinkStore] = useState<"google" | "apple" | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
            onClick={() => onRemove(group.id)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Play column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-xs">G</span>
                </div>
                <span className="text-sm font-medium">Google Play</span>
              </div>
              {group.google ? (
                <GoogleStoreEntry packageName={group.google.packageName} />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setLinkStore("google")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Link Google Play
                </Button>
              )}
            </div>

            <Separator className="md:hidden" />

            {/* App Store column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded bg-blue-500/10 flex items-center justify-center">
                  <span className="text-xs">A</span>
                </div>
                <span className="text-sm font-medium">App Store</span>
              </div>
              {group.apple ? (
                <AppleStoreEntry appId={group.apple.appId} />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setLinkStore("apple")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Link App Store
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {linkStore && (
        <LinkStoreDialog
          open={!!linkStore}
          onOpenChange={(v) => { if (!v) setLinkStore(null); }}
          store={linkStore}
          onLink={(data) => onUpdate(group.id, data)}
          excludeAppleAppIds={linkedAppleAppIds}
        />
      )}
    </>
  );
}
