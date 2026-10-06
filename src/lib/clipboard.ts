function copyWithSelection(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(field);
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    previous?.focus();
  }
}

/**
 * Copies text, preferring the async Clipboard API. It is missing or denied on non-HTTPS origins
 * and in some embedded browsers, so fall back to a selection-based copy.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}
