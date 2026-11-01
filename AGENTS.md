# Working habits

## Keep code clean

- Read the surrounding code before editing and follow the project's existing conventions.
- Keep functions and modules focused, with clear names and straightforward control flow.
- Reuse shared logic instead of duplicating it. Extract helpers when they make the code easier to understand.
- Remove dead code, unused imports, and temporary debugging added during the task.
- Keep changes focused on the request; avoid unrelated refactors and unnecessary dependencies.
- Preserve existing user work, saved data, and backward compatibility.
- Use comments to explain intent or a non-obvious decision, rather than restating the code.
- Keep documentation useful and current. Put changing feature details in the README, not this file.

## Check the work

- Run checks appropriate to the change. Add or update focused tests for meaningful behavior changes.
- For visual or interactive changes, inspect the result and exercise the relevant controls when possible.
- Review the final diff for mistakes, unintended changes, and leftover temporary files.
- Run `git diff --check` before committing.
- Report what was verified and any checks that could not be completed.

## Commit and push

- Finish completed work with a focused commit and push to the tracked remote branch, unless the user asks otherwise.
- Inspect Git status before staging. Include the intended changes and preserve unrelated work.
- Write concise commit messages describing the outcome.
- Keep secrets, local settings, dependencies, and temporary artifacts out of commits. Follow the repository's policy for generated files.
- If the remote has advanced, integrate its changes without discarding work, and rerun relevant checks.
- Do not force-push or rewrite shared history without explicit authorization.
- Confirm the push succeeded and report the commit. If blocked, explain the blocker and leave the work intact.
