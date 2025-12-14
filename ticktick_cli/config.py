"""Configuration management for TickTick CLI.

Handles reading and writing configuration to ~/.config/ticktick-cli/config.toml.
Supports both secure keyring storage (default) and plaintext config storage.
"""

import stat
import tomllib
from pathlib import Path
from typing import Any

import keyring
import tomli_w

CONFIG_DIR = Path.home() / ".config" / "ticktick-cli"
CONFIG_FILE = CONFIG_DIR / "config.toml"
KEYRING_SERVICE = "ticktick-cli"


def ensure_config_dir() -> None:
    """Ensure the config directory exists with secure permissions (700)."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    # Set directory permissions to 700 (owner read/write/execute only)
    CONFIG_DIR.chmod(stat.S_IRWXU)


def _secure_file_permissions() -> None:
    """Ensure config file has secure permissions (600)."""
    if CONFIG_FILE.exists():
        CONFIG_FILE.chmod(stat.S_IRUSR | stat.S_IWUSR)


def load_config() -> dict[str, Any]:
    """Load configuration from file.

    Returns:
        Configuration dictionary, or empty dict if no config exists.
    """
    if not CONFIG_FILE.exists():
        return {}

    with CONFIG_FILE.open("rb") as f:
        return tomllib.load(f)


def save_config(config: dict[str, Any]) -> None:
    """Save configuration to file with secure permissions.

    Args:
        config: Configuration dictionary to save.
    """
    ensure_config_dir()

    # Create file with secure permissions if it doesn't exist
    if not CONFIG_FILE.exists():
        CONFIG_FILE.touch(mode=stat.S_IRUSR | stat.S_IWUSR)

    with CONFIG_FILE.open("wb") as f:
        tomli_w.dump(config, f)

    _secure_file_permissions()


def is_using_keyring() -> bool:
    """Check if current auth is stored in keyring.

    Returns:
        True if using keyring, False if using plaintext config.
    """
    config = load_config()
    auth = config.get("auth", {})
    return auth.get("storage") == "keyring"


def is_using_config() -> bool:
    """Check if current auth is stored in plaintext config.

    Returns:
        True if using plaintext config, False otherwise.
    """
    config = load_config()
    auth = config.get("auth", {})
    return auth.get("storage") == "config" and "token" in auth


def get_auth() -> dict[str, str] | None:
    """Get authentication configuration.

    Checks keyring first, then falls back to plaintext config.

    Returns:
        Auth dict with 'username' and 'token' keys, or None if not configured.
    """
    config = load_config()
    auth = config.get("auth", {})
    username = auth.get("username")

    if not username:
        return None

    storage = auth.get("storage", "keyring")

    if storage == "keyring":
        # Try to get token from keyring
        token = keyring.get_password(KEYRING_SERVICE, username)
        if token:
            return {"username": username, "token": token}
        return None
    elif storage == "config":
        # Get token from plaintext config
        token = auth.get("token")
        if token:
            return {"username": username, "token": token}
        return None

    return None


def set_auth(username: str, token: str, use_config: bool = False) -> None:
    """Set authentication configuration.

    Args:
        username: TickTick username/email.
        token: Session token from v2 API.
        use_config: If True, store token in plaintext config (less secure).
                   If False (default), store in system keyring.
    """
    config = load_config()

    if use_config:
        # Store token in plaintext config (less secure)
        config["auth"] = {
            "username": username,
            "token": token,
            "storage": "config",
        }
    else:
        # Store token in keyring (secure)
        keyring.set_password(KEYRING_SERVICE, username, token)
        config["auth"] = {
            "username": username,
            "storage": "keyring",
        }

    save_config(config)


def clear_auth() -> None:
    """Clear authentication configuration from both keyring and config."""
    config = load_config()
    auth = config.get("auth", {})
    username = auth.get("username")

    # Clear from keyring if username exists
    if username:
        try:
            keyring.delete_password(KEYRING_SERVICE, username)
        except keyring.errors.PasswordDeleteError:
            pass  # Token wasn't in keyring

    # Clear from config
    config.pop("auth", None)
    save_config(config)


def get_storage_type() -> str | None:
    """Get the current authentication storage type.

    Returns:
        'keyring', 'config', or None if not authenticated.
    """
    config = load_config()
    auth = config.get("auth", {})
    if not auth.get("username"):
        return None
    return auth.get("storage", "keyring")


def get_default_project() -> str | None:
    """Get default project for new tasks.

    Returns:
        Default project ID, or None if not configured.
    """
    config = load_config()
    return config.get("defaults", {}).get("project")


def set_default_project(project_id: str | None) -> None:
    """Set default project for new tasks.

    Args:
        project_id: Project ID to use as default, or None to clear.
    """
    config = load_config()
    if project_id:
        config.setdefault("defaults", {})["project"] = project_id
    else:
        config.get("defaults", {}).pop("project", None)
        if not config.get("defaults"):
            config.pop("defaults", None)
    save_config(config)
