#!/usr/bin/env bash
#
# Sync MVMF vendor libraries from SceneAssembler and apply globalThis bridge lines.
#
# Usage: ./scripts/sync-vendor.sh [path-or-git-url]
#        Default: https://github.com/MetaversalCorp/SceneAssembler.git
#
# Accepts a local path or a git URL. Git URLs are shallow-cloned to a temp
# directory and cleaned up automatically.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DST_MV="$PROJECT_DIR/vendor/mv"
DEFAULT_REPO="https://github.com/MetaversalCorp/SceneAssembler.git"
SRC="${1:-$DEFAULT_REPO}"
CLEANUP=""

if [[ "$SRC" == *.git ]] || [[ "$SRC" == https://* ]] || [[ "$SRC" == git@* ]]; then
  TMPDIR="$(mktemp -d)"
  CLEANUP="$TMPDIR"
  echo "Cloning $SRC ..."
  git clone --depth 1 --filter=blob:none --sparse "$SRC" "$TMPDIR/SceneAssembler" 2>&1
  (cd "$TMPDIR/SceneAssembler" && git sparse-checkout set site/js/vendor/mv 2>&1)
  SRC="$TMPDIR/SceneAssembler"
fi

SRC_MV="$SRC/site/js/vendor/mv"

if [ ! -d "$SRC_MV" ]; then
  echo "Error: Source directory not found: $SRC_MV"
  [ -n "$CLEANUP" ] && rm -rf "$CLEANUP"
  exit 1
fi

echo "Syncing from: $SRC_MV"
echo "         to:  $DST_MV"
echo ""

for src_file in "$SRC_MV"/MV*.js; do
  # Skip minified files
  [[ "$src_file" == *.min.js ]] && continue
  file="$(basename "$src_file")"
  dst_file="$DST_MV/$file"

  cp "$src_file" "$dst_file"

  if [ "$file" = "MVMF.js" ]; then
    # MVMF defines MV — export it to globalThis so it's accessible across ES module boundaries
    printf '\nglobalThis.MV = MV;\n' >> "$dst_file"
  fi

  echo "  OK    $file"
done

echo ""

# Print version summary
echo "Versions:"
for dst_file in "$DST_MV"/MV*.js; do
  name="$(basename "${dst_file%.js}")"
  ver=$(grep -oE "'[0-9]+\.[0-9]+\.[0-9]+'" "$dst_file" | head -1 | tr -d "'" || true)
  if [ -n "$ver" ]; then
    echo "  $name $ver"
  fi
done

[ -n "$CLEANUP" ] && rm -rf "$CLEANUP"

echo ""
echo "Done. Review changes with: git diff vendor/mv/"
