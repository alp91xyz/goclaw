import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SkillUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<unknown>;
}

export function SkillUploadDialog({ open, onOpenChange, onUpload }: SkillUploadDialogProps) {
  const { t } = useTranslation("skills");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      await onUpload(file);
      setFile(null);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("upload.uploading"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!loading) {
      setFile(null);
      setError("");
      setDragging(false);
      onOpenChange(v);
    }
  };

  const acceptDrop = (f: File): boolean => f.name.toLowerCase().endsWith(".zip");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && acceptDrop(dropped)) {
      setFile(dropped);
      setError("");
    } else {
      setError(t("upload.onlyZip"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("upload.title")}</DialogTitle>
          <DialogDescription>
            {t("upload.description")}
          </DialogDescription>
        </DialogHeader>

        <div
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          {file ? (
            <p className="text-sm font-medium">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dragging ? t("upload.dropHere") : t("upload.dropOrClick")}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError("");
            }}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            {t("upload.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!file || loading}>
            {loading ? t("upload.uploading") : t("upload.button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
