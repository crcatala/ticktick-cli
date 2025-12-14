"""Sync command for TickTick CLI."""

from typing import Annotated

import typer

from ticktick_cli import output
from ticktick_cli.client import AuthenticationError, ClientError, get_client

app = typer.Typer(help="Sync operations")


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


@app.callback(invoke_without_command=True)
@handle_client_error
def sync(
    ctx: typer.Context,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Fetch full state snapshot from TickTick.

    Returns all tasks, projects, tags, and other data in a single request.
    Useful for syncing or backup purposes.
    """
    if ctx.invoked_subcommand is not None:
        return

    client = get_client()
    data = client.get_batch()

    if json_output:
        output.print_json(data)
    else:
        # Provide a summary instead of dumping everything
        tasks = data.get("syncTaskBean", {}).get("update", []) or []
        projects = data.get("projectProfiles", []) or []
        tags = data.get("tags", []) or []
        groups = data.get("projectGroups", []) or []

        output.print_info("Sync complete. Summary:")
        output.print_key_value(
            {
                "Tasks": str(len(tasks)),
                "Projects": str(len(projects)),
                "Tags": str(len(tags)),
                "Project Groups": str(len(groups)),
            },
            ["Tasks", "Projects", "Tags", "Project Groups"],
        )
        output.print_info("\nUse --json for full data export.")
