import { useState, useEffect } from "react";
import { Save, Check, AlertCircle, Users, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAgentInstances, type UserInstance } from "../hooks/use-agent-instances";

interface AgentInstancesTabProps {
  agentId: string;
}

export function AgentInstancesTab({ agentId }: AgentInstancesTabProps) {
  const { t } = useTranslation("agents");
  const { instances, loading, saving, getFiles, setFile } = useAgentInstances(agentId);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingFiles(true);
    setError(null);
    getFiles(selected).then((files) => {
      if (cancelled) return;
      const userFile = files.find((f) => f.file_name === "USER.md");
      const c = userFile?.content ?? "";
      setContent(c);
      setOriginalContent(c);
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : t("instances.loading"));
    }).finally(() => {
      if (!cancelled) setLoadingFiles(false);
    });
    return () => { cancelled = true; };
  }, [selected, getFiles, t]);

  const handleSave = async () => {
    if (!selected) return;
    setError(null);
    setSaved(false);
    try {
      await setFile(selected, "USER.md", content);
      setOriginalContent(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("instances.saving"));
    }
  };

  const isDirty = content !== originalContent;

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("instances.loadingInstances")}</div>;
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Users className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("instances.noInstances")}</p>
        <p className="text-xs text-muted-foreground/70">{t("instances.noInstancesDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4" style={{ minHeight: 400 }}>
      {/* Instance list */}
      <div className="w-64 shrink-0 space-y-1 overflow-y-auto rounded-md border p-2">
        <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">
          {instances.length} instance{instances.length !== 1 ? "s" : ""}
        </div>
        {instances.map((inst) => (
          <InstanceRow
            key={inst.user_id}
            instance={inst}
            isSelected={selected === inst.user_id}
            onClick={() => setSelected(inst.user_id)}
          />
        ))}
      </div>

      {/* Editor */}
      <div className="flex flex-1 flex-col gap-3">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t("instances.selectInstance")}
          </div>
        ) : loadingFiles ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t("instances.loading")}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">USER.md</span>
              <span className="text-xs text-muted-foreground">— {selected}</span>
            </div>
            <Textarea
              className="flex-1 font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="(empty)"
              style={{ minHeight: 300 }}
            />
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-success">
                  <Check className="h-3.5 w-3.5" /> {t("instances.saved")}
                </span>
              )}
              <Button onClick={handleSave} disabled={saving || !isDirty} size="sm">
                {!saving && <Save className="h-4 w-4" />}
                {saving ? t("instances.saving") : t("instances.save")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InstanceRow({ instance, isSelected, onClick }: { instance: UserInstance; isSelected: boolean; onClick: () => void }) {
  const lastSeen = instance.last_seen_at ? formatRelative(instance.last_seen_at) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      }`}
    >
      <span className="truncate text-xs font-medium">
        {instance.metadata?.display_name || instance.metadata?.chat_title || instance.user_id}
      </span>
      {(instance.metadata?.display_name || instance.metadata?.chat_title) && (
        <span className="truncate font-mono text-[10px] text-muted-foreground">{instance.user_id}</span>
      )}
      <div className="flex items-center gap-2">
        {instance.file_count > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {instance.file_count} file{instance.file_count !== 1 ? "s" : ""}
          </Badge>
        )}
        {lastSeen && (
          <span className="text-[10px] text-muted-foreground">{lastSeen}</span>
        )}
      </div>
    </button>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}
