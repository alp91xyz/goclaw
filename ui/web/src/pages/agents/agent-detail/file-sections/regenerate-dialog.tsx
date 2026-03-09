import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: (prompt: string) => Promise<void>;
}

export function RegenerateDialog({
  open,
  onOpenChange,
  onRegenerate,
}: RegenerateDialogProps) {
  const { t } = useTranslation("agents");
  const [prompt, setPrompt] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setRegenerating(true);
    try {
      await onRegenerate(prompt.trim());
      onOpenChange(false);
      setPrompt("");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("fileEditor.editWithAi")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {t("fileEditor.editAiDescription")}
          </p>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("fileEditor.editAiPlaceholder")}
            className="min-h-[100px] max-h-[300px] resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={regenerating}
          >
            {t("fileEditor.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || regenerating}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {regenerating ? t("fileEditor.sending") : t("fileEditor.regenerate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
