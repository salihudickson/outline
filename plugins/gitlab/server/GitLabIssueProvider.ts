import { IssueSource } from "@shared/schema";
import { IntegrationService, IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication } from "@server/models";
import { sequelize } from "@server/storage/database";
import { BaseIssueProvider } from "@server/utils/BaseIssueProvider";
import { GitLab } from "./gitlab";

export class GitLabIssueProvider extends BaseIssueProvider {
  constructor() {
    super(IntegrationService.GitLab);
  }

  async fetchSources(
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]> {
    await integration.reload({
      include: [
        {
          model: IntegrationAuthentication,
          as: "authentication",
          required: true,
        },
      ],
    });

    if (!integration.authentication) {
      Logger.warn("GitLab integration without authentication");
      return [];
    }

    const sources: IssueSource[] = [];

    try {
      const projects = await GitLab.getProjects(
        integration.authentication.token
      );

      sources.push(
        ...projects.map<IssueSource>((project: any) => ({
          id: String(project.id),
          name: project.name,
          owner: {
            id: String(project.namespace.id),
            name: project.namespace.full_path,
          },
          service: IntegrationService.GitLab,
        }))
      );
    } catch (err) {
      Logger.warn("Failed to fetch projects from GitLab", err);
    }

    return sources;
  }

  async handleWebhook({
    payload,
    headers,
  }: {
    payload: Record<string, unknown>;
    headers: Record<string, unknown>;
  }) {
    const hookId = headers["x-gitlab-event"] as string;
    const eventName = headers["x-gitlab-event"] as string;

    if (!eventName) {
      Logger.warn(
        `Received GitLab webhook without event name; hookId: ${hookId}, eventName: ${eventName}`
      );
      return;
    }

    // GitLab webhook handling can be extended here
    // For now, we'll just log the event
    Logger.info("task", `Received GitLab webhook event: ${eventName}`);
  }
}
