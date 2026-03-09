import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { useClipboard } from "@/hooks/use-clipboard";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import rust from "highlight.js/lib/languages/rust";
import ruby from "highlight.js/lib/languages/ruby";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import lua from "highlight.js/lib/languages/lua";
import { extOf, langFor, stripFrontmatter, CODE_EXTENSIONS } from "@/lib/file-helpers";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("jsx", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("java", java);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("lua", lua);

function CodeViewer({ content, language }: { content: string; language: string }) {
  const { copied, copy } = useClipboard();
  const codeRef = useRef<HTMLElement>(null);

  const highlighted = useMemo(() => {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(content, { language }).value;
      } catch { /* fallback */ }
    }
    return null;
  }, [content, language]);

  return (
    <div className="group relative overflow-hidden rounded-md border">
      <div className="flex items-center justify-between bg-muted px-3 py-1 text-xs text-muted-foreground">
        <span>{language || "text"}</span>
        <button
          type="button"
          onClick={() => copy(content)}
          className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
          title="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="overflow-auto p-4 text-sm hljs">
        {highlighted ? (
          <code ref={codeRef} dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <code>{content}</code>
        )}
      </pre>
    </div>
  );
}

function CsvViewer({ content }: { content: string }) {
  const { copied, copy } = useClipboard();
  const rows = useMemo(() => {
    return content.split("\n").filter(Boolean).map((line) => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
  }, [content]);

  const header = rows[0];
  if (!header || rows.length === 0) return <pre className="text-sm p-4">{content}</pre>;
  const body = rows.slice(1);

  return (
    <div className="group relative rounded-md border flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-muted px-3 py-1 text-xs text-muted-foreground shrink-0">
        <span>csv ({body.length} rows)</span>
        <button
          type="button"
          onClick={() => copy(content)}
          className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
          title="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted">
              {header.map((col, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium border-b whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                {header.map((_, j) => (
                  <td key={j} className="px-3 py-1.5 border-r last:border-r-0">
                    {row[j] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FileContentBody({ path, content }: { path: string; content: string }) {
  const ext = extOf(path);
  const displayContent = ext === "md" ? stripFrontmatter(content) : content;

  if (ext === "md") return <MarkdownRenderer content={displayContent} />;
  if (ext === "csv") return <CsvViewer content={displayContent} />;
  if (CODE_EXTENSIONS.has(ext)) return <CodeViewer content={displayContent} language={langFor(ext)} />;
  return (
    <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
      {displayContent}
    </pre>
  );
}

export function FileContentPanel({
  fileContent,
  contentLoading,
}: {
  fileContent: { content: string; path: string; size: number } | null;
  contentLoading: boolean;
}) {
  const { t } = useTranslation("common");
  if (contentLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (fileContent) {
    return <FileContentBody path={fileContent.path} content={fileContent.content} />;
  }
  return (
    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
      {t("selectFileToView")}
    </div>
  );
}
