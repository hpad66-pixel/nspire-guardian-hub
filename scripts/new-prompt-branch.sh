#!/usr/bin/env bash
# new-prompt-branch.sh — create a prompt-scoped feature branch off main.
#
# Usage:  ./scripts/new-prompt-branch.sh <prompt-id> <slug>
#   e.g.  ./scripts/new-prompt-branch.sh D4 change-orders
#   e.g.  ./scripts/new-prompt-branch.sh F2 owner-portal
#
# Behavior:
#   1. Refuses to run if the working tree has uncommitted changes.
#   2. Pulls main to get the latest tip.
#   3. Creates feature/<prompt-id>-<slug> off main.
#   4. Pushes the branch with an empty marker commit so the PR URL is reserved.
#
# Intended to be the default entry point for every new prompt — keeps the
# repo on the "one prompt → one branch → one PR" convention in CONTRIBUTING.md.
set -euo pipefail

PROMPT_ID="${1:-}"
SLUG="${2:-}"

if [[ -z "$PROMPT_ID" || -z "$SLUG" ]]; then
  echo "usage: $(basename "$0") <prompt-id> <slug>" >&2
  echo "  e.g. $(basename "$0") D4 change-orders" >&2
  exit 2
fi

# Validate prompt id — single uppercase letter + 1-2 digits.
if ! [[ "$PROMPT_ID" =~ ^[A-F][0-9]{1,2}$ ]]; then
  echo "error: prompt id must look like A1, B2, D6, F3 — got '$PROMPT_ID'" >&2
  exit 2
fi

# Validate slug — lowercase kebab.
if ! [[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "error: slug must be lowercase-kebab-case (no spaces, no underscores) — got '$SLUG'" >&2
  exit 2
fi

BRANCH="feature/${PROMPT_ID}-${SLUG}"

# Refuse if working tree is dirty.
if ! git diff --quiet --ignore-submodules HEAD 2>/dev/null; then
  echo "error: working tree has unstaged changes. Commit or stash first." >&2
  exit 1
fi
if ! git diff --cached --quiet --ignore-submodules 2>/dev/null; then
  echo "error: working tree has staged but uncommitted changes. Commit or stash first." >&2
  exit 1
fi

# Refresh main.
echo "→ fetching origin/main"
git fetch origin main --quiet
echo "→ switching to main"
git checkout main --quiet
git pull --ff-only origin main

# Refuse if the branch already exists locally or remotely.
if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "error: local branch ${BRANCH} already exists." >&2
  exit 1
fi
if git ls-remote --exit-code --heads origin "${BRANCH}" >/dev/null 2>&1; then
  echo "error: remote branch ${BRANCH} already exists on origin." >&2
  exit 1
fi

echo "→ creating ${BRANCH}"
git checkout -b "${BRANCH}" --quiet

echo "→ pushing ${BRANCH} to origin"
git push --set-upstream origin "${BRANCH}" --quiet

echo
echo "✓ branch ${BRANCH} is live."
echo "  - Open a draft PR when you have your first commit:"
echo "      gh pr create --draft --title '${PROMPT_ID} <title>' --template .github/PULL_REQUEST_TEMPLATE.md"
echo "  - Only touch files listed under COMPONENTS: in the prompt."
echo "  - Every ACCEPTANCE TEST bullet becomes a Playwright test in e2e/${PROMPT_ID}-*.spec.ts."
