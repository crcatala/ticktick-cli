"""Output formatting utilities for TickTick CLI.

Provides human-readable and JSON output formatting.
"""

import json
from datetime import datetime, timedelta
from typing import Any

from rich.console import Console
from rich.table import Table

console = Console()
error_console = Console(stderr=True)


def print_json(data: Any) -> None:
    """Print data as formatted JSON.

    Args:
        data: Data to print as JSON.
    """
    console.print(json.dumps(data, indent=2, default=str))


def print_error(message: str) -> None:
    """Print an error message to stderr.

    Args:
        message: Error message to print.
    """
    error_console.print(f"[red]Error:[/red] {message}")


def print_success(message: str) -> None:
    """Print a success message.

    Args:
        message: Success message to print.
    """
    console.print(f"[green]✓[/green] {message}")


def print_warning(message: str) -> None:
    """Print a warning message.

    Args:
        message: Warning message to print.
    """
    console.print(f"[yellow]Warning:[/yellow] {message}")


def print_info(message: str) -> None:
    """Print an info message.

    Args:
        message: Info message to print.
    """
    console.print(message)


def truncate_id(id_str: str, length: int = 8) -> str:
    """Truncate an ID for display.

    Args:
        id_str: ID string to truncate.
        length: Maximum length.

    Returns:
        Truncated ID with ellipsis if needed.
    """
    if len(id_str) <= length:
        return id_str
    return id_str[:length] + "..."


def format_date(date_str: str | None) -> str:
    """Format a date string for display.

    Args:
        date_str: ISO date string or None.

    Returns:
        Formatted date or '-' if None.
    """
    if not date_str:
        return "-"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        today = datetime.now(dt.tzinfo).date() if dt.tzinfo else datetime.now().date()
        if dt.date() == today:
            return "Today"
        tomorrow = today + timedelta(days=1)
        if dt.date() == tomorrow:
            return "Tomorrow"
        return dt.strftime("%Y-%m-%d")
    except (ValueError, AttributeError):
        return date_str


def format_priority(priority: int) -> str:
    """Format priority for display.

    Args:
        priority: Priority value (0, 1, 3, 5).

    Returns:
        Human-readable priority string.
    """
    mapping = {0: "-", 1: "Low", 3: "Medium", 5: "High"}
    return mapping.get(priority, str(priority))


def create_table(*columns: str) -> Table:
    """Create a Rich table with the given columns.

    Args:
        columns: Column names.

    Returns:
        Configured Rich Table.
    """
    table = Table(show_header=True, header_style="bold")
    for col in columns:
        table.add_column(col)
    return table


def print_table(table: Table) -> None:
    """Print a Rich table to console.

    Args:
        table: Table to print.
    """
    console.print(table)


def print_tasks_table(tasks: list[dict[str, Any]]) -> None:
    """Print tasks in a table format.

    Args:
        tasks: List of task dictionaries.
    """
    table = create_table("ID", "Title", "Due", "Priority", "Project")
    for task in tasks:
        table.add_row(
            truncate_id(task.get("id", "")),
            task.get("title", "")[:50],
            format_date(task.get("dueDate")),
            format_priority(task.get("priority", 0)),
            task.get("projectId", "-")[:8] if task.get("projectId") else "-",
        )
    print_table(table)


def print_projects_table(projects: list[dict[str, Any]]) -> None:
    """Print projects in a table format.

    Args:
        projects: List of project dictionaries.
    """
    table = create_table("ID", "Name", "Kind", "Color")
    for project in projects:
        table.add_row(
            truncate_id(project.get("id", "")),
            project.get("name", ""),
            project.get("kind", "TASK"),
            project.get("color", "-"),
        )
    print_table(table)


def print_tags_table(tags: list[dict[str, Any]]) -> None:
    """Print tags in a table format.

    Args:
        tags: List of tag dictionaries.
    """
    table = create_table("Name", "Color", "Parent")
    for tag in tags:
        table.add_row(
            tag.get("name", ""),
            tag.get("color", "-"),
            tag.get("parent", "-") or "-",
        )
    print_table(table)


def print_key_value(data: dict[str, Any], keys: list[str] | None = None) -> None:
    """Print data as key-value pairs.

    Args:
        data: Dictionary to print.
        keys: Optional list of keys to print (in order). If None, prints all.
    """
    if keys is None:
        keys = list(data.keys())
    max_key_len = max(len(k) for k in keys) if keys else 0
    for key in keys:
        if key in data:
            console.print(f"[bold]{key:<{max_key_len}}[/bold]  {data[key]}")
