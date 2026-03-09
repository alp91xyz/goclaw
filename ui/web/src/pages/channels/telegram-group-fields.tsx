import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupPolicyOptions } from "./channel-schemas";
import { ToolNameSelect } from "@/components/shared/tool-name-select";

export interface TelegramGroupConfigValues {
  group_policy?: string;
  require_mention?: boolean;
  enabled?: boolean;
  allow_from?: string[];
  skills?: string[];
  tools?: string[];
  system_prompt?: string;
}

const INHERIT = "__inherit__";

function triStateValue(val: boolean | undefined): string {
  if (val === undefined || val === null) return INHERIT;
  return val ? "true" : "false";
}

function parseTriState(val: string): boolean | undefined {
  if (val === INHERIT || val === "") return undefined;
  return val === "true";
}

interface Props {
  config: TelegramGroupConfigValues;
  onChange: (config: TelegramGroupConfigValues) => void;
  idPrefix: string;
}

export function TelegramGroupFields({ config, onChange, idPrefix }: Props) {
  const { t } = useTranslation("channels");

  const inheritLabel = t("groupOverrides.fields.inherit");
  const yesLabel = t("groupOverrides.fields.yes");
  const noLabel = t("groupOverrides.fields.no");

  const triStateOptions = [
    { value: INHERIT, label: inheritLabel },
    { value: "true", label: yesLabel },
    { value: "false", label: noLabel },
  ];

  const groupPolicyWithInherit = [
    { value: INHERIT, label: inheritLabel },
    ...groupPolicyOptions,
  ];

  const update = (patch: Partial<TelegramGroupConfigValues>) => {
    onChange({ ...config, ...patch });
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>{t("groupOverrides.fields.groupPolicy")}</Label>
        <Select
          value={config.group_policy || INHERIT}
          onValueChange={(v) => update({ group_policy: v === INHERIT ? undefined : v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupPolicyWithInherit.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label>{t("groupOverrides.fields.requireMention")}</Label>
        <Select
          value={triStateValue(config.require_mention)}
          onValueChange={(v) => update({ require_mention: parseTriState(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {triStateOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label>{t("groupOverrides.fields.enabled")}</Label>
        <Select
          value={triStateValue(config.enabled)}
          onValueChange={(v) => update({ enabled: parseTriState(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {triStateOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-allow`}>{t("groupOverrides.fields.allowedUsers")}</Label>
        <Textarea
          id={`${idPrefix}-allow`}
          value={config.allow_from?.join("\n") ?? ""}
          onChange={(e) => {
            const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
            update({ allow_from: lines.length > 0 ? lines : undefined });
          }}
          placeholder={t("groupOverrides.fields.allowedUsersPlaceholder")}
          rows={2}
          className="font-mono text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-skills`}>{t("groupOverrides.fields.skillsFilter")}</Label>
        <Textarea
          id={`${idPrefix}-skills`}
          value={config.skills?.join("\n") ?? ""}
          onChange={(e) => {
            const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
            update({ skills: lines.length > 0 ? lines : undefined });
          }}
          placeholder={t("groupOverrides.fields.skillsPlaceholder")}
          rows={2}
          className="font-mono text-sm"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>{t("groupOverrides.fields.toolAllow")}</Label>
        <ToolNameSelect
          value={config.tools ?? []}
          onChange={(v) => update({ tools: v.length > 0 ? v : undefined })}
          placeholder={t("groupOverrides.fields.toolAllowPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {t("groupOverrides.fields.toolAllowHint")}
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-prompt`}>{t("groupOverrides.fields.systemPrompt")}</Label>
        <Textarea
          id={`${idPrefix}-prompt`}
          value={config.system_prompt ?? ""}
          onChange={(e) => update({ system_prompt: e.target.value || undefined })}
          placeholder={t("groupOverrides.fields.systemPromptPlaceholder")}
          rows={3}
        />
      </div>
    </div>
  );
}
