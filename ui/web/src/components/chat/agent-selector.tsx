import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bot, ChevronDown } from "lucide-react";
import { useHttp } from "@/hooks/use-ws";
import { useAuthStore } from "@/stores/use-auth-store";
import type { AgentData } from "@/types/agent";

interface AgentSelectorProps {
  value: string;
  onChange: (agentId: string) => void;
}

export function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const { t } = useTranslation("common");
  const http = useHttp();
  const connected = useAuthStore((s) => s.connected);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!connected) return;
    http
      .get<{ agents: AgentData[] }>("/v1/agents")
      .then((res) => {
        const active = (res.agents ?? []).filter((a) => a.status === "active");
        setAgents(active);
      })
      .catch(() => {});
  }, [http, connected]);

  const selected = agents.find((a) => a.agent_key === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-accent"
      >
        <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left">
          {selected?.display_name ?? selected?.agent_key ?? (value || t("selectAgent"))}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover p-1 shadow-md">
            {agents.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t("noAgentsAvailable")}
              </div>
            )}
            {agents.map((agent) => (
              <button
                key={agent.agent_key}
                type="button"
                onClick={() => {
                  onChange(agent.agent_key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent ${
                  agent.agent_key === value ? "bg-accent" : ""
                }`}
              >
                <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-left">
                  {agent.display_name || agent.agent_key}
                </span>
                {agent.is_default && (
                  <span className="text-xs text-muted-foreground">{t("default")}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
