"""Client wrapper for pyticktick.

Provides a simplified interface to the pyticktick v2 API client,
handling authentication from stored config.
"""

from functools import cached_property
from typing import Any

from pyticktick import Client as PyTickTickClient
from pyticktick.settings import Settings

from ticktick_cli.config import get_auth


class ClientError(Exception):
    """Error from the TickTick client."""

    pass


class AuthenticationError(ClientError):
    """Authentication-related error."""

    pass


class Client:
    """Wrapper around pyticktick Client for v2 API access."""

    def __init__(self, username: str | None = None, token: str | None = None) -> None:
        """Initialize the client.

        Args:
            username: TickTick username/email. If not provided, loads from config.
            token: Session token. If not provided, loads from config.

        Raises:
            AuthenticationError: If no credentials are available.
        """
        if username and token:
            self._username = username
            self._token = token
        else:
            auth = get_auth()
            if not auth:
                raise AuthenticationError(
                    "Not logged in. Run 'ticktick auth login' first."
                )
            self._username = auth["username"]
            self._token = auth["token"]

    @cached_property
    def _client(self) -> PyTickTickClient:
        """Get the underlying pyticktick client."""
        settings = Settings(v2_username=self._username, v2_token=self._token)
        return PyTickTickClient(settings=settings)

    # User methods
    def get_profile(self) -> dict[str, Any]:
        """Get user profile."""
        return self._client.get_user_profile_v2().model_dump()

    def get_user_status(self) -> dict[str, Any]:
        """Get user status (subscription info)."""
        return self._client.get_user_status_v2().model_dump()

    def get_user_stats(self) -> dict[str, Any]:
        """Get user statistics."""
        return self._client.get_user_statistics_v2().model_dump()

    # Sync methods
    def get_batch(self) -> dict[str, Any]:
        """Get full state snapshot (all tasks, projects, tags, etc.)."""
        return self._client.get_batch_v2().model_dump()

    # Task methods
    def get_tasks(self) -> list[dict[str, Any]]:
        """Get all active tasks."""
        batch = self._client.get_batch_v2()
        return [t.model_dump() for t in (batch.sync_task_bean.update or [])]

    def get_closed_tasks(
        self, status: str = "Completed", project_id: str | None = None
    ) -> list[dict[str, Any]]:
        """Get closed tasks.

        Args:
            status: "Completed" or "Abandoned".
            project_id: Optional project ID to filter by.
        """
        tasks = self._client.get_project_all_closed_v2(status=status)
        result = [t.model_dump() for t in tasks]
        if project_id:
            result = [t for t in result if t.get("projectId") == project_id]
        return result

    def create_task(self, **kwargs: Any) -> dict[str, Any]:
        """Create a new task.

        Args:
            **kwargs: Task fields (title, projectId, priority, dueDate, etc.)

        Returns:
            Created task data with ID.
        """
        from pyticktick.models.v2.parameters import TaskCreateV2

        task = TaskCreateV2(**kwargs)
        response = self._client.create_tasks_v2([task])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to create task: {errors[0]}")
        task_id = list(response.id2etag.keys())[0]
        return {"id": task_id, **kwargs}

    def update_task(self, task_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update an existing task.

        Args:
            task_id: Task ID to update.
            **kwargs: Task fields to update.

        Returns:
            Updated task data.
        """
        from pyticktick.models.v2.parameters import TaskUpdateV2

        task = TaskUpdateV2(id=task_id, **kwargs)
        response = self._client.update_tasks_v2([task])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to update task: {errors[0]}")
        return {"id": task_id, **kwargs}

    def complete_task(self, task_id: str) -> None:
        """Mark a task as complete.

        Args:
            task_id: Task ID to complete.
        """
        self.update_task(task_id, status=2)

    def abandon_task(self, task_id: str) -> None:
        """Mark a task as abandoned.

        Args:
            task_id: Task ID to abandon.
        """
        self.update_task(task_id, status=-1)

    def reopen_task(self, task_id: str) -> None:
        """Reopen a closed task.

        Args:
            task_id: Task ID to reopen.
        """
        self.update_task(task_id, status=0)

    def delete_tasks(self, task_ids: list[str]) -> None:
        """Delete tasks.

        Args:
            task_ids: List of task IDs to delete.
        """
        from pyticktick.models.v2.parameters import TaskDeleteV2

        deletes = [TaskDeleteV2(taskId=tid) for tid in task_ids]
        response = self._client.delete_tasks_v2(deletes)
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to delete tasks: {errors[0]}")

    # Subtask methods
    def set_task_parent(self, task_id: str, parent_id: str) -> None:
        """Set parent for a task (make it a subtask).

        Args:
            task_id: Task ID to make a subtask.
            parent_id: Parent task ID.
        """
        from pyticktick.models.v2.parameters import TaskParentSetV2

        parent = TaskParentSetV2(id=task_id, parentId=parent_id)
        self._client.set_task_parents_v2([parent])

    def unset_task_parent(self, task_id: str) -> None:
        """Remove parent from a task.

        Args:
            task_id: Task ID to remove parent from.
        """
        from pyticktick.models.v2.parameters import TaskParentUnsetV2

        unset = TaskParentUnsetV2(id=task_id)
        self._client.unset_task_parents_v2([unset])

    # Project methods
    def get_projects(self) -> list[dict[str, Any]]:
        """Get all projects."""
        batch = self._client.get_batch_v2()
        projects = [p.model_dump() for p in (batch.project_profiles or [])]
        return projects

    def get_inbox(self) -> dict[str, Any] | None:
        """Get the inbox project."""
        batch = self._client.get_batch_v2()
        return batch.inbox_id

    def create_project(self, **kwargs: Any) -> dict[str, Any]:
        """Create a new project.

        Args:
            **kwargs: Project fields (name, color, kind, viewMode, etc.)

        Returns:
            Created project data with ID.
        """
        from pyticktick.models.v2.parameters import ProjectCreateV2

        project = ProjectCreateV2(**kwargs)
        response = self._client.create_projects_v2([project])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to create project: {errors[0]}")
        project_id = list(response.id2etag.keys())[0]
        return {"id": project_id, **kwargs}

    def update_project(self, project_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update an existing project.

        Args:
            project_id: Project ID to update.
            **kwargs: Project fields to update.

        Returns:
            Updated project data.
        """
        from pyticktick.models.v2.parameters import ProjectUpdateV2

        project = ProjectUpdateV2(id=project_id, **kwargs)
        response = self._client.update_projects_v2([project])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to update project: {errors[0]}")
        return {"id": project_id, **kwargs}

    def delete_projects(self, project_ids: list[str]) -> None:
        """Delete projects.

        Args:
            project_ids: List of project IDs to delete.
        """
        from pyticktick.models.v2.parameters import ProjectDeleteV2

        deletes = [ProjectDeleteV2(id=pid) for pid in project_ids]
        response = self._client.delete_projects_v2(deletes)
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to delete projects: {errors[0]}")

    # Project Group methods
    def get_project_groups(self) -> list[dict[str, Any]]:
        """Get all project groups."""
        batch = self._client.get_batch_v2()
        return [g.model_dump() for g in (batch.project_groups or [])]

    def create_project_group(self, **kwargs: Any) -> dict[str, Any]:
        """Create a new project group.

        Args:
            **kwargs: Group fields (name, etc.)

        Returns:
            Created group data with ID.
        """
        from pyticktick.models.v2.parameters import ProjectGroupCreateV2

        group = ProjectGroupCreateV2(**kwargs)
        response = self._client.create_project_groups_v2([group])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to create group: {errors[0]}")
        group_id = list(response.id2etag.keys())[0]
        return {"id": group_id, **kwargs}

    def update_project_group(self, group_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update an existing project group.

        Args:
            group_id: Group ID to update.
            **kwargs: Group fields to update.

        Returns:
            Updated group data.
        """
        from pyticktick.models.v2.parameters import ProjectGroupUpdateV2

        group = ProjectGroupUpdateV2(id=group_id, **kwargs)
        response = self._client.update_project_groups_v2([group])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to update group: {errors[0]}")
        return {"id": group_id, **kwargs}

    def delete_project_groups(self, group_ids: list[str]) -> None:
        """Delete project groups.

        Args:
            group_ids: List of group IDs to delete.
        """
        from pyticktick.models.v2.parameters import ProjectGroupDeleteV2

        deletes = [ProjectGroupDeleteV2(id=gid) for gid in group_ids]
        response = self._client.delete_project_groups_v2(deletes)
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to delete groups: {errors[0]}")

    # Tag methods
    def get_tags(self) -> list[dict[str, Any]]:
        """Get all tags."""
        batch = self._client.get_batch_v2()
        return [t.model_dump() for t in (batch.tags or [])]

    def create_tag(self, **kwargs: Any) -> dict[str, Any]:
        """Create a new tag.

        Args:
            **kwargs: Tag fields (name, color, parent, etc.)

        Returns:
            Created tag data.
        """
        from pyticktick.models.v2.parameters import TagCreateV2

        tag = TagCreateV2(**kwargs)
        response = self._client.create_tags_v2([tag])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to create tag: {errors[0]}")
        return kwargs

    def update_tag(self, name: str, **kwargs: Any) -> dict[str, Any]:
        """Update an existing tag.

        Args:
            name: Tag name to update.
            **kwargs: Tag fields to update.

        Returns:
            Updated tag data.
        """
        from pyticktick.models.v2.parameters import TagUpdateV2

        tag = TagUpdateV2(name=name, **kwargs)
        response = self._client.update_tags_v2([tag])
        if response.id2error:
            errors = list(response.id2error.values())
            raise ClientError(f"Failed to update tag: {errors[0]}")
        return {"name": name, **kwargs}

    def rename_tag(self, old_name: str, new_name: str) -> None:
        """Rename a tag.

        Args:
            old_name: Current tag name.
            new_name: New tag name.
        """
        self._client.rename_tag_v2(name=old_name, new_name=new_name)

    def delete_tag(self, name: str) -> None:
        """Delete a tag.

        Args:
            name: Tag name to delete.
        """
        self._client.delete_tag_v2(name=name)


def get_client() -> Client:
    """Get a configured client instance.

    Returns:
        Client instance configured from stored auth.

    Raises:
        AuthenticationError: If not logged in.
    """
    return Client()
