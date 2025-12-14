"""Main entry point for the TickTick CLI."""

import typer

from ticktick_cli.cli import auth, group, project, sync, tag, task, user

app = typer.Typer(
    name="ticktick",
    help="A CLI for TickTick task management.",
    no_args_is_help=True,
)

# Register command groups
app.add_typer(auth.app, name="auth")
app.add_typer(task.app, name="task")
app.add_typer(project.app, name="project")
app.add_typer(group.app, name="group")
app.add_typer(tag.app, name="tag")
app.add_typer(user.app, name="user")
app.add_typer(sync.app, name="sync")


@app.command()
def version() -> None:
    """Show version information."""
    from importlib.metadata import version as get_version

    try:
        ver = get_version("ticktick-cli")
    except Exception:
        ver = "unknown"
    typer.echo(f"ticktick-cli {ver}")


def main() -> None:
    """Entry point for the CLI."""
    app()


if __name__ == "__main__":
    main()
