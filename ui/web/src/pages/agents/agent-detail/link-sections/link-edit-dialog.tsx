import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AgentLinkData } from "@/types/agent";
import { DIRECTION_OPTIONS, joinArray, buildSettings } from "./link-utils";

interface LinkEditDialogProps {
  link: AgentLinkData | null;
  onClose: () => void;
  onSave: (linkId: string, updates: Record<string, unknown>) => Promise<void>;
}

export function LinkEditDialog({ link, onClose, onSave }: LinkEditDialogProps) {
  const { t } = useTranslation("agents");
  const [direction, setDirection] = useState("outbound");
  const [description, setDescription] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState("3");
  const [userAllow, setUserAllow] = useState("");
  const [userDeny, setUserDeny] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (link) {
      setDirection(link.direction);
      setDescription(link.description ?? "");
      setMaxConcurrent(String(link.max_concurrent));
      setUserAllow(joinArray(link.settings?.user_allow));
      setUserDeny(joinArray(link.settings?.user_deny));
    }
  }, [link]);

  const handleSave = async () => {
    if (!link) return;
    setSaving(true);
    try {
      await onSave(link.id, {
        direction,
        description,
        maxConcurrent: parseInt(maxConcurrent, 10) || 3,
        settings: buildSettings(userAllow, userDeny),
      });
      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!link} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("links.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("links.editDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("links.direction")}</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {DIRECTION_OPTIONS.find((o) => o.value === direction)?.desc}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("links.description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("links.optionalDescription")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("links.maxConcurrent")}</Label>
            <Input
              type="number"
              min={1}
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("links.allowedUsers")}</Label>
            <Input
              value={userAllow}
              onChange={(e) => setUserAllow(e.target.value)}
              placeholder="user1, user2, ..."
            />
            <p className="text-xs text-muted-foreground">
              {t("links.allowedUsersHintShort")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("links.deniedUsers")}</Label>
            <Input
              value={userDeny}
              onChange={(e) => setUserDeny(e.target.value)}
              placeholder="user3, user4, ..."
            />
            <p className="text-xs text-muted-foreground">
              {t("links.deniedUsersHintShort")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("files.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("config.saving") : t("general.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
