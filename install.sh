#!/bin/sh
# Installs the latest libgen-dl release. Re-run to update.
#   curl -fsSL https://raw.githubusercontent.com/Jaxx497/libgen-dl/master/install.sh | sh
# LIBGEN_DL_DIR changes where it goes (default ~/.local/bin).
set -eu

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) asset=libgen-dl-linux-x64 ;;
  Linux-aarch64 | Linux-arm64) asset=libgen-dl-linux-arm64 ;;
  Darwin-arm64) asset=libgen-dl-macos-arm64 ;;
  *) echo "No prebuilt binary for $(uname -s) $(uname -m) (Intel Macs have no prebuilt binary); see the README to build from source." >&2; exit 1 ;;
esac

dir="${LIBGEN_DL_DIR:-$HOME/.local/bin}"
mkdir -p "$dir"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

echo "Downloading $asset..."
curl -fL --progress-bar -o "$tmp" "https://github.com/Jaxx497/libgen-dl/releases/latest/download/$asset"
chmod +x "$tmp"
mv "$tmp" "$dir/libgen-dl"
ln -sf libgen-dl "$dir/lgd"

echo "Installed $dir/libgen-dl"
case ":$PATH:" in
  *":$dir:"*) ;;
  *) echo "Add $dir to your PATH to run it as 'libgen-dl'." ;;
esac
