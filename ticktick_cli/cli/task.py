"""Task commands for TickTick CLI."""

from typing import Annotated

import typer

from ticktick_cli import output
from ticktick_cli.client import AuthenticationError, ClientError, get_client

app = typer.Typer(help="Manage tasks")


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
def list_tasks(
    project: Annotated[
        str | None,
        typer.Option("--project", "-p", help="Filter by project ID"),
    ] = None,
    tag: Annotated[
        str | None,
        typer.Option("--tag", "-t", help="Filter by tag name"),
    ] = None,
    priority: Annotated[
        int | None,
        typer.Option("--priority", help="Filter by priority (0, 1, 3, 5)"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """List active tasks."""
    client = get_client()
    tasks = client.get_tasks()

    # Apply filters
    if project:
        tasks = [t for t in tasks if t.get("projectId") == project]
    if tag:
        tasks = [t for t in tasks if tag in (t.get("tags") or [])]
    if priority is not None:
        tasks = [t for t in tasks if t.get("priority") == priority]

    if json_output:
        output.print_json(tasks)
    elif not tasks:
        output.print_info("No tasks found")
    else:
        output.print_tasks_table(tasks)


@app.command("show")
@handle_client_error
def show_task(
    task_id: Annotated[str, typer.Argument(help="Task ID")],
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Show details of a specific task."""
    client = get_client()
    tasks = client.get_tasks()

    # Find task by ID (supports partial match)
    task = None
    for t in tasks:
        if t.get("id", "").startswith(task_id):
            task = t
            break

    if not task:
        output.print_error(f"Task not found: {task_id}")
        raise typer.Exit(1)

    if json_output:
        output.print_json(task)
    else:
        output.print_key_value(
            {
                "ID": task.get("id", "-"),
                "Title": task.get("title", "-"),
                "Status": "Completed" if task.get("status", 0) > 0 else "Active",
                "Priority": output.format_priority(task.get("priority", 0)),
                "Due Date": output.format_date(task.get("dueDate")),
                "Project": task.get("projectId", "-"),
                "Tags": ", ".join(task.get("tags") or []) or "-",
                "Description": task.get("content", "-") or "-",
            },
            ["ID", "Title", "Status", "Priority", "Due Date", "Project", "Tags"],
        )


@app.command("closed")
@handle_client_error
def closed_tasks(
    status: Annotated[
        str,
        typer.Option("--status", "-s", help="Filter by status"),
    ] = "Completed",
    project: Annotated[
        str | None,
        typer.Option("--project", "-p", help="Filter by project ID"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """List closed (completed or abandoned) tasks."""
    if status not in ("Completed", "Abandoned"):
        output.print_error("Status must be 'Completed' or 'Abandoned'")
        raise typer.Exit(1)

    client = get_client()
    tasks = client.get_closed_tasks(status=status, project_id=project)

    if json_output:
        output.print_json(tasks)
    elif not tasks:
        output.print_info(f"No {status.lower()} tasks found")
    else:
        output.print_tasks_table(tasks)


@app.command("add")
@handle_client_error
def add_task(
    title: Annotated[str, typer.Argument(help="Task title")],
    project: Annotated[
        str | None,
        typer.Option("--project", "-p", help="Project ID"),
    ] = None,
    priority: Annotated[
        int,
        typer.Option("--priority", help="Priority (0=none, 1=low, 3=medium, 5=high)"),
    ] = 0,
    due: Annotated[
        str | None,
        typer.Option("--due", "-d", help="Due date (YYYY-MM-DD)"),
    ] = None,
    tags: Annotated[
        str | None,
        typer.Option("--tags", "-t", help="Comma-separated tags"),
    ] = None,
    desc: Annotated[
        str | None,
        typer.Option("--desc", help="Task description"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Create a new task."""
    client = get_client()

    kwargs = {"title": title}
    if project:
        kwargs["projectId"] = project
    if priority:
        kwargs["priority"] = priority
    if due:
        kwargs["dueDate"] = due
    if tags:
        kwargs["tags"] = [t.strip() for t in tags.split(",")]
    if desc:
        kwargs["content"] = desc

    task = client.create_task(**kwargs)

    if json_output:
        output.print_json(task)
    else:
        output.print_success(f"Created task: {task.get('id', 'unknown')}")


@app.command("edit")
@handle_client_error
def edit_task(
    task_id: Annotated[str, typer.Argument(help="Task ID")],
    title: Annotated[
        str | None,
        typer.Option("--title", help="New title"),
    ] = None,
    priority: Annotated[
        int | None,
        typer.Option("--priority", help="New priority"),
    ] = None,
    due: Annotated[
        str | None,
        typer.Option("--due", "-d", help="New due date (YYYY-MM-DD)"),
    ] = None,
    desc: Annotated[
        str | None,
        typer.Option("--desc", help="New description"),
    ] = None,
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Edit an existing task."""
    client = get_client()

    kwargs = {}
    if title:
        kwargs["title"] = title
    if priority is not None:
        kwargs["priority"] = priority
    if due:
        kwargs["dueDate"] = due
    if desc:
        kwargs["content"] = desc

    if not kwargs:
        output.print_error("No fields to update")
        raise typer.Exit(1)

    task = client.update_task(task_id, **kwargs)

    if json_output:
        output.print_json(task)
    else:
        output.print_success(f"Updated task: {task_id}")


@app.command("done")
@handle_client_error
def done_task(
    task_ids: Annotated[list[str], typer.Argument(help="Task ID(s) to complete")],
) -> None:
    """Mark task(s) as complete."""
    client = get_client()

    for task_id in task_ids:
        client.complete_task(task_id)
        output.print_success(f"Completed: {task_id}")


@app.command("abandon")
@handle_client_error
def abandon_task(
    task_ids: Annotated[list[str], typer.Argument(help="Task ID(s) to abandon")],
) -> None:
    """Mark task(s) as abandoned."""
    client = get_client()

    for task_id in task_ids:
        client.abandon_task(task_id)
        output.print_success(f"Abandoned: {task_id}")


@app.command("reopen")
@handle_client_error
def reopen_task(
    task_ids: Annotated[list[str], typer.Argument(help="Task ID(s) to reopen")],
) -> None:
    """Reopen closed task(s)."""
    client = get_client()

    for task_id in task_ids:
        client.reopen_task(task_id)
        output.print_success(f"Reopened: {task_id}")


@app.command("delete")
@handle_client_error
def delete_task(
    task_ids: Annotated[list[str], typer.Argument(help="Task ID(s) to delete")],
    force: Annotated[
        bool,
        typer.Option("--force", "-f", help="Skip confirmation"),
    ] = False,
) -> None:
    """Delete task(s)."""
    if not force:
        confirm = typer.confirm(f"Delete {len(task_ids)} task(s)?")
        if not confirm:
            output.print_info("Cancelled")
            return

    client = get_client()
    client.delete_tasks(task_ids)
    output.print_success(f"Deleted {len(task_ids)} task(s)")


# Subtask commands
subtask_app = typer.Typer(help="Manage subtasks")
app.add_typer(subtask_app, name="subtask")


@subtask_app.command("add")
@handle_client_error
def add_subtask(
    parent_id: Annotated[str, typer.Argument(help="Parent task ID")],
    title: Annotated[str, typer.Argument(help="Subtask title")],
    json_output: Annotated[
        bool,
        typer.Option("--json", help="Output as JSON"),
    ] = False,
) -> None:
    """Create a subtask under a parent task."""
    client = get_client()

    # First create the task
    task = client.create_task(title=title)
    task_id = task.get("id")

    # Then set its parent
    client.set_task_parent(task_id, parent_id)

    if json_output:
        output.print_json({"id": task_id, "parentId": parent_id, "title": title})
    else:
        output.print_success(f"Created subtask: {task_id}")


@subtask_app.command("unset")
@handle_client_error
def unset_subtask(
    task_id: Annotated[str, typer.Argument(help="Task ID to remove from parent")],
) -> None:
    """Remove a task from its parent (make it a top-level task)."""
    client = get_client()
    client.unset_task_parent(task_id)
    output.print_success(f"Removed parent from: {task_id}")
