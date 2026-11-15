import type { Notes } from "@/lib/training";
export function PlanNotes({ coach, personal }: Partial<Notes>) {
  if (!coach?.trim() && !personal?.trim()) return null;
  return (
    <div className="plan-notes">
      {coach?.trim() && <p className="coach-indication">{coach}</p>}
      {personal?.trim() && <p className="personal-indication">{personal}</p>}
    </div>
  );
}
