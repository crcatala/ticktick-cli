#!/usr/bin/env bash
#
# ticktick-cli installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/crcatala/ticktick-cli/main/scripts/install.sh | bash
#
# Options (via environment variables):
#   VERSION      - Specific version to install (default: latest)
#   INSTALL_DIR  - Installation directory (default: ~/.local/bin or /usr/local/bin)
#
# Examples:
#   # Install latest
#   curl -fsSL https://raw.githubusercontent.com/crcatala/ticktick-cli/main/scripts/install.sh | bash
#
#   # Install specific version
#   curl -fsSL https://raw.githubusercontent.com/crcatala/ticktick-cli/main/install.sh | VERSION=v0.1.0 bash
#
#   # Install to custom directory
#   curl -fsSL https://raw.githubusercontent.com/crcatala/ticktick-cli/main/install.sh | INSTALL_DIR=/opt/bin bash

set -euo pipefail

REPO="crcatala/ticktick-cli"
BINARY_NAME="ticktick"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
  echo -e "${BLUE}==>${NC} $1"
}

success() {
  echo -e "${GREEN}==>${NC} $1"
}

warn() {
  echo -e "${YELLOW}==>${NC} $1"
}

error() {
  echo -e "${RED}==>${NC} $1" >&2
  exit 1
}

# Detect OS
detect_os() {
  local os
  os="$(uname -s)"
  case "$os" in
    Darwin) echo "darwin" ;;
    Linux) echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) error "Unsupported operating system: $os" ;;
  esac
}

# Detect architecture
detect_arch() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) echo "x64" ;;
    arm64|aarch64) echo "arm64" ;;
    *) error "Unsupported architecture: $arch" ;;
  esac
}

# Detect if running on musl (Alpine Linux)
detect_libc() {
  if [ "$(detect_os)" != "linux" ]; then
    echo ""
    return
  fi
  
  # Check for musl
  if ldd --version 2>&1 | grep -q musl; then
    echo "-musl"
  elif [ -f /etc/alpine-release ]; then
    echo "-musl"
  else
    echo ""
  fi
}

# Get the latest release version from GitHub
get_latest_version() {
  local url="https://api.github.com/repos/${REPO}/releases/latest"
  
  if command -v curl &> /dev/null; then
    curl -fsSL "$url" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/'
  elif command -v wget &> /dev/null; then
    wget -qO- "$url" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/'
  else
    error "Neither curl nor wget found. Please install one of them."
  fi
}

# Download file
download() {
  local url="$1"
  local dest="$2"
  
  if command -v curl &> /dev/null; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget &> /dev/null; then
    wget -q "$url" -O "$dest"
  else
    error "Neither curl nor wget found. Please install one of them."
  fi
}

# Determine install directory
get_install_dir() {
  if [ -n "${INSTALL_DIR:-}" ]; then
    echo "$INSTALL_DIR"
    return
  fi
  
  # Prefer ~/.local/bin if it exists or can be created
  local local_bin="$HOME/.local/bin"
  if [ -d "$local_bin" ] || mkdir -p "$local_bin" 2>/dev/null; then
    echo "$local_bin"
    return
  fi
  
  # Fall back to /usr/local/bin (may require sudo)
  echo "/usr/local/bin"
}

# Check if directory is in PATH
check_path() {
  local dir="$1"
  if [[ ":$PATH:" != *":$dir:"* ]]; then
    warn "$dir is not in your PATH"
    echo ""
    echo "Add it to your shell configuration:"
    echo ""
    if [[ "$SHELL" == *"zsh"* ]]; then
      echo "  echo 'export PATH=\"$dir:\$PATH\"' >> ~/.zshrc"
      echo "  source ~/.zshrc"
    elif [[ "$SHELL" == *"fish"* ]]; then
      echo "  fish_add_path $dir"
    else
      echo "  echo 'export PATH=\"$dir:\$PATH\"' >> ~/.bashrc"
      echo "  source ~/.bashrc"
    fi
    echo ""
  fi
}

main() {
  info "Installing ticktick-cli..."
  
  # Detect platform
  local os arch libc platform
  os="$(detect_os)"
  arch="$(detect_arch)"
  libc="$(detect_libc)"
  platform="${os}-${arch}${libc}"
  
  info "Detected platform: $platform"
  
  # Get version
  local version="${VERSION:-}"
  if [ -z "$version" ]; then
    info "Fetching latest version..."
    version="$(get_latest_version)"
  fi
  
  if [ -z "$version" ]; then
    error "Could not determine version to install"
  fi
  
  info "Installing version: $version"
  
  # Determine file extension
  local ext="tar.gz"
  if [ "$os" = "windows" ]; then
    ext="zip"
  fi
  
  # Build download URL
  local filename="${BINARY_NAME}-${platform}.${ext}"
  local url="https://github.com/${REPO}/releases/download/${version}/${filename}"
  
  info "Downloading from: $url"
  
  # Create temp directory
  local tmpdir
  tmpdir="$(mktemp -d)"
  trap "rm -rf '$tmpdir'" EXIT
  
  # Download archive
  local archive="${tmpdir}/${filename}"
  download "$url" "$archive"
  
  # Extract
  info "Extracting..."
  if [ "$ext" = "tar.gz" ]; then
    tar -xzf "$archive" -C "$tmpdir"
  else
    unzip -q "$archive" -d "$tmpdir"
  fi
  
  # Find binary
  local binary_name="$BINARY_NAME"
  if [ "$os" = "windows" ]; then
    binary_name="${BINARY_NAME}.exe"
  fi
  
  local binary="${tmpdir}/${binary_name}"
  if [ ! -f "$binary" ]; then
    error "Binary not found in archive"
  fi
  
  # Determine install location
  local install_dir
  install_dir="$(get_install_dir)"
  local install_path="${install_dir}/${binary_name}"
  
  info "Installing to: $install_path"
  
  # Create install directory if needed
  if [ ! -d "$install_dir" ]; then
    mkdir -p "$install_dir" || sudo mkdir -p "$install_dir"
  fi
  
  # Install binary
  if [ -w "$install_dir" ]; then
    mv "$binary" "$install_path"
    chmod +x "$install_path"
  else
    sudo mv "$binary" "$install_path"
    sudo chmod +x "$install_path"
  fi
  
  success "Successfully installed ticktick-cli ${version}!"
  echo ""
  
  # Check PATH
  check_path "$install_dir"
  
  # Verify installation
  if command -v "$BINARY_NAME" &> /dev/null; then
    info "Verify installation:"
    "$BINARY_NAME" --version || true
  else
    info "Run 'ticktick --version' to verify the installation"
  fi
  
  echo ""
  success "Done! Run 'ticktick --help' to get started."
}

main "$@"
