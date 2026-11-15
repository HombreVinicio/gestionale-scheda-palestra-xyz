<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Keep workout state and backup validation in the browser-safe training module; pure transitions make progression and idempotence testable.
- Persist changes synchronously through the shared training provider, restoring only after hydration; this prevents lost input and SSR mismatches.
- Derive progression from closed sessions by original order; reopening older sessions must not undo later completed workouts.
- Select the previous workout once by matching block and day among earlier closed sessions, then match each exercise by ID and each set by index; reordering and missing exercises must never substitute unrelated results.
- Use separate TanStack routes with shared navigation in the root shell; each screen remains directly navigable.
- Keep the Lovable Start build unchanged and provide a separate client-only Vite configuration for GitHub Pages; static hosting has no server runtime.
- Generate static route entry files during the dedicated Pages build and override only its root document shell; local output then matches deployment without nesting an SSR document inside the browser mount.
- Capture an immutable plan snapshot at session start and migrate legacy sessions before editing a block; subsequent edits or deletions must not change recorded history or open sessions.
- Share the block editor across import review and active-plan editing, persisting drafts locally; apply valid drafts explicitly to avoid exposing unfinished prescriptions.
- Dynamically load PDF.js and its bundled worker only in upload handlers; retain all unrecognized text as pending notes and never infer ambiguous associations.
- Infer PDF table columns from semantic headers and rows from document geometry, never from exercise names or fixed page counts; keep unresolved source text editable and prescription metadata in backups and session snapshots.
