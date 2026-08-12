"use client";

interface ForfeitMatchModalProps {
  isAdmin: boolean;
  onCancel: () => void;
  onForfeit: () => void;
  onCleanup: () => void;
}

export function ForfeitMatchModal({
  isAdmin,
  onCancel,
  onForfeit,
  onCleanup,
}: ForfeitMatchModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gold/25 bg-[var(--color-panel)] p-6 shadow-[0_20px_50px_rgba(0,0,0,.5)]">
        {isAdmin ? (
          <>
            <div className="mb-1 text-[10px] font-extrabold tracking-[.28em] text-gold">
              TA BORT MATCH
            </div>
            <h2 className="font-serif text-2xl font-semibold text-paper">
              Förlust eller städning?
            </h2>
            <p className="mt-3 text-sm text-paper-dim">
              Ska matchen räknas som en förlust, eller är det bara städning (tas bort helt,
              påverkar ingens statistik)?
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onForfeit}
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 font-semibold text-red-300"
              >
                Räkna som förlust
              </button>
              <button
                type="button"
                onClick={onCleanup}
                className="rounded-xl px-4 py-2.5 font-extrabold text-[var(--color-ink)]"
                style={{ background: "var(--color-accent-grad)" }}
              >
                Bara städning
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 font-semibold text-paper-dim"
              >
                Avbryt
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 text-[10px] font-extrabold tracking-[.28em] text-gold">
              GE UPP?
            </div>
            <h2 className="font-serif text-2xl font-semibold text-paper">
              Vill du verkligen ge upp?
            </h2>
            <p className="mt-3 text-sm text-paper-dim">
              Matchen avslutas direkt och vinsten tilldelas motståndaren med högst poäng.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 font-semibold text-paper-dim"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={onForfeit}
                className="flex-1 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 font-semibold text-red-300"
              >
                Ja, ge upp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
