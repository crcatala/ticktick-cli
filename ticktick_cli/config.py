"""Configuration management for TickTick CLI.

Handles reading and writing configuration to ~/.config/ticktick-cli/config.toml
"""

import tomllib
from pathlib import Path
from typing import Any

import tomli_w

CONFIG_DIR = Path.home() / ".config" / "ticktick-cli"
CONFIG_FILE = CONFIG_DIR / "config.toml"


def ensure_config_dir() -> None:
    """Ensure the config directory exists."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


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
    """Save configuration to file.

    Args:
        config: Configuration dictionary to save.
    """
    ensure_config_dir()
    with CONFIG_FILE.open("wb") as f:
        tomli_w.dump(config, f)


def get_auth() -> dict[str, str] | None:
    """Get authentication configuration.

    Returns:
        Auth dict with 'username' and 'token' keys, or None if not configured.
    """
    config = load_config()
    auth = config.get("auth", {})
    if auth.get("username") and auth.get("token"):
        return auth
    return None


def set_auth(username: str, token: str) -> None:
    """Set authentication configuration.

    Args:
        username: TickTick username/email.
        token: Session token from v2 API.
    """
    config = load_config()
    config["auth"] = {"username": username, "token": token}
    save_config(config)


def clear_auth() -> None:
    """Clear authentication configuration."""
    config = load_config()
    config.pop("auth", None)
    save_config(config)


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
