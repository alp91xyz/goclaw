import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode2,
  File,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { extOf, CODE_EXTENSIONS, formatSize, type TreeNode } from "@/lib/file-helpers";

function FileIcon({ name }: { name: string }) {
  const ext = extOf(name);
  if (ext === "md") return <FileText className="h-4 w-4 shrink-0 text-blue-500" />;
  if (CODE_EXTENSIONS.has(ext)) return <FileCode2 className="h-4 w-4 shrink-0 text-orange-500" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function TreeItem({
  node,
  depth,
  activePath,
  onSelect,
  onDelete,
  showSize,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
  onDelete?: (path: string, isDir: boolean) => void;
  showSize?: boolean;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isActive = activePath === node.path;

  const deleteBtn = onDelete && !node.protected && (
    <button
      type="button"
      className="ml-auto shrink-0 opacity-0 group-hover/tree-item:opacity-100 text-destructive hover:text-destructive/80 transition-opacity cursor-pointer p-0.5"
      title={`Delete ${node.isDir ? "folder" : "file"}`}
      onClick={(e) => { e.stopPropagation(); onDelete(node.path, node.isDir); }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );

  const sizeLabel = showSize && (node.isDir ? (node.totalSize ?? 0) : node.size) > 0 && (
    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">
      {formatSize(node.isDir ? (node.totalSize ?? 0) : node.size)}
    </span>
  );

  if (node.isDir) {
    return (
      <div>
        <div
          className="group/tree-item flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm hover:bg-accent cursor-pointer"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-yellow-600" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-yellow-600" />
          )}
          <span className="truncate">{node.name}</span>
          {sizeLabel}
          {deleteBtn}
        </div>
        {expanded && node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activePath={activePath}
            onSelect={onSelect}
            onDelete={onDelete}
            showSize={showSize}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`group/tree-item flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm cursor-pointer ${
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      }`}
      style={{ paddingLeft: `${depth * 16 + 20}px` }}
      onClick={() => onSelect(node.path)}
    >
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
      {sizeLabel}
      {deleteBtn}
    </div>
  );
}

export function FileTreePanel({
  tree,
  filesLoading,
  activePath,
  onSelect,
  onDelete,
  showSize,
}: {
  tree: TreeNode[];
  filesLoading: boolean;
  activePath: string | null;
  onSelect: (path: string) => void;
  onDelete?: (path: string, isDir: boolean) => void;
  showSize?: boolean;
}) {
  const { t } = useTranslation("common");
  if (filesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (tree.length === 0) {
    return <p className="px-3 py-4 text-sm text-muted-foreground">{t("noFiles")}</p>;
  }
  return (
    <>
      {tree.map((node) => (
        <TreeItem key={node.path} node={node} depth={0} activePath={activePath} onSelect={onSelect} onDelete={onDelete} showSize={showSize} />
      ))}
    </>
  );
}
