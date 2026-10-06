import { FileText, Download } from "lucide-react";

/** Render de un adjunto del chat: imagen con vista previa, o chip de documento. */
export function ChatAttachment({
  url,
  name,
  type,
  own = false,
}: {
  url: string;
  name: string | null;
  type: string | null;
  own?: boolean;
}) {
  const isImage = (type ?? "").startsWith("image/");
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name ?? "Imagen"}
          className="max-w-[230px] max-h-[230px] rounded-[12px] object-cover border"
          style={{ borderColor: own ? "rgba(255,255,255,0.25)" : "var(--color-border)" }}
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      download={name ?? "documento"}
      className="flex items-center gap-2 px-3 py-2 rounded-[12px] border no-underline max-w-[230px]"
      style={{
        background: own ? "rgba(255,255,255,0.14)" : "var(--color-surface)",
        borderColor: own ? "rgba(255,255,255,0.25)" : "var(--color-border)",
        color: own ? "inherit" : "var(--color-foreground)",
      }}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="text-[12.5px] font-bold truncate flex-1">
        {name ?? "Documento"}
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </a>
  );
}
