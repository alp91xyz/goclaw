import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface WorkspaceSectionProps {
  workspace: string;
  restrictToWorkspace: boolean;
  onRestrictChange: (v: boolean) => void;
}

export function WorkspaceSection({
  workspace,
  restrictToWorkspace,
  onRestrictChange,
}: WorkspaceSectionProps) {
  const { t } = useTranslation("agents");
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">{t("workspace.title")}</h3>
      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>{t("workspace.workspacePath")}</Label>
          <p className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm text-muted-foreground">
            {workspace || t("workspace.noWorkspace")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("workspace.workspacePathHint")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={restrictToWorkspace}
            onCheckedChange={onRestrictChange}
          />
          <div>
            <Label>{t("workspace.restrictToWorkspace")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("workspace.restrictToWorkspaceHint")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
