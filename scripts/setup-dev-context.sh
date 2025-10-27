#!/usr/bin/env bash
set -e

# Script to checkout or update the dev-context repository
# This is called automatically by Claude Code's SessionStart hook

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
DEV_CONTEXT_DIR="${PROJECT_DIR}/dev-context"
DEV_CONTEXT_REPO="https://github.com/rayners/dev-context.git"

echo "Setting up dev-context..."

if [ -d "${DEV_CONTEXT_DIR}/.git" ]; then
  echo "dev-context already exists, pulling latest changes..."
  cd "${DEV_CONTEXT_DIR}"
  git pull --quiet origin main 2>&1 | head -5 || echo "Failed to pull, continuing with existing version"
else
  echo "Cloning dev-context repository..."
  git clone --quiet --depth 1 "${DEV_CONTEXT_REPO}" "${DEV_CONTEXT_DIR}" 2>&1 | head -5 || {
    echo "Failed to clone dev-context repository"
    exit 1
  }
fi

echo "dev-context setup complete"
