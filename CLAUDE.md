# GreekWheel - Claude Code Instructions

## Team Configuration

When the user asks to "spin up the team" or "start the team", create a team named `antigravity` with the following members. Always spawn agents with `mode: "bypassPermissions"`.

| Role | Name | Agent Type | Model | Description |
|------|------|-----------|-------|-------------|
| Team Lead | (you) | team-lead | opus | Coordinates all work, manages task pipeline |
| Product Manager | `product-manager` | product-manager | opus | Researches problems, writes PRDs, scopes features |
| Architect | `architect` | architect | opus | Reads PRDs, designs architecture, produces execution plans |
| Frontend Dev 1 | `frontend-1` | frontend | sonnet | Next.js, React, TypeScript, Tailwind, Prisma |
| Frontend Dev 2 | `frontend-2` | frontend | sonnet | Next.js, React, TypeScript, Tailwind, Prisma |
| QA Engineer | `qa` | qa | sonnet | Testing, validation, documentation, merge to main |

Agent definitions live in `.claude/agents/`. Permissions are configured in `.claude/settings.local.json`.

## Standard Workflow Pipeline

When the user requests a new feature, execute this pipeline:

1. **Product Manager** — researches codebase, writes PRD, sends to architect
2. **Architect** — reads PRD, designs execution plan with parallelizable tasks for 2 frontend devs
3. **Frontend Dev 1 + Frontend Dev 2** — implement in parallel on isolated worktree branches, open PRs
4. **QA Engineer** — reviews PRs, writes tests, validates acceptance criteria, merges to main

The team lead coordinates handoffs, makes product decisions on open questions, and splits work between frontend devs to avoid file conflicts.
