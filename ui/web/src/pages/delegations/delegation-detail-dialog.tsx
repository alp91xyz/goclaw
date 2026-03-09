import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/lib/format";
import { TraceDetailDialog } from "@/pages/traces/trace-detail-dialog";
import type { DelegationHistoryRecord } from "@/types/delegation";
import type { TraceData, SpanData } from "@/types/trace";

interface DelegationDetailDialogProps {
  delegationId: string;
  onClose: () => void;
  getDelegation: (id: string) => Promise<DelegationHistoryRecord | null>;
  getTrace: (traceId: string) => Promise<{ trace: TraceData; spans: SpanData[] } | null>;
}

export function DelegationDetailDialog({ delegationId, onClose, getDelegation, getTrace }: DelegationDetailDialogProps) {
  const { t } = useTranslation("delegations");
  const [record, setRecord] = useState<DelegationHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingTraceId, setViewingTraceId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDelegation(delegationId)
      .then((r) => setRecord(r))
      .finally(() => setLoading(false));
  }, [delegationId, getDelegation]);

  const statusVariant =
    record?.status === "completed"
      ? "success"
      : record?.status === "failed"
        ? "destructive"
        : record?.status === "running" || record?.status === "pending"
          ? "info"
          : "secondary";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
        </DialogHeader>

        {loading && !record ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : !record ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("detail.notFound")}</p>
        ) : (
          <div className="space-y-4">
            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">{t("detail.source")}</span>{" "}
                <span className="font-medium">{record.source_agent_key || record.source_agent_id.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.target")}</span>{" "}
                <span className="font-medium">{record.target_agent_key || record.target_agent_id.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.status")}</span>{" "}
                <Badge variant={statusVariant} className="text-xs">{record.status}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.mode")}</span>{" "}
                <Badge variant="outline" className="text-xs">{record.mode}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.duration")}</span>{" "}
                {formatDuration(record.duration_ms)}
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.iterations")}</span>{" "}
                {record.iterations}
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.created")}</span>{" "}
                {formatDate(record.created_at)}
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.completed")}</span>{" "}
                {record.completed_at ? formatDate(record.completed_at) : "—"}
              </div>
            </div>

            {record.trace_id && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t("detail.trace")}</span>{" "}
                <button
                  type="button"
                  onClick={() => setViewingTraceId(record.trace_id!)}
                  className="cursor-pointer font-mono text-xs text-primary hover:underline"
                >
                  {record.trace_id.slice(0, 12)}...
                </button>
              </div>
            )}

            {/* Task */}
            <div className="rounded-md border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("detail.task")}</p>
              <pre className="whitespace-pre-wrap break-words text-sm">{record.task}</pre>
            </div>

            {/* Result */}
            {record.result && (
              <div className="rounded-md border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t("detail.result")}</p>
                <pre className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-sm">
                  {record.result}
                </pre>
              </div>
            )}

            {/* Error */}
            {record.error && (
              <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t("detail.error")}</p>
                <p className="break-all text-sm text-red-300">{record.error}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {viewingTraceId && (
        <TraceDetailDialog
          traceId={viewingTraceId}
          onClose={() => setViewingTraceId(null)}
          getTrace={getTrace}
          onNavigateTrace={setViewingTraceId}
        />
      )}
    </Dialog>
  );
}
