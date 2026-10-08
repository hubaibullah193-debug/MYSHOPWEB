# Agent Rules: Hubaib One Stop Shop

This document defines how AI assistants (Claude Code, subagents, and any other AI tools) work on this project.

**All agents must follow the project constitution first:** see `CLAUDE.md`.

---

## Core Rules for All Agents

### 1. **Read the spec first**
- Before writing code, changing architecture, or making decisions: read `spec.md` for the current approved phase.
- If the spec is unclear or incomplete for your task, ask the user before proceeding.

### 2. **Verify the codebase**
- Inspect the actual code, database schema, and deployment before implementing.
- Do not assume patterns or structure—observe them in the actual files.

### 3. **Follow established patterns**
- Match the coding style, naming conventions, file organization, and tooling of the existing codebase.
- Do not introduce new frameworks, libraries, or architectural patterns without approval.

### 4. **Enforce business rules server-side**
- All business logic—payment gates, order status, inventory deduction, permissions—must be enforced at the data layer, not the UI.
- Never trust client input to enforce business rules.

### 5. **Security is non-negotiable**
- Implement authentication, authorization, validation, and row-level security (RLS) by default.
- Never bypass or weaken security for convenience.
- Sanitize input, protect secrets, and verify payment data server-side.

### 6. **Test and verify every change**
- Run type checking, linting, and build steps.
- Write and run tests for new features and bug fixes.
- Do not ship code without verification.

### 7. **Report outcomes faithfully**
- If tests fail, report the failure with output—don't hide it.
- If a task is incomplete, say so explicitly.
- Document what was done, what was verified, and what was skipped.

### 8. **Respect phase discipline**
- Only implement features approved for the current phase.
- Do not implement Phase 2 features while Phase 1 is incomplete.
- Escalate scope concerns to the user, don't decide unilaterally.

---

## Decision Tree

When unsure what to do, apply this order:

1. **Check CLAUDE.md** — Is this covered by the project constitution?
2. **Check spec.md** — What do the approved requirements say?
3. **Check existing code** — How do we do this in this codebase?
4. **Ask the user** — If still unclear, do not guess.

---

## For Subagents

If you spawn a subagent to work on part of this project:

- **Pass this file and `CLAUDE.md` to context** — the subagent must know the project rules.
- **Scope narrowly** — give the subagent one task, not broad exploration.
- **Verify the result** — do not assume the subagent's output is correct; test it.
- **If the subagent violates these rules**, surface it to the user and correct it.

---

## When Something Feels Wrong

If a requirement conflicts with these rules, or you spot a violation:

1. **Do not proceed** — stop and surface it to the user.
2. **Explain the conflict** — reference the rule and the requirement.
3. **Ask for clarification** — do not decide which rule to break.

---

## References

- **Project Constitution:** `CLAUDE.md`
- **Specification:** `spec.md`
- **Phases & Scope Plan:** `PHASES.md`
- **This Document:** `AGENTS.md`
