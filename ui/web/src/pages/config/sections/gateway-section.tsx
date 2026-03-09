import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoLabel } from "@/components/shared/info-label";
import { TagInput } from "@/components/shared/tag-input";

interface GatewayData {
  host?: string;
  port?: number;
  token?: string;
  owner_ids?: string[];
  allowed_origins?: string[];
  max_message_chars?: number;
  rate_limit_rpm?: number;
  injection_action?: string;
  inbound_debounce_ms?: number;
  block_reply?: boolean;
}

const DEFAULT: GatewayData = {};

function isSecret(val: unknown): boolean {
  return typeof val === "string" && val.includes("***");
}

interface Props {
  data: GatewayData | undefined;
  onSave: (value: GatewayData) => Promise<void>;
  saving: boolean;
}

export function GatewaySection({ data, onSave, saving }: Props) {
  const { t } = useTranslation("config");
  const [draft, setDraft] = useState<GatewayData>(data ?? DEFAULT);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(data ?? DEFAULT);
    setDirty(false);
  }, [data]);

  const update = (patch: Partial<GatewayData>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    // Don't send masked secret fields back
    const toSave = { ...draft };
    if (isSecret(toSave.token)) {
      delete toSave.token;
    }
    onSave(toSave);
  };

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("gateway.title")}</CardTitle>
        <CardDescription>{t("gateway.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.hostTip")}>{t("gateway.host")}</InfoLabel>
            <Input
              value={draft.host ?? ""}
              onChange={(e) => update({ host: e.target.value })}
              placeholder="0.0.0.0"
            />
          </div>
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.portTip")}>{t("gateway.port")}</InfoLabel>
            <Input
              type="number"
              value={draft.port ?? ""}
              onChange={(e) => update({ port: Number(e.target.value) })}
              placeholder="18790"
            />
          </div>
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.tokenTip")}>{t("gateway.token")}</InfoLabel>
            <Input
              type="password"
              value={draft.token ?? ""}
              disabled={isSecret(draft.token)}
              readOnly={isSecret(draft.token)}
              onChange={(e) => update({ token: e.target.value })}
            />
            {isSecret(draft.token) && (
              <p className="text-xs text-muted-foreground">{t("gateway.tokenManaged")}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.ownerIdsTip")}>{t("gateway.ownerIds")}</InfoLabel>
            <TagInput
              value={draft.owner_ids ?? []}
              onChange={(v) => update({ owner_ids: v })}
              placeholder={t("gateway.ownerIdsPlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.allowedOriginsTip")}>{t("gateway.allowedOrigins")}</InfoLabel>
            <TagInput
              value={draft.allowed_origins ?? []}
              onChange={(v) => update({ allowed_origins: v })}
              placeholder={t("gateway.allowedOriginsPlaceholder")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.maxMessageCharsTip")}>{t("gateway.maxMessageChars")}</InfoLabel>
            <Input
              type="number"
              value={draft.max_message_chars ?? ""}
              onChange={(e) => update({ max_message_chars: Number(e.target.value) })}
              placeholder="32000"
            />
          </div>
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.rateLimitRpmTip")}>{t("gateway.rateLimitRpm")}</InfoLabel>
            <Input
              type="number"
              value={draft.rate_limit_rpm ?? ""}
              onChange={(e) => update({ rate_limit_rpm: Number(e.target.value) })}
              placeholder="20 (0 = disabled)"
              min={0}
            />
          </div>
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.inboundDebounceMsTip")}>{t("gateway.inboundDebounceMs")}</InfoLabel>
            <Input
              type="number"
              value={draft.inbound_debounce_ms ?? ""}
              onChange={(e) => update({ inbound_debounce_ms: Number(e.target.value) })}
              placeholder="1000 (-1 = disabled)"
              min={-1}
            />
          </div>
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.injectionActionTip")}>{t("gateway.injectionAction")}</InfoLabel>
            <Select value={draft.injection_action ?? "warn"} onValueChange={(v) => update({ injection_action: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="log">Log</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="block">Block</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <InfoLabel tip={t("gateway.blockReplyTip")}>{t("gateway.blockReply")}</InfoLabel>
            <div className="flex items-center h-9">
              <Switch checked={draft.block_reply ?? false} onCheckedChange={(v) => update({ block_reply: v })} />
            </div>
          </div>
        </div>

        {dirty && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {saving ? t("saving") : t("save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
