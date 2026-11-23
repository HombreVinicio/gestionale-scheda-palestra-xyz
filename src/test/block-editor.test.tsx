import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BlockEditor, validBlock } from "@/components/block-editor";
import { initialState, type Block } from "@/lib/training";

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
