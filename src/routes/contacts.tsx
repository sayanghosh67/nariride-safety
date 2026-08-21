import { createFileRoute } from "@tanstack/react-router";
import { Star, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/nari/app-shell";
import { Gate } from "@/components/nari/gate";
import { EmptyState, GlassCard, SectionTitle } from "@/components/nari/ui-kit";
import { useNari } from "@/lib/nari/store";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Trusted contacts — NariRide" },
      {
        name: "description",
        content: "Add the people who should be alerted the moment your journey looks unsafe or you activate SOS.",
      },
      { property: "og:title", content: "Trusted contacts — NariRide" },
      { property: "og:description", content: "Manage who gets alerted during deviations and emergencies." },
    ],
  }),
  component: () => (
    <Gate>
      <Contacts />
    </Gate>
  ),
});

const inputClass =
  "w-full rounded-xl border border-input bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-accent";

function Contacts() {
  const { state, addContact, updateContact, deleteContact } = useNari();
  const [form, setForm] = useState({ name: "", relationship: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError("Enter the contact's name.");
    if (!/^[+\d][\d\s-]{7,15}$/.test(form.phone.trim())) return setError("Enter a valid phone number.");
    setError(null);
    addContact({
      name: form.name.trim(),
      relationship: form.relationship.trim() || "Trusted contact",
      phone: form.phone.trim(),
      primary: state.contacts.length === 0,
    });
    setForm({ name: "", relationship: "", phone: "" });
    toast.success("Trusted contact added");
  };

  return (
    <AppShell title="Trusted contacts" subtitle="Alerted automatically during an emergency" back="/safety">
      <div className="space-y-4">
        <GlassCard className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <UserPlus className="size-4 text-accent" aria-hidden="true" /> Add a contact
          </p>
          <form className="space-y-2" onSubmit={submit} noValidate>
            <input
              className={inputClass}
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Relationship (e.g. Sister)"
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="+91 90000 00000"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            {error ? <p className="text-[11px] text-critical">{error}</p> : null}
            <button
              type="submit"
              className="w-full rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              Save contact
            </button>
          </form>
        </GlassCard>

        <div>
          <SectionTitle title={`Your contacts (${state.contacts.length})`} />
          {state.contacts.length === 0 ? (
            <EmptyState title="No trusted contacts" detail="Add at least one person who should be alerted in an emergency." />
          ) : (
            <div className="space-y-2">
              {state.contacts.map((c) => (
                <GlassCard key={c.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {c.name}
                      {c.primary ? (
                        <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                          Primary
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.relationship} · {c.phone}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      aria-label={`Make ${c.name} the primary contact`}
                      onClick={() => {
                        state.contacts.forEach((other) =>
                          updateContact(other.id, { primary: other.id === c.id }),
                        );
                      }}
                      className="grid size-9 place-items-center rounded-xl border border-border text-accent"
                    >
                      <Star className={c.primary ? "size-4 fill-accent" : "size-4"} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${c.name}`}
                      onClick={() => {
                        deleteContact(c.id);
                        toast.info(`${c.name} removed`);
                      }}
                      className="grid size-9 place-items-center rounded-xl border border-border text-critical"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground">
          Notifications in this prototype are simulated and recorded in the app — no SMS or calls are sent.
        </p>
      </div>
    </AppShell>
  );
}
