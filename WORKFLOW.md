# Feature Branch Workflow

## Quick Start

### Starting New Work
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Committing Changes
```bash
git add [files]
git commit -m "Your detailed message"
git push -u origin feature/your-feature-name  # first time
git push  # subsequent times
```

### Merging to Main
```bash
git checkout main
git pull origin main
git merge feature/your-feature-name
git push origin main
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## Branch Naming Convention

**Format:** `<type>/<description>`

**Types:**
- `feature/` - New functionality (e.g., `feature/milestone-7-deployment`)
- `fix/` - Bug fixes (e.g., `fix/mobile-overflow`)
- `refactor/` - Code improvements (e.g., `refactor/cleanup-imports`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)

---

## Complete Workflow

### 1. Create Feature Branch

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create and switch to new feature branch
git checkout -b feature/milestone-7-deployment

# Verify you're on the new branch
git branch
```

### 2. Work on Your Feature

Make changes, test, and commit:

```bash
# Stage your changes
git add app/api/health/route.ts
git add railway.json

# Commit with detailed message
git commit -m "$(cat <<'EOF'
Add Railway deployment configuration

- Created railway.json with build settings
- Updated health check endpoint
- Added production environment variables
- Configured restart policy

Files:
- railway.json
- app/api/health/route.ts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### 3. Push Feature Branch

```bash
# First time pushing this branch
git push -u origin feature/milestone-7-deployment

# Subsequent pushes
git push
```

### 4. Test Everything

**Important:** Test thoroughly before merging to main:

```bash
# Run dev server
npm run dev

# Try production build
npm run build

# Test all functionality
# - Create room
# - Join room
# - Add options
# - Spin wheel
# - Check recent decisions
```

### 5. Merge to Main

Once everything is tested and working:

```bash
# Switch back to main
git checkout main

# Pull latest changes
git pull origin main

# Merge your feature branch
git merge feature/milestone-7-deployment

# Push to main
git push origin main
```

### 6. Cleanup

After successful merge:

```bash
# Delete local branch
git branch -d feature/milestone-7-deployment

# Delete remote branch
git push origin --delete feature/milestone-7-deployment
```

---

## Useful Commands

```bash
git status              # See what's changed
git branch              # See all local branches
git branch -a           # See local and remote branches
git log --oneline -5    # See recent commits
git diff                # See unstaged changes
git diff --staged       # See staged changes
```

---

## Benefits

### ✅ Safety
- Main stays stable - only working code gets merged
- Easy rollback - can abandon branch if things break
- Test freely - experiment without fear

### ✅ Organization
- Clear separation of work
- Can work on multiple features simultaneously
- Better commit history

### ✅ Best Practices
- Industry standard workflow
- Main is always deployable
- Review-friendly

---

## Important Rules

1. **Always test before merging** - Run builds and test all features
2. **Keep commits focused** - Each commit should be a logical unit
3. **Use descriptive branch names** - Makes purpose clear
4. **Delete branches after merging** - Keeps repo clean
5. **Main should always work** - Never merge broken code
