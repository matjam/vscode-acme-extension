#!/bin/bash

set -euo pipefail

# Interactive installer to symlink this repo into VS Code and/or Cursor extensions directories

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_NAME="matjam.acme-assembler"

VSCODE_EXT_DIR="${HOME}/.vscode/extensions"
CURSOR_EXT_DIR="${HOME}/.cursor/extensions"

SELECTION=""
FORCE="false"
ASSUME_YES="false"

print_usage() {
  echo "Install this extension by creating symlinks into IDE extensions folders"
  echo
  echo "Usage: $0 [--vscode] [--cursor] [--both] [--force] [-y|--yes]"
  echo "       $0  (interactive)"
  echo
  echo "Options:"
  echo "  --vscode        Install for VS Code only"
  echo "  --cursor        Install for Cursor only"
  echo "  --both          Install for both VS Code and Cursor"
  echo "  --force         Overwrite existing destination if present"
  echo "  -y, --yes       Assume 'both' and overwrite prompts where applicable"
}

link_extension() {
  local dest_dir="$1"
  local dest_path="${dest_dir}/${REPO_NAME}"

  mkdir -p "${dest_dir}"

  if [ -e "${dest_path}" ] || [ -L "${dest_path}" ]; then
    if [ "${FORCE}" = "true" ]; then
      rm -rf "${dest_path}"
    else
      echo "Destination already exists: ${dest_path}"
      if [ "${ASSUME_YES}" = "true" ]; then
        rm -rf "${dest_path}"
      else
        read -r -p "Overwrite it? [y/N] " resp
        case "${resp:-}" in
          y|Y) rm -rf "${dest_path}" ;;
          *) echo "Skipped ${dest_path}"; return 0 ;;
        esac
      fi
    fi
  fi

  ln -s "${SCRIPT_DIR}" "${dest_path}"
  echo "Linked ${dest_path} -> ${SCRIPT_DIR}"
}

# Parse flags
while [ $# -gt 0 ]; do
  case "$1" in
    --vscode) SELECTION="vscode" ; shift ;;
    --cursor) SELECTION="cursor" ; shift ;;
    --both)   SELECTION="both" ; shift ;;
    --force)  FORCE="true" ; shift ;;
    -y|--yes) ASSUME_YES="true" ; [ -z "${SELECTION}" ] && SELECTION="both" ; FORCE="true" ; shift ;;
    -h|--help) print_usage ; exit 0 ;;
    *) echo "Unknown option: $1" ; print_usage ; exit 1 ;;
  esac
done

if [ -z "${SELECTION}" ]; then
  echo "Install for:"
  echo "  [v] VS Code"
  echo "  [c] Cursor"
  echo "  [b] Both"
  echo "  [n] Cancel"
  read -r -p "Choose (v/c/b/n) [b]: " choice
  case "${choice:-b}" in
    v|V) SELECTION="vscode" ;;
    c|C) SELECTION="cursor" ;;
    b|B) SELECTION="both" ;;
    n|N) echo "Cancelled" ; exit 0 ;;
    *) SELECTION="both" ;;
  esac
fi

case "${SELECTION}" in
  vscode)
    echo "Installing for VS Code..."
    link_extension "${VSCODE_EXT_DIR}"
    ;;
  cursor)
    echo "Installing for Cursor..."
    link_extension "${CURSOR_EXT_DIR}"
    ;;
  both)
    echo "Installing for VS Code and Cursor..."
    link_extension "${VSCODE_EXT_DIR}"
    link_extension "${CURSOR_EXT_DIR}"
    ;;
  *)
    echo "Unknown selection: ${SELECTION}"
    exit 1
    ;;
esac

echo "Done. Restart the IDE(s) if they were running."


