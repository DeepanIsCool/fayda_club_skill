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
 * Profile completion prompt:
 * - Prefills name/email (read-only) from Clerk
 * - Asks for phone + address (saved to publicMetadata via /api/profile)
 * - Auto-opens for signed-in users until both fields exist
 */
export default function CompleteProfilePrompt() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Prefill from Clerk publicMetadata
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

  // Determine if profile still incomplete
  const needsProfile = React.useMemo(() => {
    const hasPhone = (phone || initialPhone || "").trim().length > 0;
    const a = address || initialAddress || {};
    const hasAddress = !!(a.line1 && a.city && a.country);
    return !(hasPhone && hasAddress);
  }, [phone, address, initialPhone, initialAddress]);

  // Open when signed-in & incomplete
  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (needsProfile) setOpen(true);
  }, [isLoaded, isSignedIn, needsProfile]);

  const fullName =
    user?.fullName || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const handleClose = () => setOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const trimmedPhone = (phone || "").trim();
      const addr = {
        line1: (address.line1 || "").trim(),
        line2: (address.line2 || "").trim(),
        city: (address.city || "").trim(),
        state: (address.state || "").trim(),
        postalCode: (address.postalCode || "").trim(),
        country: (address.country || "").trim(),
      };

      if (!trimmedPhone || !addr.line1 || !addr.city || !addr.country) {
        setError("Please fill phone, address line 1, city and country.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone, address: addr }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed (${res.status})`);
      }

      // Refresh the user object so publicMetadata is up-to-date
      await user?.reload?.();

      setSuccess("Profile updated. You’re all set for rewards!");
      setTimeout(() => setOpen(false), 900);
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
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-md p-1 text-white/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Complete your profile to unlock gifts
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Add a phone number and address to become eligible for gift drops and
            bonuses.
          </DialogDescription>
        </DialogHeader>

        {/* Progress overview */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ProgressPill
            label="Phone"
            ok={(initialPhone || phone).trim().length > 0}
          />
          <ProgressPill
            label="Address"
            ok={
              !!(
                (address.line1 || initialAddress.line1) &&
                (address.city || initialAddress.city) &&
                (address.country || initialAddress.country)
              )
            }
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Name" value={fullName} readOnly placeholder="—" />
          <Field label="Email" value={email} readOnly placeholder="—" />

          <Field
            label="Phone number"
            value={phone}
            onChange={(v) => setPhone(v)}
            placeholder="+1 555 123 4567"
            autoFocus
          />

          <div className="grid grid-cols-1 gap-3">
            <Field
              label="Address line 1"
              value={address.line1 ?? ""}
              onChange={(v) => setAddress((a) => ({ ...a, line1: v }))}
              placeholder="House / Street"
            />
            <Field
              label="Address line 2"
              value={address.line2 ?? ""}
              onChange={(v) => setAddress((a) => ({ ...a, line2: v }))}
              placeholder="Apt, suite, etc. (optional)"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="City"
                value={address.city ?? ""}
                onChange={(v) => setAddress((a) => ({ ...a, city: v }))}
                placeholder="City"
              />
              <Field
                label="State / Province"
                value={address.state ?? ""}
                onChange={(v) => setAddress((a) => ({ ...a, state: v }))}
                placeholder="State"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Postal code"
                value={address.postalCode ?? ""}
                onChange={(v) => setAddress((a) => ({ ...a, postalCode: v }))}
                placeholder="ZIP / Postal"
              />
              <Field
                label="Country"
                value={address.country ?? ""}
                onChange={(v) => setAddress((a) => ({ ...a, country: v }))}
                placeholder="Country"
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-rose-300 bg-rose-900/30 border border-rose-800/40 rounded-md px-3 py-2">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-emerald-300 bg-emerald-900/30 border border-emerald-800/40 rounded-md px-3 py-2">
              {success}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white"
              disabled={submitting}
            >
              Not now
            </Button>
            <Button
              type="submit"
              className={cn(
                "bg-yellow-400 text-amber-900 hover:bg-yellow-300 font-semibold",
                submitting && "opacity-90"
              )}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save & continue"}
            </Button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            These details are saved as custom fields in your account (public
            metadata) and are only used for rewards eligibility.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Small helpers ------------------------------ */

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
          readOnly
            ? "opacity-70 cursor-not-allowed"
            : "focus:ring-2 focus:ring-yellow-400/30"
        )}
      />
    </label>
  );
}

function ProgressPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-sm">{label}</span>
      <Badge
        className={
          ok
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
            : "bg-rose-500/20 text-rose-300 border-rose-400/30"
        }
      >
        {ok ? "Done" : "Missing"}
      </Badge>
    </div>
  );
}
