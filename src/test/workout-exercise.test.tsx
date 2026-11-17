import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { WorkoutExercise } from "@/components/workout-exercise";
import type { Session } from "@/lib/training";

afterEach(cleanup);

it("mantiene modificabile la serie completata finché non si completa tutto l’esercizio", () => {
  function Workout() {
    const [rows, setRows] = useState<Session["results"][string]>([
      { weight: "40", reps: "10", done: false },
      { weight: "42.5", reps: "8", done: false },
    ]);
    return <WorkoutExercise
      exercise={{ id: "test", name: "Panca", sets: 2, reps: "8–10", note: "", muscle: "" }}
      index={0}
      rows={rows}
      previous={undefined}
      change={(_id, index, field, value) => setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row))}
    />;
  }
  render(<Workout />);
  fireEvent.click(screen.getByRole("button", { name: "Completa Panca, serie 1" }));
  expect(screen.getByRole("textbox", { name: "Panca, serie 1, peso" })).toHaveValue("40");
  expect(screen.getByRole("textbox", { name: "Panca, serie 1, ripetizioni" })).toHaveValue("10");
  fireEvent.change(screen.getByRole("textbox", { name: "Panca, serie 1, peso" }), { target: { value: "45" } });
  expect(screen.getByRole("textbox", { name: "Panca, serie 1, peso" })).toHaveValue("45");
  fireEvent.click(screen.getByRole("button", { name: "Completa Panca, serie 2" }));
  expect(screen.queryByRole("textbox", { name: "Panca, serie 1, peso" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Panca, apri tutte le serie" }));
  expect(screen.getByRole("textbox", { name: "Panca, serie 1, peso" })).toHaveValue("45");
  expect(screen.getByRole("textbox", { name: "Panca, serie 2, peso" })).toHaveValue("42.5");
});