"""Project group commands for TickTick CLI."""

from typing import Annotated

import typer

from ticktick_cli import output
from ticktick_cli.client import AuthenticationError, ClientError, get_client

app = typer.Typer(help="Manage project groups")


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


@app.command("list")
@handle_client_error
def list_groups(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """List all project groups."""
    client = get_client()
    groups = client.get_project_groups()

    if json_output:
        output.print_json(groups)
    elif not groups:
        output.print_info("No project groups found")
    else:
        table = output.create_table("ID", "Name")
        for group in groups:
            table.add_row(
                output.truncate_id(group.get("id", "")),
                group.get("name", ""),
            )
        output.print_table(table)


@app.command("add")
@handle_client_error
def add_group(
    name: Annotated[str, typer.Argument(help="Group name")],
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Create a new project group."""
    client = get_client()
    group = client.create_project_group(name=name)

    if json_output:
        output.print_json(group)
    else:
        output.print_success(f"Created group: {group.get('id', 'unknown')}")


@app.command("edit")
@handle_client_error
def edit_group(
    group_id: Annotated[str, typer.Argument(help="Group ID")],
    name: Annotated[
        str | None,
        typer.Option("--name", "-n", help="New name"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Edit an existing project group."""
    client = get_client()

    kwargs = {}
    if name:
        kwargs["name"] = name

    if not kwargs:
        output.print_error("No fields to update")
        raise typer.Exit(1)

    group = client.update_project_group(group_id, **kwargs)

    if json_output:
        output.print_json(group)
    else:
        output.print_success(f"Updated group: {group_id}")


@app.command("delete")
@handle_client_error
def delete_group(
    group_ids: Annotated[list[str], typer.Argument(help="Group ID(s) to delete")],
    force: Annotated[
        bool,
        typer.Option("--force", "-f", help="Skip confirmation"),
    ] = False,
) -> None:
    """Delete project group(s)."""
    if not force:
        confirm = typer.confirm(f"Delete {len(group_ids)} group(s)?")
        if not confirm:
            output.print_info("Cancelled")
            return

    client = get_client()
    client.delete_project_groups(group_ids)
    output.print_success(f"Deleted {len(group_ids)} group(s)")
