---
description: Review code changes before committing with suggestions for improvements
---

# Code Review Command

You are performing a thorough code review of uncommitted changes. Follow this workflow:

## Step 1: Gather Changes
For each repository (vector-graph-database-2 and zoh-mvp-v2):

1. **Check what changed**:
   ```bash
   git status
   git diff --stat
   ```

2. **Get full diff**:
   ```bash
   git diff
   ```

## Step 2: Perform Review
Analyze the changes for:

### Code Quality
- **Readability**: Is code clear and well-commented?
- **Naming**: Are variables/functions descriptively named?
- **Structure**: Is code well-organized and modular?
- **Duplication**: Any repeated code that should be abstracted?

### Best Practices
- **Error handling**: Are errors properly caught and handled?
- **Security**: Any SQL injection, XSS, or other vulnerabilities?
- **Performance**: Any obvious performance bottlenecks?
- **Memory**: Any potential memory leaks or inefficient allocations?

### Consistency
- **Style**: Consistent with existing codebase?
- **Patterns**: Following established architectural patterns?
- **Conventions**: Adhering to language/framework conventions?

### Testing
- **Edge cases**: Are edge cases handled?
- **Validation**: Is input properly validated?
- **Error states**: How does code handle error conditions?

### Documentation
- **Comments**: Are complex parts explained?
- **Function docs**: Are public APIs documented?
- **TODOs**: Any unfinished work flagged?

## Step 3: Generate Review Report
Provide a structured review:

```markdown
# Code Review Summary

## 📊 Overview
- Files changed: X
- Lines added: Y
- Lines removed: Z

## ✅ Strengths
- [What's done well]
- [Good patterns used]
- [Clear improvements]

## ⚠️ Issues Found
### Critical (must fix before commit)
- [ ] [Security vulnerability or breaking bug]
- [ ] [Another critical issue]

### Medium (should fix)
- [ ] [Code smell or bad practice]
- [ ] [Performance concern]

### Low (nice to have)
- [ ] [Minor style issue]
- [ ] [Documentation improvement]

## 💡 Suggestions
1. **[Suggestion title]**
   - Current: [How it is now]
   - Proposed: [How it could be better]
   - Rationale: [Why this is better]

2. **[Another suggestion]**
   - ...

## 🧪 Testing Recommendations
- [ ] Test [specific scenario]
- [ ] Verify [edge case]
- [ ] Check [integration point]

## 📝 Overall Assessment
[Brief summary of changes and whether they're ready to commit]

**Recommendation**: [Commit as-is / Fix critical issues / Needs refactoring]
```

## Step 4: Offer to Fix
For each issue found, ask user if they want you to:
- Fix it automatically
- Get a detailed explanation
- Skip it for now

## Review Focus Areas by File Type:

### Python (.py)
- PEP 8 compliance
- Type hints usage
- Exception handling
- SQL injection prevention
- Resource cleanup (connections, files)

### JavaScript/React (.js, .jsx)
- ESLint warnings
- React hooks dependencies
- Memory leaks (event listeners, timers)
- Prop validation
- Accessibility (a11y)

### SQL (.sql)
- Injection vulnerabilities
- Index usage
- Query performance
- Transaction handling
- Constraint validity

### API Routes
- Authentication/authorization
- Input validation
- Error responses
- Rate limiting
- CORS configuration

## Edge Cases:
- If no changes, tell user "Working tree is clean"
- If changes are too large (>1000 lines), focus on critical issues
- If reviewing multiple repos, review each separately
- If user wants deep dive on specific file, focus just on that file
