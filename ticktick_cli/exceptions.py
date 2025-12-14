"""Custom exceptions for TickTick CLI."""


class TickTickCLIError(Exception):
    """Base exception for TickTick CLI."""

    pass


class ConfigError(TickTickCLIError):
    """Error related to configuration."""

    pass


class AuthError(TickTickCLIError):
    """Error related to authentication."""

    pass
