---
description: Safely merge current branch into main with pre-merge checks
---

# Safe Merge to Main Command

You are helping the user merge their current branch into main. Follow this workflow:

## Step 1: Pre-Merge Safety Checks
For each repository (vector-graph-database-2 and zoh-mvp-v2):

1. **Check current branch**:
   ```bash
   git branch --show-current
   ```
   - If already on `main`, warn user and ask if they want to merge a different branch

2. **Check for uncommitted changes**:
   ```bash
   git status
   ```
   - If working tree is dirty, warn user and suggest `/commit` first

3. **Ensure we have latest main**:
   ```bash
   git fetch origin main
   ```

## Step 2: Review Changes
Show user what will be merged:
```bash
git log main..HEAD --oneline
```

Ask user to confirm: "Ready to merge these commits into main?"

## Step 3: Merge and Push
For each repository with branches to merge:

1. **Switch to main**:
   ```bash
   git checkout main
   ```

2. **Pull latest main from remote** (CRITICAL - must be done before merge):
   ```bash
   git pull origin main
   ```
   - This ensures we're merging into the latest version
   - Prevents conflicts with remote changes
   - If pull fails, abort and investigate

3. **Merge the branch**:
   ```bash
   git merge <branch-name> --no-ff
   ```
   - Use `--no-ff` to preserve branch history

4. **Handle conflicts** (if any):
   - If conflicts occur, show conflicted files
   - Guide user through resolution
   - After resolution: `git add .` and `git merge --continue`

5. **Push merged changes to remote**:
   ```bash
   git push origin main
   ```
   - Always push after successful merge
   - Confirm push success

## Step 4: Cleanup (optional - ask user)
Ask if they want to delete the merged branch:
```bash
git branch -d <branch-name>
git push origin --delete <branch-name>
```

## Safety Features:
- Always fetch latest main before merging
- Always pull latest main from remote before merge (prevents out-of-sync issues)
- Use `--no-ff` to preserve merge history
- Check for uncommitted changes
- Show preview of changes before merging
- Ask for confirmation before destructive operations
- Always push after successful merge (keeps remote in sync)
- Never force push to main

## Edge Cases:
- If already on main, ask which branch to merge
- If branch is behind main, suggest rebase first
- If merge conflicts, provide clear guidance
- If remote differs from local, warn and suggest pulling first
