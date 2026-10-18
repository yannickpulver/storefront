"use client";

import { useState, type DragEvent } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppGroup } from "@/lib/types";

const ICON_SIZE = 128;

/** Scales an image file down to a square PNG data URL. */
async function toIconDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = ICON_SIZE;
    canvas.getContext("2d")!.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function iconUrlOf(group: AppGroup): string | undefined {
  if (group.customIcon) return group.customIcon;
  if (group.google) return `/api/app-icon?store=google&id=${group.google.packageName}`;
  if (group.apple) return `/api/app-icon?store=apple&id=${group.apple.appId}`;
  return undefined;
}

/** Shows the app icon. With `onDropIcon`, an image file dropped onto it becomes the custom icon. */
export function AppIcon({
  iconUrl,
  name,
  onDropIcon,
}: {
  iconUrl?: string;
  name: string;
  onDropIcon?: (dataUrl: string) => void;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const dropProps = onDropIcon
    ? {
        onDragOver: (e: DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragOver(true);
        },
        onDragLeave: () => setDragOver(false),
        onDrop: async (e: DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
          if (file) onDropIcon(await toIconDataUrl(file));
        },
        title: "Drop an image to set the icon",
      }
    : {};

  const ring = dragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background";

  if (!iconUrl || failed === iconUrl) {
    return (
      <div
        {...dropProps}
        className={cn(
          "h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center",
          onDropIcon && "border border-dashed border-muted-foreground/40",
          ring
        )}
      >
        <Package className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...dropProps}
      src={iconUrl}
      alt={name}
      className={cn("h-8 w-8 shrink-0 rounded-lg shadow-sm", ring)}
      onError={() => setFailed(iconUrl)}
    />
  );
}
