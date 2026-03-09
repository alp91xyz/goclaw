import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { TelegramGroupFields, type TelegramGroupConfigValues } from "./telegram-group-fields";
import { TelegramTopicOverrides, type TelegramTopicConfigValues } from "./telegram-topic-overrides";

interface GroupConfigWithTopics extends TelegramGroupConfigValues {
  topics?: Record<string, TelegramTopicConfigValues>;
}

interface Props {
  groups: Record<string, GroupConfigWithTopics>;
  onChange: (groups: Record<string, GroupConfigWithTopics>) => void;
}

export function TelegramGroupOverrides({ groups, onChange }: Props) {
  const { t } = useTranslation("channels");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newGroupId, setNewGroupId] = useState("");

  const groupIds = Object.keys(groups);

  const addGroup = () => {
    const id = newGroupId.trim();
    if (!id || groups[id]) return;
    onChange({ ...groups, [id]: {} });
    setExpanded((prev) => ({ ...prev, [id]: true }));
    setNewGroupId("");
  };

  const removeGroup = (id: string) => {
    const next = { ...groups };
    delete next[id];
    onChange(next);
  };

  const updateGroup = (id: string, config: GroupConfigWithTopics) => {
    onChange({ ...groups, [id]: config });
  };

  const updateTopics = (groupId: string, topics: Record<string, TelegramTopicConfigValues>) => {
    const group = groups[groupId] ?? {};
    const hasTopics = Object.keys(topics).length > 0;
    onChange({
      ...groups,
      [groupId]: { ...group, topics: hasTopics ? topics : undefined },
    });
  };

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <fieldset className="rounded-md border p-3 space-y-3">
      <legend className="px-1 text-sm font-medium">{t("groupOverrides.title")}</legend>
      <p className="text-xs text-muted-foreground">{t("groupOverrides.hint")}</p>

      {groupIds.map((id) => {
        const group = groups[id] ?? {};
        return (
          <div key={id} className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium hover:underline"
                onClick={() => toggle(id)}
              >
                {expanded[id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {id === "*"
                  ? t("groupOverrides.groupWildcard")
                  : t("groupOverrides.groupLabel", { id })}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeGroup(id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {expanded[id] && (
              <div className="space-y-4">
                <TelegramGroupFields
                  config={group}
                  onChange={(cfg) => updateGroup(id, { ...cfg, topics: group.topics })}
                  idPrefix={`grp-${id}`}
                />

                <TelegramTopicOverrides
                  topics={group.topics ?? {}}
                  onChange={(topics) => updateTopics(id, topics)}
                />
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <Input
          value={newGroupId}
          onChange={(e) => setNewGroupId(e.target.value)}
          placeholder={t("groupOverrides.addGroupPlaceholder")}
          className="h-8 flex-1 text-sm"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGroup())}
        />
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={addGroup} disabled={!newGroupId.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t("groupOverrides.addGroup")}
        </Button>
      </div>
    </fieldset>
  );
}
