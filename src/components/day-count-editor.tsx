import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  blockDays,
  days,
  growBlockDays,
  removeBlockDays,
  type Block,
  type Day,
} from "@/lib/training";

export function DayCountEditor({
  block,
  onChange,
}: {
  block: Block;
  onChange: (b: Block) => void;
}) {
  const order = blockDays(block);
  const [count, setCount] = useState<number | null>(null);
  const [removed, setRemoved] = useState<Day[]>([]);
  const [destination, setDestination] = useState("");
  const [confirm, setConfirm] = useState(false);
  const remaining = order.filter((d) => !removed.includes(d));
  const affected = removed.reduce((n, d) => n + (block.plan[d]?.length ?? 0), 0);
  const close = () => {
    setCount(null);
    setConfirm(false);
  };
  return (
    <div className="day-count-editor">
      <label>
        <span className="field-label">Allenamenti a settimana</span>
        <select
          className="field-input"
          aria-label="Allenamenti a settimana"
          value={count ?? order.length}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (n > order.length) {
              onChange(growBlockDays(block, n));
              close();
            } else if (n < order.length) {
              setCount(n);
              setRemoved([]);
              setDestination("");
            } else close();
          }}
        >
          {days.map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      {count !== null && (
        <div className="day-reduction">
          <h3>Elimina {order.length - count} giornate</h3>
          <div className="day-removal-options">
            {order.map((d) => (
              <label key={d}>
                <input
                  type="checkbox"
                  checked={removed.includes(d)}
                  onChange={(e) => {
                    setRemoved(e.target.checked ? [...removed, d] : removed.filter((x) => x !== d));
                    setDestination("");
                  }}
                />{" "}
                Giorno {d} · {block.plan[d]?.length ?? 0} esercizi
              </label>
            ))}
          </div>
          <label>
            <span className="field-label">Esercizi delle giornate eliminate</span>
            <select
              className="field-input"
              aria-label="Gestione esercizi eliminati"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Scegli</option>
              <option value="delete">Elimina dalla scheda</option>
              {remaining.map((d) => (
                <option value={d} key={d}>
                  Sposta in Giorno {d}
                </option>
              ))}
            </select>
          </label>
          <div className="settings-actions">
            <Button variant="outline" onClick={close}>
              Annulla
            </Button>
            <Button
              disabled={removed.length !== order.length - count || !destination}
              onClick={() => setConfirm(true)}
            >
              Conferma riduzione
            </Button>
          </div>
          {confirm && (
            <ConfirmModal
              title="Eliminare le giornate selezionate?"
              description={`Giorni ${removed.join(", ")}. ${affected} esercizi ${destination === "delete" ? "saranno eliminati dalla scheda" : `saranno spostati in Giorno ${destination}`}. Le lettere delle altre giornate restano invariate. Sessioni e risultati salvati non cambiano.`}
              confirm="Applica riduzione"
              onCancel={() => setConfirm(false)}
              onConfirm={() => {
                const target = days.find((d) => d === destination) ?? null;
                onChange(removeBlockDays(block, removed, target));
                close();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
