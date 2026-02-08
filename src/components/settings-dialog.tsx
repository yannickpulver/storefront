"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { mutate } = useSWRConfig();
  const [googleJson, setGoogleJson] = useState("");
  const [appleIssuerId, setAppleIssuerId] = useState("");
  const [appleKeyId, setAppleKeyId] = useState("");
  const [applePrivateKey, setApplePrivateKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setConfigured)
      .catch(() => {});
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const body: Record<string, string> = {};
    if (googleJson.trim()) body.googleServiceAccountJson = googleJson.trim();
    if (appleIssuerId.trim()) body.appleIssuerId = appleIssuerId.trim();
    if (appleKeyId.trim()) body.appleKeyId = appleKeyId.trim();
    if (applePrivateKey.trim()) body.applePrivateKey = applePrivateKey.trim();

    if (Object.keys(body).length === 0) {
      setMessage({ type: "error", text: "No keys provided" });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Revalidate all SWR caches so new keys take effect
      mutate(() => true, undefined, { revalidate: true });

      setMessage({ type: "success", text: "Keys saved successfully" });
      setGoogleJson("");
      setAppleIssuerId("");
      setAppleKeyId("");
      setApplePrivateKey("");
    } catch {
      setMessage({ type: "error", text: "Failed to save keys" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>
            Paste your API keys below. Only filled fields will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Google Play */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Google Play Store</h3>
            <div className="space-y-1.5">
              <Label htmlFor="google-json">Service Account JSON</Label>
              <Textarea
                id="google-json"
                placeholder={configured.googleServiceAccountJson ? "•••••••• (configured)" : '{"type": "service_account", ...}'}
                value={googleJson}
                onChange={(e) => setGoogleJson(e.target.value)}
                rows={4}
                className="font-mono text-xs min-w-0 w-full resize-none [field-sizing:fixed]"
              />
            </div>
          </div>

          {/* Apple App Store */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Apple App Store Connect</h3>
            <div className="space-y-1.5">
              <Label htmlFor="apple-issuer">Issuer ID</Label>
              <Input
                id="apple-issuer"
                placeholder={configured.appleIssuerId ? "•••••••• (configured)" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                value={appleIssuerId}
                onChange={(e) => setAppleIssuerId(e.target.value)}
                className="font-mono text-xs min-w-0 w-full resize-none [field-sizing:fixed]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apple-key-id">Key ID</Label>
              <Input
                id="apple-key-id"
                placeholder={configured.appleKeyId ? "•••••••• (configured)" : "XXXXXXXXXX"}
                value={appleKeyId}
                onChange={(e) => setAppleKeyId(e.target.value)}
                className="font-mono text-xs min-w-0 w-full resize-none [field-sizing:fixed]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apple-private-key">Private Key (.p8)</Label>
              <Textarea
                id="apple-private-key"
                placeholder={configured.applePrivateKey ? "•••••••• (configured)" : "-----BEGIN PRIVATE KEY-----\n..."}
                value={applePrivateKey}
                onChange={(e) => setApplePrivateKey(e.target.value)}
                rows={4}
                className="font-mono text-xs min-w-0 w-full resize-none [field-sizing:fixed]"
              />
            </div>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Keys"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
