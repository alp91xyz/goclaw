import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Clock, Plus, Play, Trash2, History, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCron, type CronJob, type CronRunLogEntry } from "./hooks/use-cron";
import { CronFormDialog } from "./cron-form-dialog";
import { CronRunLogDialog } from "./cron-run-log-dialog";
import { CronDetailPage } from "./cron-detail-page";
import { useMinLoading } from "@/hooks/use-min-loading";
import { useDeferredLoading } from "@/hooks/use-deferred-loading";
import { usePagination } from "@/hooks/use-pagination";

function formatSchedule(job: CronJob): string {
  const s = job.schedule;
  if (s.kind === "every" && s.everyMs) {
    const sec = s.everyMs / 1000;
    if (sec < 60) return `every ${sec}s`;
    if (sec < 3600) return `every ${Math.round(sec / 60)}m`;
    return `every ${Math.round(sec / 3600)}h`;
  }
  if (s.kind === "cron" && s.expr) return s.expr;
  if (s.kind === "at" && s.atMs) return `once at ${new Date(s.atMs).toLocaleString()}`;
  return s.kind;
}

export function CronPage() {
  const { t } = useTranslation("cron");
  const { t: tc } = useTranslation("common");
  const { id: detailId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, loading, refreshing, refresh, createJob, toggleJob, deleteJob, runJob, getRunLog } = useCron();
  const spinning = useMinLoading(refreshing);
  const showSkeleton = useDeferredLoading(loading && jobs.length === 0);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CronJob | null>(null);
  const [runLogTarget, setRunLogTarget] = useState<CronJob | null>(null);
  const [runLogEntries, setRunLogEntries] = useState<CronRunLogEntry[]>([]);
  const [runLogLoading, setRunLogLoading] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<{ job: CronJob; enabled: boolean } | null>(null);

  const { pageItems, pagination, setPage, setPageSize } = usePagination(jobs);

  const detailJob = detailId ? jobs.find((j) => j.id === detailId) : null;
  if (detailJob) {
    return (
      <CronDetailPage
        job={detailJob}
        onBack={() => navigate("/cron")}
        onRun={runJob}
        onToggle={toggleJob}
        onDelete={async (id) => {
          await deleteJob(id);
          navigate("/cron");
        }}
        getRunLog={getRunLog}
        onRefresh={refresh}
      />
    );
  }

  const handleShowRunLog = async (job: CronJob) => {
    setRunLogTarget(job);
    setRunLogLoading(true);
    try {
      const { entries } = await getRunLog(job.id);
      setRunLogEntries(entries);
    } finally {
      setRunLogLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={spinning} className="gap-1">
              <RefreshCw className={"h-3.5 w-3.5" + (spinning ? " animate-spin" : "")} /> {tc("refresh")}
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> {t("newJob")}
            </Button>
          </div>
        }
      />

      <div className="mt-4">
        {showSkeleton ? (
          <TableSkeleton rows={5} />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> {t("newJob")}
              </Button>
            }
          />
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("columns.enabled")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.schedule")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.message")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.agent")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((job: CronJob) => (
                  <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Switch
                        checked={job.enabled}
                        onCheckedChange={(checked: boolean) => setToggleTarget({ job, enabled: checked })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-primary hover:underline"
                        onClick={() => navigate(`/cron/${job.id}`)}
                      >
                        {job.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{formatSchedule(job)}</Badge>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                      {job.payload?.message}
                    </td>
                    <td className="px-4 py-3">
                      {job.agentId ? (
                        <Badge variant="secondary">{job.agentId}</Badge>
                      ) : (
                        <span className="text-muted-foreground">{t("defaultAgent")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={job.state?.lastStatus === "running" ? t("running") : t("runNow")}
                          disabled={job.state?.lastStatus === "running"}
                          onClick={() => runJob(job.id)}
                        >
                          {job.state?.lastStatus === "running"
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("runHistory")}
                          onClick={() => handleShowRunLog(job)}
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("delete.confirmLabel")}
                          onClick={() => setDeleteTarget(job)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      <CronFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={createJob}
      />

      {toggleTarget && (
        <ConfirmDialog
          open
          onOpenChange={() => setToggleTarget(null)}
          title={toggleTarget.enabled ? t("enable.title") : t("disable.title")}
          description={
            toggleTarget.enabled
              ? t("enable.description", { name: toggleTarget.job.name })
              : t("disable.description", { name: toggleTarget.job.name })
          }
          confirmLabel={toggleTarget.enabled ? t("enable.confirmLabel") : t("disable.confirmLabel")}
          variant={toggleTarget.enabled ? "default" : "destructive"}
          onConfirm={async () => {
            await toggleJob(toggleTarget.job.id, toggleTarget.enabled);
            setToggleTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={() => setDeleteTarget(null)}
          title={t("delete.title")}
          description={t("delete.description", { name: deleteTarget.name })}
          confirmLabel={t("delete.confirmLabel")}
          variant="destructive"
          onConfirm={async () => {
            await deleteJob(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}

      {runLogTarget && (
        <CronRunLogDialog
          open
          onOpenChange={() => setRunLogTarget(null)}
          jobName={runLogTarget.name}
          entries={runLogEntries}
          loading={runLogLoading}
        />
      )}
    </div>
  );
}
