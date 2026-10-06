import { LogOut } from "lucide-react";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { useAuthStore } from "../stores/authStore";
import { useSelectionStore } from "../stores/selectionStore";
import { useToastStore } from "../stores/toastStore";

interface SignOutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SignOutDialog({ open, onClose }: SignOutDialogProps) {
  const signOut = useAuthStore((state) => state.signOut);

  function confirm() {
    useSelectionStore.getState().clear();
    signOut();
    useToastStore.getState().push("success", "You have been signed out.");
  }

  return (
    <Dialog open={open} onClose={onClose} title="Sign out?">
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
        You will need your access token to sign in again. Any selected jobs will be cleared.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={confirm}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </Dialog>
  );
}
