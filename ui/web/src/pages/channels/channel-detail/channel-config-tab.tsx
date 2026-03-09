import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Save, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChannelInstanceData } from "@/types/channel";
import { configSchema } from "../channel-schemas";
import { ChannelFields } from "../channel-fields";

interface ChannelConfigTabProps {
  instance: ChannelInstanceData;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}

export function ChannelConfigTab({ instance, onUpdate }: ChannelConfigTabProps) {
  const { t } = useTranslation("channels");
  const config = instance.config ?? {};
  // Filter out "groups" from config — managed in separate Groups tab
  const { groups: _groups, ...restConfig } = config as Record<string, unknown> & { groups?: unknown };

  const [values, setValues] = useState<Record<string, unknown>>(restConfig);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fields = configSchema[instance.channel_type] ?? [];

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    const cleanConfig = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined && v !== "" && v !== null),
    );
    // Preserve existing groups when saving config
    const existingGroups = (instance.config as Record<string, unknown> | null)?.groups;
    const merged = existingGroups
      ? { ...cleanConfig, groups: existingGroups }
      : cleanConfig;

    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await onUpdate({ config: Object.keys(merged).length > 0 ? merged : null });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (fields.length === 0) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-muted-foreground">
          {t("detail.config.noSchema")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <ChannelFields
        fields={fields}
        values={values}
        onChange={handleChange}
        idPrefix="cd-cfg"
      />

      {saveError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveError}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="h-3.5 w-3.5" /> {t("detail.config.saved")}
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {!saving && <Save className="h-4 w-4" />}
          {saving ? t("detail.config.saving") : t("detail.config.saveConfig")}
        </Button>
      </div>
    </div>
  );
}
