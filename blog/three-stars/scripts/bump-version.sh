#!/bin/sh
# Sets the footer version (YYYYMMDD.N) when a commit touches three-stars. Run from repo root by .git/hooks/pre-commit.
# Note: re-stages all of index.html, including any unstaged edits to it.

dir=blog/three-stars
f=$dir/index.html
git diff --cached --quiet -- "$dir" && exit 0

today=$(date +%Y%m%d)
cur=$(sed -n 's/.*id="version">\([0-9]*\)\.\([0-9]*\)<.*/\1 \2/p' "$f")
set -- $cur
if [ "$1" = "$today" ]; then n=$(($2 + 1)); else n=0; fi

sed -i "s/id=\"version\">[^<]*</id=\"version\">$today.$n</" "$f"
git add "$f"
