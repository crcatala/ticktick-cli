"""User commands for TickTick CLI."""

from typing import Annotated

import typer

from ticktick_cli import output
from ticktick_cli.client import AuthenticationError, ClientError, get_client

app = typer.Typer(help="View user information")


def handle_client_error(func):
    """Decorator to handle client errors."""
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except AuthenticationError as e:
            output.print_error(str(e))
            raise typer.Exit(1)
        except ClientError as e:
            output.print_error(str(e))
            raise typer.Exit(1)

    return wrapper


@app.command("profile")
@handle_client_error
def profile(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show user profile information."""
    client = get_client()
    data = client.get_profile()

    if json_output:
        output.print_json(data)
    else:
        output.print_key_value(
            {
                "ID": data.get("id", "-"),
                "Name": data.get("name", "-"),
                "Username": data.get("username", "-"),
                "Email": data.get("username", "-"),
                "Time Zone": data.get("timeZone", "-"),
            },
            ["ID", "Name", "Username", "Email", "Time Zone"],
        )


@app.command("status")
@handle_client_error
def status(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show subscription/premium status."""
    client = get_client()
    data = client.get_user_status()

    if json_output:
        output.print_json(data)
    else:
        is_pro = data.get("proLevel", 0) > 0
        pro_end = data.get("proEndDate")

        output.print_key_value(
            {
                "Pro Status": "Active" if is_pro else "Free",
                "Pro Level": str(data.get("proLevel", 0)),
                "Pro End Date": output.format_date(pro_end) if pro_end else "-",
            },
            ["Pro Status", "Pro Level", "Pro End Date"],
        )


@app.command("stats")
@handle_client_error
def stats(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show usage statistics."""
    client = get_client()
    data = client.get_user_stats()

    if json_output:
        output.print_json(data)
    else:
        output.print_key_value(
            {
                "Tasks Completed": str(data.get("completedCount", 0)),
                "Tasks Created": str(data.get("createdCount", 0)),
                "Pomodoros": str(data.get("pomodoroCount", 0)),
                "Score": str(data.get("score", 0)),
            },
            ["Tasks Completed", "Tasks Created", "Pomodoros", "Score"],
        )
