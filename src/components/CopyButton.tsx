import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { copyText } from "../lib/clipboard";
import { useToastStore } from "../stores/toastStore";
import { Button } from "./Button";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    if (await copyText(text)) setCopied(true);
    else useToastStore.getState().push("error", "Could not copy to the clipboard.");
  }

  return (
    <Button size="sm" onClick={copy}>
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </Button>
  );
}
