import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, parseBackup, storageKey, type TrainingState } from "@/lib/training";

type Store = {
  state: TrainingState;
  update: (fn: (s: TrainingState) => TrainingState) => void;
  ready: boolean;
  saveError: string;
  dismissError: () => void;
};
const Context = createContext<Store | null>(null);
export function TrainingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const loaded = raw ? parseBackup(raw) : initialState();
      stateRef.current = loaded;
      setState(loaded);
      if (!raw) localStorage.setItem(storageKey, JSON.stringify(loaded));
    } catch {
      setSaveError(
        "Non è stato possibile leggere i dati salvati. Esporta un backup prima di continuare.",
      );
    }
    setReady(true);
  }, []);
  const update = (fn: (s: TrainingState) => TrainingState) => {
    const next = fn(stateRef.current);
    if (next === stateRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveError("");
    } catch {
      setSaveError(
        "Salvataggio sul dispositivo non riuscito. Non chiudere la pagina: esporta un backup dalle impostazioni.",
      );
    }
    stateRef.current = next;
    setState(next);
  };
  return (
    <Context.Provider
      value={{ state, update, ready, saveError, dismissError: () => setSaveError("") }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTraining() {
  const value = useContext(Context);
  if (!value) throw new Error("Archivio allenamenti non disponibile");
  return value;
}
