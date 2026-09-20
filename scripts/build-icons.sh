#!/usr/bin/env bash
# Regenerates every launcher/splash asset from design/logo.svg.
#
# The mark is one silhouette: a filled bowl, plus a checkmark stroked wide in
# the same colour so its overshoot reads as a spoon handle leaving the rim,
# then stroked again narrower as a mask cut-out so the spoon's interior is
# genuinely transparent rather than painted with the background colour.
#
# Requires rsvg-convert (brew install librsvg).
set -euo pipefail
cd "$(dirname "$0")/.."
out=assets/images
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

BOWL="M15 47 H85 C85 71 71 84 50 84 C29 84 15 71 15 47 Z"
CHECK="M31 55 L45 70 L77 26"
PAPRIKA="#C0532B"
BLUSH="#F7E5DA"

# emit <svg> — $1 scale, $2 mark colour, $3 background colour (or "none"), $4 viewBox
emit() {
  local scale=$1 fg=$2 bg=$3 vb=$4
  cat <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="$vb">
  $([ "$bg" = none ] || echo "<rect x=\"-50\" y=\"-50\" width=\"200\" height=\"200\" fill=\"$bg\"/>")
  <mask id="cut" maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">
    <rect x="-50" y="-50" width="200" height="200" fill="black"/>
    <path d="$BOWL" fill="white"/>
    <path d="$CHECK" fill="none" stroke="white" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="$CHECK" fill="none" stroke="black" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </mask>
  <g transform="translate(50 50) scale($scale) translate(-50 -51.5)">
    <rect x="-50" y="-50" width="200" height="200" fill="$fg" mask="url(#cut)"/>
  </g>
</svg>
EOF
}

render() { rsvg-convert -w "$2" -h "$2" "$1" -o "$3"; }

# Full-bleed tile: Play Store listing and the generic icon slot.
emit 0.92 "$PAPRIKA" "$BLUSH" "0 0 100 100" > "$tmp/icon.svg"
render "$tmp/icon.svg" 1024 "$out/icon.png"
render "$tmp/icon.svg" 196 "$out/favicon.png"

# Adaptive icon: foreground must sit inside the central 66dp of 108dp, so the
# mark is scaled to 0.65 — any larger and a circular launcher mask clips the
# spoon handle.
emit 0.65 "$PAPRIKA" none "0 0 100 100" > "$tmp/fg.svg"
render "$tmp/fg.svg" 432 "$out/android-icon-foreground.png"
emit 0.65 "#000000" none "0 0 100 100" > "$tmp/mono.svg"
render "$tmp/mono.svg" 432 "$out/android-icon-monochrome.png"
rsvg-convert -w 432 -h 432 \
  <(printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="%s"/></svg>' "$BLUSH") \
  -o "$out/android-icon-background.png"

# Splash: cropped to the mark, drawn on transparency so the configured splash
# background (light or dark) shows through the spoon.
emit 1 "$PAPRIKA" none "12 15 76 72" > "$tmp/splash.svg"
rsvg-convert -w 512 "$tmp/splash.svg" -o "$out/splash-icon.png"

printf 'wrote:\n'
for f in icon favicon android-icon-foreground android-icon-monochrome android-icon-background splash-icon; do
  printf '  %s\n' "$out/$f.png"
done
