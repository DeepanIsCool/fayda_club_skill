"use client";

import { cn } from "@/app/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { X } from "lucide-react";
import * as React from "react";

// Define the shape of the data you expect to handle
type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type PublicMeta = {
  phone?: string | { number?: string };
  address?: Address;
  [k: string]: unknown;
};

/**
 * A dialog component that prompts signed-in users to complete
 * their profile by adding a phone number and address.
 */
export default function CompleteProfilePrompt() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Prefill form fields from Clerk's publicMetadata
  const pm = ((user?.publicMetadata ?? {}) as PublicMeta) || {};
  const initialPhone =
    typeof pm.phone === "string" ? pm.phone : pm.phone?.number || "";
  const initialAddress: Address = pm.address ?? {};

  const [phone, setPhone] = React.useState(initialPhone);
  const [address, setAddress] = React.useState<Address>({
    line1: initialAddress.line1 ?? "",
    line2: initialAddress.line2 ?? "",
    city: initialAddress.city ?? "",
    state: initialAddress.state ?? "",
    postalCode: initialAddress.postalCode ?? "",
    country: initialAddress.country ?? "",
  });

  // Automatically open the dialog if the profile is incomplete for a signed-in user
  React.useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Check publicMetadata directly from Clerk user object
      const publicMeta = (user.publicMetadata as PublicMeta) || {};

      // Check if phone exists in publicMetadata
      const hasPhone = !!(
        publicMeta.phone &&
        (typeof publicMeta.phone === "string"
          ? publicMeta.phone.trim()
          : publicMeta.phone.number?.trim())
      );

      // Check if required address fields exist in publicMetadata
      const address = publicMeta.address || {};
      const hasAddress = !!(
        address.line1?.trim() &&
        address.city?.trim() &&
        address.country?.trim()
      );

      // Only show dialog if profile is incomplete
      if (!hasPhone || !hasAddress) {
        setOpen(true);
      }
    }
  }, [isLoaded, isSignedIn, user]);

  const fullName =
    user?.fullName || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const email = user?.primaryEmailAddress?.emailAddress || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), address }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || `Request failed with status ${res.status}`
        );
      }

      // Refresh the user object to get the latest publicMetadata
      await user?.reload?.();

      setSuccess("Profile updated successfully!");
      setTimeout(() => setOpen(false), 1000); // Close dialog after success
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
        <button
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-md p-1 text-white/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Complete Your Profile
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Add your details to become eligible for gift drops and rewards.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Form Fields */}
          <Field label="Name" value={fullName} readOnly />
          <Field label="Email" value={email} readOnly />
          <Field
            label="Phone number"
            value={phone}
            onChange={setPhone}
            placeholder="+1 555 123 4567"
            autoFocus
          />
          <Field
            label="Address line 1"
            value={address.line1 ?? ""}
            onChange={(v) => setAddress((a) => ({ ...a, line1: v }))}
            placeholder="House / Street"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="City"
              value={address.city ?? ""}
              onChange={(v) => setAddress((a) => ({ ...a, city: v }))}
              placeholder="City"
            />
            <Field
              label="Country"
              value={address.country ?? ""}
              onChange={(v) => setAddress((a) => ({ ...a, country: v }))}
              placeholder="Country"
            />
          </div>

          {/* Status Messages */}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          {/* Action Buttons */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white"
              disabled={submitting}
            >
              Not Now
            </Button>
            <Button
              type="submit"
              className="bg-yellow-400 text-amber-900 hover:bg-yellow-300 font-semibold"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save & Continue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for form fields
function Field(props: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}) {
  const { label, value, onChange, placeholder, readOnly, autoFocus } = props;
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={!!readOnly}
        autoFocus={autoFocus}
        className={cn(
          "w-full rounded-md border px-3 py-2 text-sm text-white",
          "bg-white/[0.06] border-white/10 outline-none",
          "placeholder:text-white/40",
          readOnly && "opacity-70 cursor-not-allowed",
          "focus:ring-2 focus:ring-yellow-400/30"
        )}
      />
    </label>
  );
}
