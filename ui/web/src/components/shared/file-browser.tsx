import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatSize, type TreeNode } from "@/lib/file-helpers";
import { FileTreePanel } from "@/components/shared/file-tree";
import { FileContentPanel } from "@/components/shared/file-viewers";

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}

export function FileBrowser({
  tree,
  filesLoading,
  activePath,
  onSelect,
  contentLoading,
  fileContent,
  onDelete,
  showSize,
}: {
  tree: TreeNode[];
  filesLoading: boolean;
  activePath: string | null;
  onSelect: (path: string) => void;
  contentLoading: boolean;
  fileContent: { content: string; path: string; size: number } | null;
  onDelete?: (path: string, isDir: boolean) => void;
  showSize?: boolean;
}) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("common");
  const containerRef = useRef<HTMLDivElement>(null);
  const [treeWidth, setTreeWidth] = useState(220);
  const [mobileShowTree, setMobileShowTree] = useState(true);
  const dragging = useRef(false);

  const handleSelect = useCallback((path: string) => {
    onSelect(path);
    if (isMobile) setMobileShowTree(false);
  }, [onSelect, isMobile]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startW = treeWidth;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const container = containerRef.current;
      if (!container) return;
      const maxW = container.offsetWidth * 0.5;
      const newW = Math.max(140, Math.min(maxW, startW + ev.clientX - startX));
      setTreeWidth(newW);
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [treeWidth]);

  // Mobile: stacked layout — tree first, tap file -> content view
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col border rounded-md overflow-hidden min-h-0">
        {mobileShowTree ? (
          <div className="flex-1 overflow-y-auto bg-muted/20 py-1">
            <FileTreePanel tree={tree} filesLoading={filesLoading} activePath={activePath} onSelect={handleSelect} onDelete={onDelete} showSize={showSize} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-b px-3 py-2 shrink-0">
              <button
                type="button"
                onClick={() => setMobileShowTree(true)}
                className="text-primary hover:underline cursor-pointer shrink-0"
              >
                &larr; {t("filesBack")}
              </button>
              {fileContent && (
                <>
                  <span className="font-mono truncate">{fileContent.path}</span>
                  <span className="shrink-0 ml-auto">{formatSize(fileContent.size)}</span>
                </>
              )}
            </div>
            <div className="flex-1 overflow-auto p-3 min-h-0">
              <FileContentPanel fileContent={fileContent} contentLoading={contentLoading} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop: side-by-side with resizable divider
  return (
    <div ref={containerRef} className="flex-1 flex border rounded-md overflow-hidden min-h-0">
      <div className="overflow-y-auto bg-muted/20 py-1 shrink-0" style={{ width: treeWidth }}>
        <FileTreePanel tree={tree} filesLoading={filesLoading} activePath={activePath} onSelect={handleSelect} onDelete={onDelete} showSize={showSize} />
      </div>

      <div
        className="w-1 cursor-col-resize bg-border hover:bg-primary/30 active:bg-primary/50 shrink-0"
        onMouseDown={onMouseDown}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {fileContent && (
          <div className="flex items-center justify-between text-xs text-muted-foreground border-b px-3 py-2 shrink-0">
            <span className="font-mono truncate">{fileContent.path}</span>
            <span className="shrink-0 ml-2">{formatSize(fileContent.size)}</span>
          </div>
        )}
        <div className="flex-1 overflow-auto p-3 min-h-0">
          <FileContentPanel fileContent={fileContent} contentLoading={contentLoading} />
        </div>
      </div>
    </div>
  );
}
