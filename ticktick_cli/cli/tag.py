"""Tag commands for TickTick CLI."""

from typing import Annotated

import typer

from ticktick_cli import output
from ticktick_cli.cli.errors import handle_client_error
from ticktick_cli.client import get_client

app = typer.Typer(help="Manage tags")


@app.command("list")
@handle_client_error
def list_tags(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """List all tags."""
    client = get_client()
    tags = client.get_tags()

    if json_output:
        output.print_json(tags)
    elif not tags:
        output.print_info("No tags found")
    else:
        output.print_tags_table(tags)


@app.command("add")
@handle_client_error
def add_tag(
    name: Annotated[str, typer.Argument(help="Tag name")],
    color: Annotated[
        str | None,
        typer.Option("--color", "-c", help="Hex color code"),
    ] = None,
    parent: Annotated[
        str | None,
        typer.Option("--parent", "-p", help="Parent tag name (for hierarchical tags)"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Create a new tag."""
    client = get_client()

    kwargs = {"name": name}
    if color:
        kwargs["color"] = color
    if parent:
        kwargs["parent"] = parent

    tag = client.create_tag(**kwargs)

    if json_output:
        output.print_json(tag)
    else:
        output.print_success(f"Created tag: {name}")


@app.command("rename")
@handle_client_error
def rename_tag(
    old_name: Annotated[str, typer.Argument(help="Current tag name")],
    new_name: Annotated[str, typer.Argument(help="New tag name")],
) -> None:
    """Rename a tag."""
    client = get_client()
    client.rename_tag(old_name, new_name)
    output.print_success(f"Renamed '{old_name}' to '{new_name}'")


@app.command("edit")
@handle_client_error
def edit_tag(
    name: Annotated[str, typer.Argument(help="Tag name")],
    color: Annotated[
        str | None,
        typer.Option("--color", "-c", help="New hex color code"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Edit an existing tag."""
    client = get_client()

    kwargs = {}
    if color:
        kwargs["color"] = color

    if not kwargs:
        output.print_error("No fields to update")
        raise typer.Exit(1)

    tag = client.update_tag(name, **kwargs)

    if json_output:
        output.print_json(tag)
    else:
        output.print_success(f"Updated tag: {name}")


@app.command("delete")
@handle_client_error
def delete_tag(
    names: Annotated[list[str], typer.Argument(help="Tag name(s) to delete")],
    force: Annotated[
        bool,
        typer.Option("--force", "-f", help="Skip confirmation"),
    ] = False,
) -> None:
    """Delete tag(s)."""
    if not force:
        confirm = typer.confirm(f"Delete {len(names)} tag(s)?")
        if not confirm:
            output.print_info("Cancelled")
            return

    client = get_client()
    for name in names:
        client.delete_tag(name)
        output.print_success(f"Deleted: {name}")
