import { Gitlab } from "@gitbeaker/rest";
import pluralize from "pluralize";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, User } from "@server/models";
import { UnfurlIssueOrPR, UnfurlSignature } from "@server/types";
import { GitLabUtils } from "../shared/GitLabUtils";
import env from "./env";

type MR = {
  iid: number;
  title: string;
  description: string;
  web_url: string;
  state: string;
  draft: boolean;
  merged_at: string | null;
  created_at: string;
  author: {
    username: string;
    avatar_url: string;
  };
  labels: string[];
};

type Issue = {
  iid: number;
  title: string;
  description: string;
  web_url: string;
  state: string;
  created_at: string;
  author: {
    username: string;
    avatar_url: string;
  };
  labels: { name: string; color: string }[];
};

export class GitLab {
  private static clientId = env.GITLAB_CLIENT_ID;
  private static clientSecret = env.GITLAB_CLIENT_SECRET;

  private static supportedResources = [
    UnfurlResourceType.Issue,
    UnfurlResourceType.PR,
  ];

  /**
   * Parses a given URL and returns resource identifiers for GitLab specific URLs
   *
   * @param url URL to parse
   * @returns {object} Containing resource identifiers - `owner`, `repo`, `type` and `id`.
   */
  public static parseUrl(url: string) {
    const { hostname, pathname } = new URL(url);
    if (hostname !== "gitlab.com") {
      return;
    }

    // GitLab URLs: /owner/repo/-/issues/123 or /owner/repo/-/merge_requests/123
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 4) {
      return;
    }

    const owner = parts[0];
    const repo = parts[1];
    
    // Find the resource type index
    let typeIndex = -1;
    let type: UnfurlResourceType | undefined;
    
    if (parts.includes("issues")) {
      typeIndex = parts.indexOf("issues");
      type = UnfurlResourceType.Issue;
    } else if (parts.includes("merge_requests")) {
      typeIndex = parts.indexOf("merge_requests");
      type = UnfurlResourceType.PR;
    }

    if (typeIndex === -1 || !type) {
      return;
    }

    const id = Number(parts[typeIndex + 1]);

    if (!type || !GitLab.supportedResources.includes(type)) {
      return;
    }

    return { owner, repo, type, id, url };
  }

  /**
   * Authenticates as a GitLab user with access token
   *
   * @param accessToken Access token received from OAuth flow
   * @returns {Gitlab} User-authenticated GitLab client instance
   */
  public static authenticateAsUser = (accessToken: string) =>
    new Gitlab({
      oauthToken: accessToken,
    });

  /**
   * @param url GitLab resource url
   * @param actor User attempting to unfurl resource url
   * @returns An object containing resource details e.g, a GitLab Merge Request details
   */
  public static unfurl: UnfurlSignature = async (url: string, actor: User) => {
    const resource = GitLab.parseUrl(url);

    if (!resource) {
      return;
    }

    const integration = (await Integration.findOne({
      where: {
        service: IntegrationService.GitLab,
        teamId: actor.teamId,
        "settings.gitlab.installation.account.name": resource.owner,
      },
    })) as Integration<IntegrationType.Embed>;

    if (!integration) {
      return;
    }

    try {
      const client = GitLab.authenticateAsUser(
        integration.settings.gitlab!.installation.account.name
      );

      const projectPath = `${resource.owner}/${resource.repo}`;

      if (resource.type === UnfurlResourceType.Issue) {
        const issue = (await client.Issues.show(
          projectPath,
          resource.id
        )) as Issue;
        return GitLab.transformIssue(issue);
      } else if (resource.type === UnfurlResourceType.PR) {
        const mr = (await client.MergeRequests.show(
          projectPath,
          resource.id
        )) as MR;
        return GitLab.transformMR(mr);
      }

      return { error: "Resource not found" };
    } catch (err) {
      Logger.warn("Failed to fetch resource from GitLab", err);
      return { error: err.message || "Unknown error" };
    }
  };

  private static transformIssue(issue: Issue) {
    return {
      type: UnfurlResourceType.Issue,
      url: issue.web_url,
      id: `#${issue.iid}`,
      title: issue.title,
      description: issue.description ?? null,
      author: {
        name: issue.author?.username ?? "",
        avatarUrl: issue.author?.avatar_url ?? "",
      },
      labels: issue.labels.map((label) => ({
        name: label.name,
        color: `#${label.color}`,
      })),
      state: {
        name: issue.state,
        color: GitLabUtils.getColorForStatus(issue.state),
      },
      createdAt: issue.created_at,
    } satisfies UnfurlIssueOrPR;
  }

  private static transformMR(mr: MR) {
    const mrState = mr.merged_at ? "merged" : mr.state;
    return {
      type: UnfurlResourceType.PR,
      url: mr.web_url,
      id: `!${mr.iid}`,
      title: mr.title,
      description: mr.description,
      author: {
        name: mr.author.username,
        avatarUrl: mr.author.avatar_url,
      },
      state: {
        name: mrState,
        color: GitLabUtils.getColorForStatus(mrState, !!mr.draft),
        draft: mr.draft,
      },
      createdAt: mr.created_at,
    } satisfies UnfurlIssueOrPR;
  }
}
