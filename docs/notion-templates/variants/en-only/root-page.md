# {{PAGE_TITLE}}

Mode: `{{MODE}}`  
Language: `{{LANGUAGE}}`  
Template ID: `{{PAGE_ID}}`

<!-- REQUIRED:Purpose -->
## Purpose

Define the operating intent for this root page and keep execution aligned with the Personal Knowledge Base AI OS model.

<!-- REQUIRED:When to use -->
## When to use

- Use during planning, execution, review, or migration depending on this page role.
- Use before making structural changes to databases, views, or sync policy.

<!-- REQUIRED:How to use -->
## How to use

1. Set page objective and owner.
2. Keep current-week priorities at the top.
3. Link related work items, research, incidents, and governance decisions.
4. End each update with next action and due date.

Suggested role by page id:

- `01-*`: strategic goals and constraints
- `02-*`: milestone plan and dependency tracking
- `03-*`: SOP/runbook steps
- `04-*`: daily mission control and triage links
- `05-*`: incident response playbook
- `06-*`: metrics, governance, decision log
- `07-*`: migration batches and archive traceability

<!-- REQUIRED:Inputs/Outputs -->
## Inputs/Outputs

**Inputs**

- Active records from core databases
- Weekly review outcomes
- Incident and sync status

**Outputs**

- Prioritized actions with accountable owner
- Updated workflow status and governance decisions
- Linked evidence for migration and operational quality

<!-- REQUIRED:Health Signals -->
## Health Signals

- Sections are updated weekly with clear next action.
- Linked database views resolve to live records (no dead links).
- Each decision has an owner and date.

<!-- REQUIRED:Limitations -->
## Limitations

- This is a content template, not an automation by itself.
- Missing review cadence will make this page stale quickly.

<!-- REQUIRED:Examples -->
## Examples

- Add a weekly decision block: "Keep inbox policy in hybrid mode for one more week."
- Add a rollout note: "Switch production mode to `th-en-split` after parity validation."

<!-- REQUIRED:Related Links -->
## Related Links

- [Template manifest](docs/notion-templates/manifest.json)
- [Section contract](docs/notion-templates/common/section-contract.md)
- [Template mode script](scripts/notion-template-mode.mjs)

