import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldDef } from "./channel-schemas";

interface ChannelFieldsProps {
  fields: FieldDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  idPrefix: string;
  isEdit?: boolean; // for credentials: show "leave blank to keep" hint
}

export function ChannelFields({ fields, values, onChange, idPrefix, isEdit }: ChannelFieldsProps) {
  return (
    <div className="grid gap-3">
      {fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(v) => onChange(field.key, v)}
          id={`${idPrefix}-${field.key}`}
          isEdit={isEdit}
        />
      ))}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
  id,
  isEdit,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  id: string;
  isEdit?: boolean;
}) {
  const { t } = useTranslation("channels");
  const labelSuffix = field.required && !isEdit ? " *" : "";
  const editHint = isEdit && field.type === "password" ? ` ${t("form.credentialsHint")}` : "";

  switch (field.type) {
    case "text":
    case "password":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={id}>
            {field.label}{labelSuffix}{editHint}
          </Label>
          <Input
            id={id}
            type={field.type}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
      );

    case "number":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={id}>{field.label}{labelSuffix}</Label>
          <Input
            id={id}
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.defaultValue !== undefined ? String(field.defaultValue) : undefined}
          />
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            id={id}
            checked={(value as boolean) ?? (field.defaultValue as boolean) ?? false}
            onCheckedChange={(v) => onChange(v)}
          />
          <Label htmlFor={id}>{field.label}</Label>
          {field.help && <span className="text-xs text-muted-foreground ml-1">— {field.help}</span>}
        </div>
      );

    case "select":
      return (
        <div className="grid gap-1.5">
          <Label>{field.label}{labelSuffix}</Label>
          <Select
            value={(value as string) ?? (field.defaultValue as string) ?? ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
      );

    case "tags":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={id}>{field.label}</Label>
          <Textarea
            id={id}
            value={Array.isArray(value) ? (value as string[]).join("\n") : ""}
            onChange={(e) => {
              const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
              onChange(lines.length > 0 ? lines : undefined);
            }}
            placeholder={t("groupOverrides.fields.allowedUsersPlaceholder")}
            rows={3}
            className="font-mono text-sm"
          />
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
      );

    default:
      return null;
  }
}
