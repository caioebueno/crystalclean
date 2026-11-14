"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Copies text to the clipboard and says so for a moment. */
export function CopyButton({ text, label = "Copy", className = "pill", aria }: { text: string; label?: string; className?: string; aria?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={aria}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            window.prompt("Copy this link", text);
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        }}
      >
        {copied ? "Copied!" : label}
      </button>
      <span className="sr" role="status">
        {copied ? "Link copied" : ""}
      </span>
    </>
  );
}

export function CopyField({ url }: { url: string }) {
  return (
    <label>
      <span className="lbl">Booking link</span>
      <span className="copyf">
        <input readOnly value={url.replace(/^https?:\/\//, "")} onFocus={(e) => e.target.select()} />
        <CopyButton text={url} className="btn btn-navy btn-sm" />
      </span>
    </label>
  );
}

type Row = { id: string; name: string; url: string; canCancel: boolean };

export function RowActions({ row, cancel }: { row: Row; cancel: (id: string) => Promise<unknown> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="lacts">
      <CopyButton text={row.url} aria={`Copy link for ${row.name}`} />
      <Link className="pill" href={`/admin/links/${row.id}`}>
        Open
      </Link>
      <Link className="pill" href={`/admin/links/${row.id}/edit`}>
        Edit
      </Link>
      <Link className="pill" href={`/admin/links/new?dup=${row.id}`}>
        Duplicate
      </Link>
      {row.canCancel && (
        <button
          type="button"
          className="pill"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await cancel(row.id);
            router.replace(`/admin/links?undo=${row.id}`);
            router.refresh();
            setBusy(false);
          }}
        >
          Cancel link
        </button>
      )}
    </div>
  );
}

export function UndoToast({ id, name, undo }: { id: string; name: string; undo: (id: string) => Promise<unknown> }) {
  const router = useRouter();
  return (
    <div className="toast" role="status">
      <span>Link for {name} cancelled.</span>
      <button
        type="button"
        className="linkbtn"
        onClick={async () => {
          await undo(id);
          router.replace("/admin/links");
          router.refresh();
        }}
      >
        Undo
      </button>
    </div>
  );
}
