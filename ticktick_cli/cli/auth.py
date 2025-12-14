"""Authentication commands for TickTick CLI."""

from typing import Annotated

import typer
from httpx import HTTPStatusError
from pydantic import ValidationError

from ticktick_cli import config, output

app = typer.Typer(help="Manage authentication")


def _enable_http_logging() -> None:
    """Enable verbose HTTP request/response logging for debugging."""
    import httpx

    _original_send = httpx.Client.send

    def _logging_send(self, request, **kwargs):
        output.print_info(f"\n>>> {request.method} {request.url}")
        output.print_info(f"    Headers: {dict(request.headers)}")

        response = _original_send(self, request, **kwargs)

        output.print_info(f"<<< {response.status_code}")
        if response.status_code >= 400:
            output.print_info(f"    Response: {response.text[:500]}")

        return response

    httpx.Client.send = _logging_send


@app.command()
def login(
    username: Annotated[
        str | None,
        typer.Option("--username", "-u", help="TickTick username/email"),
    ] = None,
    totp_secret: Annotated[
        str | None,
        typer.Option("--totp-secret", help="TOTP secret for 2FA (base32 encoded)"),
    ] = None,
    use_config: Annotated[
        bool,
        typer.Option(
            "--use-config",
            help="Store token in plaintext config instead of keyring (insecure)",
        ),
    ] = False,
    verbose: Annotated[
        bool,
        typer.Option("--verbose", "-v", help="Show HTTP request/response details"),
    ] = False,
) -> None:
    """Log in to TickTick.

    Prompts for username and password interactively.
    Handles 2FA if enabled on the account.

    By default, stores the session token in your system keyring for security.
    Use --use-config to store in plaintext config file instead (not recommended).
    """
    if verbose:
        _enable_http_logging()

    from pyticktick import Client

    # Prompt for credentials interactively (never accept password via CLI args)
    if not username:
        username = typer.prompt("Username/Email")
    password = typer.prompt("Password", hide_input=True)

    if use_config:
        output.print_warning(
            "Using plaintext config storage. Token will be stored unencrypted."
        )

    output.print_info("Logging in to TickTick...")

    try:
        # Create client (Client now extends Settings directly)
        client = Client(
            v2_username=username,
            v2_password=password,
            v2_totp_secret=totp_secret,
        )

        # Get the token from the client's session
        # The token is set after successful sign-on
        token = client.v2_token

        if not token:
            output.print_error("Login failed: No token received")
            raise typer.Exit(1)

        # Save credentials (keyring by default, config if --use-config)
        config.set_auth(username, token, use_config=use_config)

        # Verify by fetching profile (may fail due to model validation issues)
        try:
            profile = client.get_profile_v2()
            display_name = profile.name or profile.username
        except ValidationError:
            # Profile fetch failed but login succeeded
            display_name = username

        output.print_success(f"Logged in as {display_name}")

        storage_type = "config file" if use_config else "system keyring"
        output.print_info(f"Token stored in: {storage_type}")

    except HTTPStatusError as e:
        output.print_error(f"HTTP error: {e.response.status_code} - {e.response.text}")
        raise typer.Exit(1)
    except ValidationError as e:
        output.print_error(f"Invalid credentials format: {e}")
        raise typer.Exit(1)
    except ValueError as e:
        error_msg = str(e)
        if "totp" in error_msg.lower() or "2fa" in error_msg.lower():
            if not totp_secret:
                output.print_error(
                    "2FA is enabled. Provide --totp-secret or use the TickTick app."
                )
            else:
                output.print_error(f"2FA verification failed: {error_msg}")
        else:
            output.print_error(f"Login failed: {error_msg}")
        raise typer.Exit(1)
    except ConnectionError as e:
        output.print_error(f"Connection error: {e}")
        raise typer.Exit(1)


@app.command()
def logout() -> None:
    """Log out from TickTick.

    Clears stored credentials from both keyring and config file.
    """
    auth = config.get_auth()
    if not auth:
        output.print_info("Not logged in")
        return

    config.clear_auth()
    output.print_success("Logged out successfully")


@app.command()
def status(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show authentication status and user info."""
    auth = config.get_auth()
    storage_type = config.get_storage_type()

    if not auth:
        if json_output:
            output.print_json({"authenticated": False})
        else:
            output.print_info("Not logged in. Run 'ticktick auth login' to log in.")
        return

    try:
        from ticktick_cli.client import get_client

        client = get_client()
        profile = client.get_profile()

        if json_output:
            output.print_json(
                {
                    "authenticated": True,
                    "username": auth["username"],
                    "storage": storage_type,
                    "profile": profile,
                }
            )
        else:
            output.print_success(f"Logged in as {auth['username']}")
            output.print_key_value(
                {
                    "Name": profile.get("name", "-"),
                    "Email": profile.get("username", "-"),
                    "User ID": profile.get("id", "-"),
                    "Token Storage": storage_type or "unknown",
                },
                ["Name", "Email", "User ID", "Token Storage"],
            )
    except ValidationError:
        # Profile model validation failed but auth is valid
        if json_output:
            output.print_json(
                {
                    "authenticated": True,
                    "username": auth["username"],
                    "storage": storage_type,
                    "profile": None,
                    "note": "Profile fetch failed due to API model mismatch",
                }
            )
        else:
            output.print_success(f"Logged in as {auth['username']}")
            output.print_key_value(
                {
                    "Token Storage": storage_type or "unknown",
                    "Note": "Profile details unavailable (API model mismatch)",
                },
                ["Token Storage", "Note"],
            )
    except HTTPStatusError as e:
        if json_output:
            output.print_json(
                {"authenticated": False, "error": f"HTTP {e.response.status_code}"}
            )
        else:
            output.print_warning(f"Token may be expired: HTTP {e.response.status_code}")
            output.print_info("Run 'ticktick auth login' to re-authenticate.")
    except (ConnectionError, ValueError) as e:
        if json_output:
            output.print_json({"authenticated": False, "error": str(e)})
        else:
            output.print_warning(f"Token may be expired: {e}")
            output.print_info("Run 'ticktick auth login' to re-authenticate.")


@app.command()
def whoami(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show current user (alias for status)."""
    status(json_output=json_output)
