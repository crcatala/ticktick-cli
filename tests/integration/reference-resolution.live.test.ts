import { expect, it } from "bun:test";
import { resolveProjectReference, resolveTaskReference } from "../../src/commands/task-filters.js";
import { describeLiveWithProject, generateTestName } from "../helpers/live-test.js";

describeLiveWithProject("Reference resolution", ({ getClient, getTestProject }) => {
  it("resolves fetched project-name prefixes and exact task titles", async () => {
    const client = getClient();
    const testProject = getTestProject();
    const project = testProject.getProject();
    const task = await client.createTask({
      title: generateTestName("reference-task"),
      projectId: project.id,
    });
    testProject.trackTask(task.id);

    const projectPrefix = project.name!.slice(0, -7);
    const projectResolution = resolveProjectReference(await client.getProjects(), projectPrefix);
    expect(projectResolution.value?.id).toBe(project.id);

    const taskResolution = resolveTaskReference(await client.getTasks(), task.title!);
    expect(taskResolution.value?.id).toBe(task.id);
  });
});
