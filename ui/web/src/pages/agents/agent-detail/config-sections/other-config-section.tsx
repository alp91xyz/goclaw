import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfigSection } from "./config-section";

interface OtherConfigSectionProps {
  enabled: boolean;
  value: string;
  onToggle: (v: boolean) => void;
  onChange: (v: string) => void;
}

export function OtherConfigSection({ enabled, value, onToggle, onChange }: OtherConfigSectionProps) {
  const { t } = useTranslation("agents");
  const s = "configSections.otherConfig";
  const [validJson, setValidJson] = useState(true);

  useEffect(() => {
    try {
      JSON.parse(value || "{}");
      setValidJson(true);
    } catch {
      setValidJson(false);
    }
  }, [value]);

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // can't format invalid JSON
    }
  };

  return (
    <ConfigSection
      title={t(`${s}.title`)}
      description={t(`${s}.description`)}
      enabled={enabled}
      onToggle={onToggle}
    >
      <Textarea
        className={`font-mono text-sm ${!validJson ? "border-destructive" : ""}`}
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='{ "key": "value" }'
      />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleFormat} disabled={!validJson} className="h-7 px-2 text-xs">
          {t(`${s}.formatJson`)}
        </Button>
        {!validJson && <span className="text-xs text-destructive">{t(`${s}.invalidJson`)}</span>}
      </div>
    </ConfigSection>
  );
}
