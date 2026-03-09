import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoLabel } from "./config-section";

const THINKING_LEVEL_KEYS = ["off", "low", "medium", "high"] as const;

interface ThinkingSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export function ThinkingSection({ value, onChange }: ThinkingSectionProps) {
  const { t } = useTranslation("agents");
  const s = "configSections.thinking";

  const levels = THINKING_LEVEL_KEYS.map((key) => ({
    value: key,
    label: t(`${s}.${key}`),
    description: t(`${s}.${key}Desc`),
  }));

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{t(`${s}.title`)}</h3>
        <p className="text-xs text-muted-foreground">
          {t(`${s}.description`)}
        </p>
      </div>
      <div className="space-y-2">
        <InfoLabel tip="Thinking level controls the token budget for reasoning. Anthropic uses budget_tokens, OpenAI uses reasoning_effort, DashScope uses thinking_budget. Token budgets vary by provider.">
          {t(`${s}.thinkingLevel`)}
        </InfoLabel>
        <Select value={value || "off"} onValueChange={onChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <span>{level.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {level.description}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
