import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { AgentData } from "@/types/agent";

interface AgentDangerTabProps {
  agent: AgentData;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
}

export function AgentDangerTab({ agent, onDelete, onDeleted }: AgentDangerTabProps) {
  const { t } = useTranslation("agents");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-destructive">{t("delete.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("delete.description")}
            </p>
          </div>
          <Button
            variant="destructive"
            className="shrink-0 gap-2"
            disabled={agent.is_default}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            {t("delete.title")}
          </Button>
        </div>
        {agent.is_default && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("delete.defaultCannotDelete")}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("delete.title")}
        description={t("delete.detailDescription", { name: agent.display_name || agent.agent_key })}
        confirmLabel={t("delete.confirmLabel")}
        variant="destructive"
        onConfirm={async () => {
          await onDelete();
          setConfirmOpen(false);
          onDeleted();
        }}
      />
    </div>
  );
}
