"""Authentication commands for TickTick CLI."""

from typing import Annotated

import typer

from ticktick_cli import config, output

app = typer.Typer(help="Manage authentication")


@app.command()
def login(
    username: Annotated[
        str | None,
        typer.Option("--username", "-u", help="TickTick username/email"),
    ] = None,
    password: Annotated[
        str | None,
        typer.Option("--password", "-p", help="TickTick password", hide_input=True),
    ] = None,
    totp_secret: Annotated[
        str | None,
        typer.Option("--totp-secret", help="TOTP secret for 2FA (base32 encoded)"),
    ] = None,
) -> None:
    """Log in to TickTick.

    Prompts for username and password if not provided.
    Handles 2FA if enabled on the account.
    """
    from pyticktick import Client
    from pyticktick.settings import Settings

    # Prompt for credentials if not provided
    if not username:
        username = typer.prompt("Username/Email")
    if not password:
        password = typer.prompt("Password", hide_input=True)

    output.print_info("Logging in to TickTick...")

    try:
        # Create settings and attempt login
        settings = Settings(
            v2_username=username,
            v2_password=password,
            v2_totp_secret=totp_secret,
        )
        client = Client(settings=settings)

        # Get the token from the client's session
        # The token is set after successful sign-on
        token = settings.v2_token

        if not token:
            output.print_error("Login failed: No token received")
            raise typer.Exit(1)

        # Save credentials
        config.set_auth(username, token)

        # Verify by fetching profile
        profile = client.get_user_profile_v2()
        output.print_success(f"Logged in as {profile.name or profile.username}")

    except Exception as e:
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


@app.command()
def logout() -> None:
    """Log out from TickTick.

    Clears stored credentials.
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
                },
                ["Name", "Email", "User ID"],
            )
    except Exception as e:
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
