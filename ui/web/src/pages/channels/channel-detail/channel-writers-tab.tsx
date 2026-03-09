import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, RefreshCw, Users, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import type { GroupWriterGroupInfo, GroupFileWriterData } from "../hooks/use-channel-detail";

interface ChannelWritersTabProps {
  listWriterGroups: () => Promise<GroupWriterGroupInfo[]>;
  listWriters: (groupId: string) => Promise<GroupFileWriterData[]>;
  addWriter: (groupId: string, userId: string, displayName?: string, username?: string) => Promise<void>;
  removeWriter: (groupId: string, userId: string) => Promise<void>;
}

/** Strips the "group:<channel>:" prefix for display, e.g. "group:telegram:-100123" → "-100123" */
function shortGroupId(id: string): string {
  const m = id.match(/^group:[^:]+:(.+)$/);
  return m?.[1] ?? id;
}

export function ChannelWritersTab({
  listWriterGroups,
  listWriters,
  addWriter,
  removeWriter,
}: ChannelWritersTabProps) {
  const { t } = useTranslation("channels");
  const [groups, setGroups] = useState<GroupWriterGroupInfo[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  // Per-group expanded state & cached writers
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [writersMap, setWritersMap] = useState<Record<string, GroupFileWriterData[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Add writer form
  const [addGroupId, setAddGroupId] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const refreshGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const g = await listWriterGroups();
      setGroups(g);
    } catch {
      // handled by http hook
    } finally {
      setLoadingGroups(false);
    }
  }, [listWriterGroups]);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  const loadWritersForGroup = useCallback(
    async (groupId: string) => {
      setLoadingMap((prev) => ({ ...prev, [groupId]: true }));
      try {
        const w = await listWriters(groupId);
        setWritersMap((prev) => ({ ...prev, [groupId]: w }));
      } catch {
        setWritersMap((prev) => ({ ...prev, [groupId]: [] }));
      } finally {
        setLoadingMap((prev) => ({ ...prev, [groupId]: false }));
      }
    },
    [listWriters],
  );

  const toggleGroup = (groupId: string) => {
    const isExpanding = !expanded[groupId];
    setExpanded((prev) => ({ ...prev, [groupId]: isExpanding }));
    if (isExpanding && !writersMap[groupId]) {
      loadWritersForGroup(groupId);
    }
  };

  const handleRemoveWriter = async (groupId: string, userId: string) => {
    try {
      await removeWriter(groupId, userId);
      setWritersMap((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] ?? []).filter((w) => w.user_id !== userId),
      }));
      await refreshGroups();
    } catch {
      // handled by http hook
    }
  };

  const handleAddWriter = async (targetGroupId?: string) => {
    const gid = targetGroupId || addGroupId.trim();
    const uid = addUserId.trim();
    if (!gid || !uid) {
      setError(t("detail.writers.addForm.errors.groupUserRequired"));
      return;
    }
    setAdding(true);
    setError("");
    try {
      await addWriter(gid, uid, addDisplayName.trim(), addUsername.trim());
      setAddUserId("");
      setAddDisplayName("");
      setAddUsername("");
      if (!targetGroupId) setAddGroupId("");
      // Reload writers for this group if it's expanded
      if (expanded[gid] || targetGroupId) {
        await loadWritersForGroup(gid);
      }
      await refreshGroups();
      // Auto-expand the group we just added to
      if (!expanded[gid]) {
        setExpanded((prev) => ({ ...prev, [gid]: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("detail.writers.addForm.errors.failedAdd"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("detail.writers.description")}
      </p>

      {/* Groups accordion */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {t("detail.writers.groups")}
            {groups.length > 0 && (
              <span className="ml-1.5 text-muted-foreground font-normal">({groups.length})</span>
            )}
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refreshGroups} disabled={loadingGroups}>
            <RefreshCw className={"h-3.5 w-3.5" + (loadingGroups ? " animate-spin" : "")} />
          </Button>
        </div>

        {groups.length === 0 && !loadingGroups ? (
          <EmptyState
            icon={Users}
            title={t("detail.writers.noWriterGroups")}
            description={t("detail.writers.noWriterGroupsHint")}
          />
        ) : (
          <div className="rounded-md border divide-y">
            {groups.map((g) => {
              const isOpen = expanded[g.group_id];
              const groupWriters = writersMap[g.group_id] ?? [];
              const isLoading = loadingMap[g.group_id];

              return (
                <div key={g.group_id}>
                  {/* Group header row */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => toggleGroup(g.group_id)}
                  >
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-sm">{shortGroupId(g.group_id)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{g.group_id}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                      {g.writer_count === 1
                        ? t("detail.writers.writersCount", { count: g.writer_count })
                        : t("detail.writers.writersCountPlural", { count: g.writer_count })}
                    </span>
                  </button>

                  {/* Expanded: writers list */}
                  {isOpen && (
                    <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
                      {isLoading ? (
                        <p className="text-sm text-muted-foreground py-2">{t("detail.writers.loadingWriters")}</p>
                      ) : groupWriters.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">{t("detail.writers.noWriters")}</p>
                      ) : (
                        <div className="rounded-md border bg-background">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("detail.writers.columns.userId")}</th>
                                <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("detail.writers.columns.name")}</th>
                                <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">{t("detail.writers.columns.username")}</th>
                                <th className="px-3 py-2 w-10" />
                              </tr>
                            </thead>
                            <tbody>
                              {groupWriters.map((w) => (
                                <tr key={w.user_id} className="border-b last:border-0 hover:bg-muted/20">
                                  <td className="px-3 py-2 font-mono text-xs">{w.user_id}</td>
                                  <td className="px-3 py-2">{w.display_name || <span className="text-muted-foreground">-</span>}</td>
                                  <td className="px-3 py-2">{w.username ? <span className="text-muted-foreground">@{w.username}</span> : <span className="text-muted-foreground">-</span>}</td>
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleRemoveWriter(g.group_id, w.user_id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Inline add form for this group */}
                      <div className="flex items-end gap-2">
                        <div className="grid gap-1 flex-1">
                          <Label className="text-xs text-muted-foreground">{t("detail.writers.addForm.userId")}</Label>
                          <Input
                            value={addUserId}
                            onChange={(e) => setAddUserId(e.target.value)}
                            placeholder={t("detail.writers.addForm.userIdPlaceholder")}
                            className="h-8 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddWriter(g.group_id))}
                          />
                        </div>
                        <div className="grid gap-1 flex-1">
                          <Label className="text-xs text-muted-foreground">{t("detail.writers.addForm.displayName")}</Label>
                          <Input
                            value={addDisplayName}
                            onChange={(e) => setAddDisplayName(e.target.value)}
                            placeholder={t("detail.writers.addForm.optional")}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid gap-1 flex-1">
                          <Label className="text-xs text-muted-foreground">{t("detail.writers.addForm.username")}</Label>
                          <Input
                            value={addUsername}
                            onChange={(e) => setAddUsername(e.target.value)}
                            placeholder={t("detail.writers.addForm.optional")}
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-8 gap-1 shrink-0"
                          onClick={() => handleAddWriter(g.group_id)}
                          disabled={adding || !addUserId.trim()}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t("detail.writers.addForm.add")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add to new group */}
      <fieldset className="rounded-md border p-4 space-y-3">
        <legend className="px-1 text-sm font-medium">{t("detail.writers.addForm.title")}</legend>
        <p className="text-xs text-muted-foreground">{t("detail.writers.addForm.hint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="aw-group" className="text-xs">{t("detail.writers.addForm.groupId")}</Label>
            <Input
              id="aw-group"
              value={addGroupId}
              onChange={(e) => setAddGroupId(e.target.value)}
              placeholder={t("detail.writers.addForm.groupIdPlaceholder")}
              className="text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="aw-user" className="text-xs">{t("detail.writers.addForm.userId")}</Label>
            <Input
              id="aw-user"
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              placeholder={t("detail.writers.addForm.userIdPlaceholder")}
              className="text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="aw-display" className="text-xs">{t("detail.writers.addForm.displayName")}</Label>
            <Input
              id="aw-display"
              value={addDisplayName}
              onChange={(e) => setAddDisplayName(e.target.value)}
              placeholder={t("detail.writers.addForm.optional")}
              className="text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="aw-username" className="text-xs">{t("detail.writers.addForm.username")}</Label>
            <Input
              id="aw-username"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              placeholder={t("detail.writers.addForm.usernameWithout")}
              className="text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button
            onClick={() => handleAddWriter()}
            disabled={adding || !addGroupId.trim() || !addUserId.trim()}
            size="sm"
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            {adding ? t("detail.writers.addForm.adding") : t("detail.writers.addForm.addWriter")}
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
