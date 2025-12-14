"""Common error handling for CLI commands."""

from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, TypeVar

import typer
from httpx import HTTPStatusError

from ticktick_cli import output
from ticktick_cli.client import AuthenticationError, ClientError

P = ParamSpec("P")
T = TypeVar("T")


def handle_client_error(func: Callable[P, T]) -> Callable[P, T]:
    """Decorator to handle client errors consistently across CLI commands.

    Catches authentication errors, client errors, and HTTP errors,
    printing appropriate error messages and exiting with code 1.
    """

    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        try:
            return func(*args, **kwargs)
        except AuthenticationError as e:
            output.print_error(str(e))
            raise typer.Exit(1)
        except ClientError as e:
            output.print_error(str(e))
            raise typer.Exit(1)
        except HTTPStatusError as e:
            output.print_error(
                f"HTTP error: {e.response.status_code} - {e.response.text[:100]}"
            )
            raise typer.Exit(1)
        except ConnectionError as e:
            output.print_error(f"Connection error: {e}")
            raise typer.Exit(1)
        except ValueError as e:
            output.print_error(f"Invalid value: {e}")
            raise typer.Exit(1)

    return wrapper
