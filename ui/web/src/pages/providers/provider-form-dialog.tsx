import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderData, ProviderInput } from "./hooks/use-providers";
import { slugify, isValidSlug } from "@/lib/slug";
import { PROVIDER_TYPES } from "@/constants/providers";
import { OAuthSection } from "./provider-oauth-section";
import { CLISection } from "./provider-cli-section";

interface ProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ProviderData | null; // null = create mode
  onSubmit: (data: ProviderInput) => Promise<unknown>;
  existingProviders?: ProviderData[];
}

export function ProviderFormDialog({ open, onOpenChange, provider, onSubmit, existingProviders = [] }: ProviderFormDialogProps) {
  const { t } = useTranslation("providers");
  const isEdit = !!provider;
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [providerType, setProviderType] = useState("openai_compat");
  const [apiBase, setApiBase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Only one Claude CLI provider allowed per instance
  const hasClaudeCLI = !isEdit && existingProviders.some((p) => p.provider_type === "claude_cli");

  const isOAuth = providerType === "chatgpt_oauth";
  const isCLI = providerType === "claude_cli";

  useEffect(() => {
    if (open) {
      setError("");
      if (provider) {
        setName(provider.name);
        setDisplayName(provider.display_name || "");
        setProviderType(provider.provider_type);
        setApiBase(provider.api_base || "");
        setApiKey(provider.api_key || "");
        setEnabled(provider.enabled);
      } else {
        setName("");
        setDisplayName("");
        setProviderType("openai_compat");
        setApiBase("");
        setApiKey("");
        setEnabled(true);
      }
    }
  }, [open, provider]);

  const handleSubmit = async () => {
    if (!name.trim() || !providerType) return;
    setLoading(true);
    try {
      const data: ProviderInput = {
        name: name.trim(),
        display_name: displayName.trim() || undefined,
        provider_type: providerType,
        api_base: apiBase.trim() || undefined,
        enabled,
      };

      // Only include api_key if it's a real value (not the mask)
      if (apiKey && apiKey !== "***") {
        data.api_key = apiKey;
      }

      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.saving"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          <DialogDescription>{t("form.configure")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 px-0.5 -mx-0.5 overflow-y-auto min-h-0">
          {/* Provider type selector — always shown in create mode */}
          {!isEdit && (
            <ProviderTypeSelect
              value={providerType}
              hasClaudeCLI={hasClaudeCLI}
              alreadyAddedLabel={t("form.alreadyAdded")}
              providerTypeLabel={t("form.providerType")}
              onChange={(v) => {
                setProviderType(v);
                const preset = PROVIDER_TYPES.find((pt) => pt.value === v);
                setApiBase(preset?.apiBase || "");
                if (v === "chatgpt_oauth") {
                  setName("openai-codex");
                  setDisplayName("ChatGPT (OAuth)");
                } else {
                  if (name === "openai-codex") setName("");
                  if (displayName === "ChatGPT (OAuth)") setDisplayName("");
                }
              }}
            />
          )}

          {isOAuth ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("form.nameFixed")}</Label>
                  <Input value="openai-codex" disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.displayName")}</Label>
                  <Input value="ChatGPT (OAuth)" disabled />
                </div>
              </div>
              <OAuthSection onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["providers"] }); onOpenChange(false); }} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("form.name")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(slugify(e.target.value))}
                    placeholder={t("form.namePlaceholder")}
                    disabled={isEdit}
                  />
                  <p className="text-xs text-muted-foreground">{t("form.nameHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t("form.displayName")}</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t("form.displayNamePlaceholder")}
                  />
                </div>
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label>{t("form.providerType")}</Label>
                  <Select value={providerType} onValueChange={setProviderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.filter((pt) => pt.value !== "chatgpt_oauth").map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>
                          {pt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Claude CLI section */}
              {isCLI && <CLISection open={open} />}

              {/* Standard provider fields (not shown for Claude CLI) */}
              {!isCLI && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiBase">{t("form.apiBase")}</Label>
                    <Input
                      id="apiBase"
                      value={apiBase}
                      onChange={(e) => setApiBase(e.target.value)}
                      placeholder={PROVIDER_TYPES.find((pt) => pt.value === providerType)?.placeholder || PROVIDER_TYPES.find((pt) => pt.value === providerType)?.apiBase || "https://api.example.com/v1"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">{t("form.apiKey")}</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={isEdit ? t("form.apiKeyEditPlaceholder") : t("form.apiKeyPlaceholder")}
                    />
                    {isEdit && apiKey === "***" && (
                      <p className="text-xs text-muted-foreground">
                        {t("form.apiKeySetHint")}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">{t("form.enabled")}</Label>
                <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {isOAuth ? t("form.close") : t("form.cancel")}
          </Button>
          {!isOAuth && (
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || !isValidSlug(name) || !providerType || loading}
            >
              {loading
                ? (isEdit ? t("form.saving") : t("form.creating"))
                : isEdit ? t("form.save") : t("form.create")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Provider type select dropdown ---

function ProviderTypeSelect({ value, hasClaudeCLI, alreadyAddedLabel, providerTypeLabel, onChange }: {
  value: string;
  hasClaudeCLI: boolean;
  alreadyAddedLabel: string;
  providerTypeLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{providerTypeLabel}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROVIDER_TYPES.map((pt) => (
            <SelectItem
              key={pt.value}
              value={pt.value}
              disabled={pt.value === "claude_cli" && hasClaudeCLI}
            >
              {pt.label}
              {pt.value === "claude_cli" && hasClaudeCLI && (
                <span className="ml-1 text-xs opacity-60">{alreadyAddedLabel}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
