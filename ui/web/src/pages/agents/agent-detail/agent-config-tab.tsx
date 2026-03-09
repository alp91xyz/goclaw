import { useState } from "react";
import { Save, Check, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  AgentData,
  SubagentsConfig,
  ToolPolicyConfig,
  CompactionConfig,
  ContextPruningConfig,
  SandboxConfig,
  MemoryConfig,
  QualityGateConfig,
} from "@/types/agent";
import {
  SubagentsSection,
  ToolPolicySection,
  CompactionSection,
  ContextPruningSection,
  SandboxSection,
  MemorySection,
  OtherConfigSection,
  QualityGatesSection,
  ThinkingSection,
} from "./config-sections";

interface AgentConfigTabProps {
  agent: AgentData;
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
}

export function AgentConfigTab({ agent, onUpdate }: AgentConfigTabProps) {
  const { t } = useTranslation("agents");

  const [subEnabled, setSubEnabled] = useState(agent.subagents_config != null);
  const [sub, setSub] = useState<SubagentsConfig>(agent.subagents_config ?? {});

  const [toolsEnabled, setToolsEnabled] = useState(agent.tools_config != null);
  const [tools, setTools] = useState<ToolPolicyConfig>(agent.tools_config ?? {});

  const [compEnabled, setCompEnabled] = useState(agent.compaction_config != null);
  const [comp, setComp] = useState<CompactionConfig>(agent.compaction_config ?? {});

  const [pruneEnabled, setPruneEnabled] = useState(agent.context_pruning != null);
  const [prune, setPrune] = useState<ContextPruningConfig>(agent.context_pruning ?? {});

  const [sbEnabled, setSbEnabled] = useState(agent.sandbox_config != null);
  const [sb, setSb] = useState<SandboxConfig>(agent.sandbox_config ?? {});

  const [memEnabled, setMemEnabled] = useState(agent.memory_config != null);
  const [mem, setMem] = useState<MemoryConfig>(agent.memory_config ?? {});

  const otherObj = (agent.other_config ?? {}) as Record<string, unknown>;
  const initialGates = (Array.isArray(otherObj.quality_gates) ? otherObj.quality_gates : []) as QualityGateConfig[];
  const initialThinkingLevel = (typeof otherObj.thinking_level === "string" ? otherObj.thinking_level : "off");
  const { quality_gates: _qg, thinking_level: _tl, ...otherWithoutManaged } = otherObj;

  const [qgEnabled, setQgEnabled] = useState(initialGates.length > 0);
  const [qualityGates, setQualityGates] = useState<QualityGateConfig[]>(initialGates);

  const [thinkingLevel, setThinkingLevel] = useState(initialThinkingLevel);

  const [otherEnabled, setOtherEnabled] = useState(
    agent.other_config != null && Object.keys(otherWithoutManaged).length > 0,
  );
  const [otherJson, setOtherJson] = useState(
    Object.keys(otherWithoutManaged).length > 0 ? JSON.stringify(otherWithoutManaged, null, 2) : "{}",
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updates: Record<string, unknown> = {
        subagents_config: subEnabled ? sub : null,
        tools_config: toolsEnabled ? tools : {},
        compaction_config: compEnabled ? comp : null,
        context_pruning: pruneEnabled ? prune : null,
        sandbox_config: sbEnabled ? sb : null,
        memory_config: memEnabled ? mem : null,
      };
      let otherBase: Record<string, unknown> = {};
      if (otherEnabled) {
        try { otherBase = JSON.parse(otherJson); } catch { /* keep empty */ }
      }
      if (qgEnabled && qualityGates.length > 0) {
        otherBase.quality_gates = qualityGates;
      }
      if (thinkingLevel && thinkingLevel !== "off") {
        otherBase.thinking_level = thinkingLevel;
      }
      updates.other_config = Object.keys(otherBase).length > 0 ? otherBase : {};
      await onUpdate(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("config.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <SubagentsSection
        enabled={subEnabled}
        value={sub}
        onToggle={(v: boolean) => { setSubEnabled(v); if (!v) setSub({}); }}
        onChange={setSub}
      />
      <Separator />
      <ToolPolicySection
        enabled={toolsEnabled}
        value={tools}
        onToggle={(v: boolean) => { setToolsEnabled(v); if (!v) setTools({}); }}
        onChange={setTools}
      />
      <Separator />
      <CompactionSection
        enabled={compEnabled}
        value={comp}
        onToggle={(v: boolean) => { setCompEnabled(v); if (!v) setComp({}); }}
        onChange={setComp}
      />
      <Separator />
      <ContextPruningSection
        enabled={pruneEnabled}
        value={prune}
        onToggle={(v: boolean) => { setPruneEnabled(v); if (!v) setPrune({}); }}
        onChange={setPrune}
      />
      <Separator />
      <SandboxSection
        enabled={sbEnabled}
        value={sb}
        onToggle={(v: boolean) => { setSbEnabled(v); if (!v) setSb({}); }}
        onChange={setSb}
      />
      <Separator />
      <MemorySection
        enabled={memEnabled}
        value={mem}
        onToggle={(v: boolean) => { setMemEnabled(v); if (!v) setMem({}); }}
        onChange={setMem}
      />
      <Separator />
      <ThinkingSection
        value={thinkingLevel}
        onChange={setThinkingLevel}
      />
      <Separator />
      <QualityGatesSection
        enabled={qgEnabled}
        value={qualityGates}
        onToggle={(v: boolean) => { setQgEnabled(v); if (!v) setQualityGates([]); }}
        onChange={setQualityGates}
      />
      <Separator />
      <OtherConfigSection
        enabled={otherEnabled}
        value={otherJson}
        onToggle={(v: boolean) => { setOtherEnabled(v); if (!v) setOtherJson("{}"); }}
        onChange={setOtherJson}
      />

      {saveError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveError}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-2">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="h-3.5 w-3.5" /> {t("config.saved")}
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {!saving && <Save className="h-4 w-4" />}
          {saving ? t("config.saving") : t("config.saveConfig")}
        </Button>
      </div>
    </div>
  );
}
