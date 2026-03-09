import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Inbox, RefreshCw, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { formatDate } from "@/lib/format";
import { useMinLoading } from "@/hooks/use-min-loading";
import { useDeferredLoading } from "@/hooks/use-deferred-loading";
import { usePendingMessages } from "./hooks/use-pending-messages";
import { MessageListDialog } from "./message-list-dialog";
import type { PendingMessageGroup } from "./types";

export function PendingMessagesPage() {
  const { t } = useTranslation("pending-messages");
  const { t: tc } = useTranslation("common");
  const {
    groups,
    messages,
    loading,
    messagesLoading,
    loadGroups,
    loadMessages,
    compactGroup,
    clearGroup,
  } = usePendingMessages();

  const spinning = useMinLoading(loading);
  const showSkeleton = useDeferredLoading(loading && groups.length === 0);
  const [selectedGroup, setSelectedGroup] = useState<PendingMessageGroup | null>(null);
  const [confirmClear, setConfirmClear] = useState<PendingMessageGroup | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleRefresh = () => loadGroups();

  const handleCompact = async (e: React.MouseEvent, group: PendingMessageGroup) => {
    e.stopPropagation();
    const key = `${group.channel_name}/${group.history_key}`;
    setActionLoading(key);
    await compactGroup(group.channel_name, group.history_key);
    setActionLoading(null);
    loadGroups();
  };

  const handleClear = async (group: PendingMessageGroup) => {
    setConfirmClear(null);
    const key = `${group.channel_name}/${group.history_key}`;
    setActionLoading(key);
    await clearGroup(group.channel_name, group.history_key);
    setActionLoading(null);
    loadGroups();
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={spinning} className="gap-1">
            <RefreshCw className={"h-3.5 w-3.5" + (spinning ? " animate-spin" : "")} /> {tc("refresh")}
          </Button>
        }
      />

      <div className="mt-4">
        {showSkeleton ? (
          <TableSkeleton rows={6} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("columns.channel")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.group")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.messages")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.lastActivity")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const rowKey = `${g.channel_name}/${g.history_key}`;
                  const busy = actionLoading === rowKey;
                  return (
                    <tr
                      key={rowKey}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                      onClick={() => setSelectedGroup(g)}
                    >
                      <td className="px-4 py-3 font-medium">{g.channel_name}</td>
                      <td className="max-w-[200px] truncate px-4 py-3">
                        {g.group_title ? (
                          <span className="font-medium">{g.group_title}</span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">{g.history_key}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{g.message_count}</td>
                      <td className="px-4 py-3">
                        {g.has_summary ? (
                          <Badge variant="success" className="text-xs">{t("status.compacted")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{t("status.raw")}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(g.last_activity)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={busy || g.has_summary}
                            onClick={(e) => handleCompact(e, g)}
                          >
                            <Archive className="h-3 w-3" /> {t("compact")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                            disabled={busy}
                            onClick={(e) => { e.stopPropagation(); setConfirmClear(g); }}
                          >
                            <Trash2 className="h-3 w-3" /> {t("clear")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedGroup && (
        <MessageListDialog
          group={selectedGroup}
          messages={messages}
          loading={messagesLoading}
          onClose={() => setSelectedGroup(null)}
          onLoad={loadMessages}
        />
      )}

      {confirmClear && (
        <ConfirmClearDialog
          group={confirmClear}
          onConfirm={() => handleClear(confirmClear)}
          onCancel={() => setConfirmClear(null)}
        />
      )}
    </div>
  );
}

function ConfirmClearDialog({
  group,
  onConfirm,
  onCancel,
}: {
  group: PendingMessageGroup;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("pending-messages");
  const { t: tc } = useTranslation("common");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="mb-2 font-semibold">{t("confirmClear.title")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("confirmClear.description", { channel: group.channel_name, key: group.history_key })}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>{tc("cancel")}</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>{t("confirmClear.confirm")}</Button>
        </div>
      </div>
    </div>
  );
}
