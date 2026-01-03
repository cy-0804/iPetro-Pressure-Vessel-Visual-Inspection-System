---
description: How to safely work with Git branches to prevent overwriting local changes
---

# Git Branch Workflow

This workflow prevents your local changes from being overwritten when pulling from the remote repository.

## 1. Before Starting New Work

Always create a **feature branch** for your work instead of working directly on `main`:

```bash
// turbo
git checkout main

// turbo
git pull origin main

// turbo
git checkout -b feature/your-feature-name
```

## 2. Commit Your Changes Regularly

Save your work frequently with commits:

```bash
git add .
git commit -m "feat: describe your changes"
```

## 3. Before Pulling Latest Changes (The Critical Step)

**DO NOT** run `git pull` when you have uncommitted changes. Instead:

```bash
# Option A: Commit first
git add .
git commit -m "WIP: save current progress"
git pull origin main

# Option B: Stash your changes temporarily
git stash
git pull origin main
git stash pop
```

## 4. Merging Latest Main into Your Branch

To get the latest code from your team without losing your work:

```bash
git checkout main
git pull origin main
git checkout your-feature-branch
git merge main
```

If there are conflicts, Git will pause and let you resolve them manually.

## 5. Pushing Your Branch

```bash
git push -u origin feature/your-feature-name
```

Then create a **Pull Request** on GitHub/GitLab for your teammates to review.

---

## Quick Reference: Safe Pull

```bash
# Check for uncommitted changes first
git status

# If you have changes, stash them
git stash

# Now safe to pull
git pull

# Restore your changes
git stash pop
```

## Key Rules

1.  **Never work directly on `main`** – always use a feature branch.
2.  **Never pull without committing or stashing first.**
3.  **Use meaningful commit messages** so you can find changes later.
4.  **Pull frequently** to avoid large merge conflicts.
