import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BlockEditor, validBlock } from "@/components/block-editor";
import { beginSession, closeSession, initialState, parseBackup, saveBlock, type Block } from "@/lib/training";

afterEach(cleanup);
it("modifica ogni serie anche per esercizi senza metadati individuali e non permette serie vuote", () => {
  const source = initialState().blocks[0];
  if (!source) throw new Error("Blocco mancante");
  let latest: Block = {
    ...source,
    dayOrder: ["A"],
    plan: {
      ...source.plan,
      A: [{ id: "test", name: "Prova", sets: 3, reps: "10", note: "", muscle: "" }],
    },
  };
  function Editor() {
    const [block, setBlock] = useState(latest);
    return (
      <BlockEditor
        block={block}
        onChange={(next) => {
          latest = next;
          setBlock(next);
        }}
      />
    );
  }
  render(<Editor />);
  fireEvent.change(screen.getByRole("textbox", { name: "Prova, serie 2, ripetizioni previste" }), {
    target: { value: "6–7" },
  });
  expect(latest.plan.A[0]?.seriesTargets?.map((t) => t.reps)).toEqual(["10", "6–7", "10"]);
  fireEvent.change(screen.getByRole("spinbutton", { name: "Prova, serie previste" }), {
    target: { value: "4" },
  });
  expect(latest.plan.A[0]?.seriesTargets?.[3]?.reps).toBe("");
  expect(validBlock(latest)).toBe(false);
  fireEvent.change(screen.getByRole("textbox", { name: "Prova, serie 4, ripetizioni previste" }), {
    target: { value: "12" },
  });
  expect(validBlock(latest)).toBe(true);
});

it("corregge le serie del blocco attivo senza cambiare la sessione in corso e le conserva nel backup", () => {
  const state = initialState();
  const active = state.blocks[0];
  if (!active) throw new Error("Blocco mancante");
  active.demo = false;
  active.plan.A = [{ id: "lat", name: "Lat presa larga", sets: 3, reps: "6-7 + 8-10 + 8-10", note: "", muscle: "" }];
  const started = beginSession(state, "A");
  const originalSession = structuredClone(started.sessions.at(-1));
  let latest = structuredClone(active);
  function Editor() {
    const [block, setBlock] = useState(latest);
    return <BlockEditor block={block} onChange={(next) => { latest = next; setBlock(next); }} />;
  }
  render(<Editor />);
  fireEvent.change(screen.getByRole("textbox", { name: "Lat presa larga, serie 2, ripetizioni previste" }), {
    target: { value: "11–13" },
  });
  const saved = parseBackup(JSON.stringify(saveBlock(started, latest)));
  expect(saved.blocks[0]?.plan.A[0]?.seriesTargets?.map((target) => target.reps)).toEqual(["6–7", "11–13", "8–10"]);
  expect(saved.sessions.at(-1)).toEqual(originalSession);
  const next = beginSession(closeSession(saved, saved.currentSessionId ?? ""), "A");
  expect(next.sessions.at(-1)?.snapshot?.exercises[0]?.seriesTargets?.map((target) => target.reps)).toEqual(["6–7", "11–13", "8–10"]);
});
