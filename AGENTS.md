# AGENTS.md

Repository-specific instructions for AI agents working in this repo.

## End-of-work repository hygiene

- At the end of completed work, commit the changes before reporting done.
- Use Conventional Commits for every commit message, e.g. `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Prefer small, coherent commits grouped by purpose rather than one mixed commit.
- Leave the working tree clean after successful work.
- If work is blocked, incomplete, or unsafe to commit, do not create a WIP commit; report the blocker and the remaining dirty files.

## Verification

- Run the narrowest relevant verification before committing code changes.
- Documentation-only changes do not require the full test suite unless they affect generated docs or build inputs.
