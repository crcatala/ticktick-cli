"""Project commands for TickTick CLI."""

from typing import Annotated

import typer

from ticktick_cli import output
from ticktick_cli.client import AuthenticationError, ClientError, get_client

app = typer.Typer(help="Manage projects")


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
def list_projects(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """List all projects."""
    client = get_client()
    projects = client.get_projects()

    if json_output:
        output.print_json(projects)
    elif not projects:
        output.print_info("No projects found")
    else:
        output.print_projects_table(projects)


@app.command("show")
@handle_client_error
def show_project(
    project_id: Annotated[str, typer.Argument(help="Project ID")],
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show details of a specific project."""
    client = get_client()
    projects = client.get_projects()

    # Find project by ID (supports partial match)
    project = None
    for p in projects:
        if p.get("id", "").startswith(project_id):
            project = p
            break

    if not project:
        output.print_error(f"Project not found: {project_id}")
        raise typer.Exit(1)

    if json_output:
        output.print_json(project)
    else:
        output.print_key_value(
            {
                "ID": project.get("id", "-"),
                "Name": project.get("name", "-"),
                "Kind": project.get("kind", "TASK"),
                "Color": project.get("color", "-"),
                "View Mode": project.get("viewMode", "-"),
                "Group ID": project.get("groupId", "-") or "-",
            },
            ["ID", "Name", "Kind", "Color", "View Mode", "Group ID"],
        )


@app.command("inbox")
@handle_client_error
def show_inbox(
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show inbox project information."""
    client = get_client()
    inbox_id = client.get_inbox()

    if not inbox_id:
        output.print_error("Inbox not found")
        raise typer.Exit(1)

    if json_output:
        output.print_json({"inboxId": inbox_id})
    else:
        output.print_info(f"Inbox ID: {inbox_id}")


@app.command("add")
@handle_client_error
def add_project(
    name: Annotated[str, typer.Argument(help="Project name")],
    color: Annotated[
        str | None,
        typer.Option("--color", "-c", help="Hex color code"),
    ] = None,
    kind: Annotated[
        str,
        typer.Option("--kind", "-k", help="Project kind (TASK or NOTE)"),
    ] = "TASK",
    view: Annotated[
        str | None,
        typer.Option("--view", "-v", help="View mode (list, kanban, timeline)"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Create a new project."""
    client = get_client()

    kwargs = {"name": name, "kind": kind.upper()}
    if color:
        kwargs["color"] = color
    if view:
        kwargs["viewMode"] = view

    project = client.create_project(**kwargs)

    if json_output:
        output.print_json(project)
    else:
        output.print_success(f"Created project: {project.get('id', 'unknown')}")


@app.command("edit")
@handle_client_error
def edit_project(
    project_id: Annotated[str, typer.Argument(help="Project ID")],
    name: Annotated[
        str | None,
        typer.Option("--name", "-n", help="New name"),
    ] = None,
    color: Annotated[
        str | None,
        typer.Option("--color", "-c", help="New hex color code"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Edit an existing project."""
    client = get_client()

    kwargs = {}
    if name:
        kwargs["name"] = name
    if color:
        kwargs["color"] = color

    if not kwargs:
        output.print_error("No fields to update")
        raise typer.Exit(1)

    project = client.update_project(project_id, **kwargs)

    if json_output:
        output.print_json(project)
    else:
        output.print_success(f"Updated project: {project_id}")


@app.command("delete")
@handle_client_error
def delete_project(
    project_ids: Annotated[list[str], typer.Argument(help="Project ID(s) to delete")],
    force: Annotated[
        bool,
        typer.Option("--force", "-f", help="Skip confirmation"),
    ] = False,
) -> None:
    """Delete project(s)."""
    if not force:
        confirm = typer.confirm(f"Delete {len(project_ids)} project(s)?")
        if not confirm:
            output.print_info("Cancelled")
            return

    client = get_client()
    client.delete_projects(project_ids)
    output.print_success(f"Deleted {len(project_ids)} project(s)")
