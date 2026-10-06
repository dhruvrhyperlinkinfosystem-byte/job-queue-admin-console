export function validateToken(value: string): string | null {
  if (value.trim() === "") return "Enter an access token.";
  if (/\s/.test(value.trim())) return "A token cannot contain spaces.";
  return null;
}
