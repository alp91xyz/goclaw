import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Plus, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { useDeferredLoading } from "@/hooks/use-deferred-loading";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAgents } from "./hooks/use-agents";
import { AgentCard } from "./agent-card";
import { AgentCreateDialog } from "./agent-create-dialog";
import { AgentDetailPage } from "./agent-detail/agent-detail-page";
import { SummoningModal } from "./summoning-modal";
import { usePagination } from "@/hooks/use-pagination";

export function AgentsPage() {
  const { t } = useTranslation("agents");
  const { id: detailId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agents, loading, createAgent, deleteAgent, refresh, resummonAgent } = useAgents();
  const showSkeleton = useDeferredLoading(loading && agents.length === 0);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [summoningAgent, setSummoningAgent] = useState<{ id: string; name: string } | null>(null);

  const handleResummon = async (agent: { id: string; display_name?: string; agent_key: string }) => {
    try {
      await resummonAgent(agent.id);
      setSummoningAgent({ id: agent.id, name: agent.display_name || agent.agent_key });
    } catch {
      // error handled by hook
    }
  };

  // Show detail view if route has :id
  if (detailId) {
    return (
      <AgentDetailPage
        agentId={detailId}
        onBack={() => navigate("/agents")}
      />
    );
  }

  const filtered = agents.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.agent_key.toLowerCase().includes(q) ||
      (a.display_name ?? "").toLowerCase().includes(q)
    );
  });

  const { pageItems, pagination, setPage, setPageSize, resetPage } = usePagination(filtered);

  useEffect(() => { resetPage(); }, [search, resetPage]);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> {t("createAgent")}
          </Button>
        }
      />

      <div className="mt-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
          className="max-w-sm"
        />
      </div>

      <div className="mt-6">
        {showSkeleton ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={search ? t("noMatchTitle") : t("emptyTitle")}
            description={
              search
                ? t("noMatchDescription")
                : t("emptyDescription")
            }
          />
        ) : (
          <>
            <TooltipProvider>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onClick={() => {
                      if (agent.status === "summoning") {
                        setSummoningAgent({
                          id: agent.id,
                          name: agent.display_name || agent.agent_key,
                        });
                      } else {
                        navigate(`/agents/${agent.id}`);
                      }
                    }}
                    onResummon={() => handleResummon(agent)}
                    onDelete={() => setDeleteTarget(agent.id)}
                  />
                ))}
              </div>
            </TooltipProvider>
            <div className="mt-4">
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </div>

      <AgentCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (data) => {
          const created = await createAgent(data);
          refresh();
          // Auto-show summoning modal if agent is being summoned
          if (created && typeof created === "object" && "status" in created && created.status === "summoning") {
            const ag = created as { id: string; display_name?: string; agent_key: string };
            setSummoningAgent({ id: ag.id, name: ag.display_name || ag.agent_key });
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={t("delete.title")}
        description={t("delete.description")}
        confirmLabel={t("delete.confirmLabel")}
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteAgent(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />

      {summoningAgent && (
        <SummoningModal
          open={!!summoningAgent}
          onOpenChange={(open) => { if (!open) setSummoningAgent(null); }}
          agentId={summoningAgent.id}
          agentName={summoningAgent.name}
          onCompleted={refresh}
          onResummon={resummonAgent}
        />
      )}
    </div>
  );
}
