---
description: Commit all changes with an AI-generated descriptive commit message
---

# Intelligent Commit Command

You are helping the user commit their changes. Follow this workflow:

## Step 1: Analyze Changes
1. Run `git status` to see which files have changed
2. Run `git diff` to understand the nature of the changes
3. Check if changes span multiple repos (vector-graph-database-2 and zoh-mvp-v2)

## Step 2: Generate Commit Message
Based on the changes, create a clear, descriptive commit message following this format:

```
[One-line summary of what changed (50-72 chars)]

[Detailed explanation of the changes, why they were made, and their impact.
Include technical details, new features, bug fixes, or refactoring.
Break into bullet points if multiple changes.]

[Optional: Breaking changes, migration notes, or performance implications]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Step 3: Commit and Push
For each repository with changes:
1. `cd` to the repository
2. `git add .` (or specific files if appropriate)
3. `git commit -m "$(cat <<'EOF' ... EOF)"` with the generated message
4. Confirm commit success
5. `git push` to push commit to remote
6. Confirm push success

## Guidelines:
- **Be specific**: Instead of "Fix bug", write "Fix infinite scroll duplicates in feed pagination"
- **Include context**: Explain *why* the change was made, not just *what* changed
- **Group related changes**: If frontend and backend changes are related, mention both
- **Flag breaking changes**: Use "BREAKING:" prefix if applicable
- **Keep first line concise**: 50-72 characters for the summary

## Edge Cases:
- If working tree is clean, tell user "No changes to commit"
- If changes are in progress (partially staged), ask user if they want to commit staged only or all changes
- If commit fails (e.g., hooks), show error and suggest fixes
- If push fails (e.g., remote ahead, no upstream), show error and suggest fixes:
  - No upstream: `git push -u origin <branch-name>`
  - Remote ahead: `git pull --rebase` then push again
  - Merge conflicts: Guide user through resolution
