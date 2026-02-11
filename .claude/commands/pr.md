---
description: Create a pull request with AI-generated title and description
---

# Create Pull Request Command

You are helping the user create a pull request. Follow this workflow:

## Step 1: Pre-PR Checks
For each repository (vector-graph-database-2 and zoh-mvp-v2):

1. **Check current branch**:
   ```bash
   git branch --show-current
   ```
   - Don't create PR from `main`

2. **Check if branch is pushed**:
   ```bash
   git status
   ```
   - If "Your branch is ahead", need to push first

3. **Ensure branch is up to date**:
   ```bash
   git fetch origin
   git status
   ```
   - If behind, suggest pulling first

## Step 2: Analyze Changes
1. **Get commit history**:
   ```bash
   git log main..HEAD --oneline
   ```

2. **Get diff summary**:
   ```bash
   git diff main...HEAD --stat
   ```

3. **Read recent commits**:
   ```bash
   git log main..HEAD --format="%B" --reverse
   ```

## Step 3: Generate PR Content
Based on the changes, create:

### PR Title (50-72 characters):
`[Component/Feature]: Clear description of what changed`

Examples:
- `Feed: Add session-based randomization with md5 ordering`
- `API: Optimize fragment screenshot loading with hybrid caching`
- `UI: Implement filter dropdown with multi-select`

### PR Description:
```markdown
## Summary
[2-3 sentences explaining what this PR does and why]

## Changes
- [Bullet point of key change 1]
- [Bullet point of key change 2]
- [Bullet point of key change 3]

## Technical Details
[Optional: Architecture decisions, trade-offs, performance implications]

## Testing
- [ ] Manual testing completed
- [ ] [Specific test scenario 1]
- [ ] [Specific test scenario 2]

## Screenshots/Demo
[If UI changes, include screenshots or video]

## Breaking Changes
[Optional: Any breaking changes and migration guide]

## Related Issues
[Optional: Closes #123, Relates to #456]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Step 4: Push Branch (if needed)
```bash
git push -u origin <branch-name>
```

## Step 5: Create PR
Use GitHub CLI to create the PR:
```bash
gh pr create --title "PR Title" --body "$(cat <<'EOF'
PR Description
EOF
)"
```

Optional flags to ask user about:
- `--draft` - Create as draft PR
- `--base main` - Specify base branch (default: main)
- `--assignee @me` - Assign to yourself
- `--label enhancement` - Add labels

## Step 6: Confirmation
Show user the PR URL and ask if they want to:
- Open PR in browser
- Add reviewers
- Link to issues

## Best Practices:
- **Clear title**: Describe *what* and *why* in title
- **Detailed summary**: Help reviewers understand context
- **Testing checklist**: Show what was tested
- **Screenshots**: Always include for UI changes
- **Breaking changes**: Call out anything that breaks compatibility
- **Small PRs**: If PR is large, suggest breaking into smaller PRs

## Edge Cases:
- If already on main, guide user to create feature branch first
- If branch not pushed, push it first
- If gh CLI not installed, provide manual GitHub URL
- If PR already exists, show link to existing PR
