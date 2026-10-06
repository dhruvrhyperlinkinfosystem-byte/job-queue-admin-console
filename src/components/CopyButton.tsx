import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { copyText } from "../lib/clipboard";
import { useToastStore } from "../stores/toastStore";
import { Button } from "./Button";

interface CopyButtonProps {
  text: string;
  label: string;
  /** Shown in the toast after a successful copy. */
  successMessage?: string;
}

export function CopyButton({
  text,
  label,
  successMessage = "Copied to clipboard.",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const toast = useToastStore.getState();
    if (await copyText(text)) {
      setCopied(true);
      toast.push("success", successMessage);
    } else {
      toast.push("error", "Could not copy to the clipboard.");
    }
  }

  return (
    <Button size="sm" onClick={copy}>
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
