import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FILE_DESCRIPTIONS } from "./file-utils";

interface FileEditorProps {
  fileName: string | null;
  content: string;
  onChange: (content: string) => void;
  loading: boolean;
  dirty: boolean;
  saving: boolean;
  canEdit: boolean;
  onSave: () => void;
  headerActions?: ReactNode;
}

export function FileEditor({
  fileName,
  content,
  onChange,
  loading,
  dirty,
  saving,
  canEdit,
  onSave,
  headerActions,
}: FileEditorProps) {
  const { t } = useTranslation("agents");

  if (!fileName) {
    return (
      <div className="flex flex-1 flex-col">
        {headerActions && (
          <div className="mb-2 flex justify-end gap-2">{headerActions}</div>
        )}
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {canEdit ? t("files.selectFileToEdit") : t("files.selectFileToView")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">{fileName}</span>
          {FILE_DESCRIPTIONS[fileName] && (
            <span className="ml-2 text-xs text-muted-foreground">
              - {FILE_DESCRIPTIONS[fileName]}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          {canEdit && (
            <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
              {!saving && <Save className="h-3.5 w-3.5" />}
              {saving ? t("files.saving") : t("files.save")}
            </Button>
          )}
        </div>
      </div>
      {loading && !content ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("files.loading")}
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => {
            if (!canEdit) return;
            onChange(e.target.value);
          }}
          readOnly={!canEdit}
          className={`flex-1 resize-none font-mono text-sm ${!canEdit ? "opacity-70" : ""}`}
          placeholder="File content..."
        />
      )}
    </div>
  );
}
