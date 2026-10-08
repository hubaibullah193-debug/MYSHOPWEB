# Project Constitution: Hubaib One Stop Shop

This document is the source of truth for how Claude Code and any AI assistants work on this project. Follow these principles exactly.

## Core Principles

### 1. **Spec is the source of truth**
- Follow approved requirements in `docs/spec.md` exactly.
- Do not deviate from specified business logic, workflows, or constraints.
- If you discover the spec is incomplete or conflicts with code, ask before proceeding.

### 2. **Inspect before implementing**
- Read the actual codebase, database schema, and dependencies first.
- Verify the current state of the project before writing code.
- Do not assume structure or patterns—observe them.

### 3. **Do not guess**
- If requirements conflict or are unclear, ask the user before changing anything.
- Ambiguity in the spec is a blocker, not a green light for interpretation.
- When in doubt, confirm intent over implementing a guess.

### 4. **No scope creep**
- Implement only the current approved phase (Phase 1, Phase 2, etc.).
- Avoid adding unrelated features, refactoring, or "future-proofing."
- If a change is necessary but outside the current phase, surface it for approval first.

### 5. **Business rules are mandatory**
- Enforce all business logic server-side, not only in the UI.
- Payment confirmation gates, order status lifecycle, inventory deduction, admin permissions—all must be enforced at the data layer.
- Never trust the client to enforce business rules.

### 6. **Security first**
- Never bypass authentication, authorization, validation, row-level security (RLS), or data protection.
- Implement payment verification, role-based access control, and input sanitization by default.
- If a feature seems to require a security compromise, ask for clarification instead.

### 7. **Verify every change**
- Test functionality against the spec.
- Run type checking, linting, builds, and unit/integration tests.
- Verify security assumptions and accessibility where applicable.
- Do not ship unverified code.

### 8. **Phase discipline**
- Complete, verify, and report the current phase fully.
- Wait for explicit user approval before starting the next phase.
- Do not implement Phase 2 features while Phase 1 is incomplete.

---

## How to Use This Document

- **When starting a task:** Re-read this constitution and the relevant section of `docs/spec.md`.
- **When something feels off:** Check if a principle is being violated; surface it to the user.
- **When a decision is unclear:** Refer to principles in this order: Spec → Security → Clarity → Scope.

## References

- **Specification:** `docs/spec.md` (requirements and business logic)
- **Agent Rules:** `AGENTS.md` (guidelines for AI assistants working on this project)
