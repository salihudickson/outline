import queryString from "query-string";
import env from "@shared/env";
import { integrationSettingsPath } from "@shared/utils/routeHelpers";

export class GitLabUtils {
  public static clientId = env.GITLAB_CLIENT_ID;

  static get url() {
    return integrationSettingsPath("gitlab");
  }

  /**
   * @param error
   * @returns URL to be redirected to upon authorization error from GitLab
   */
  public static errorUrl(error: string) {
    return `${this.url}?error=${error}`;
  }

  /**
   * @returns Callback URL configured for GitLab, to which users will be redirected upon authorization
   */
  public static callbackUrl(
    { baseUrl, params }: { baseUrl: string; params?: string } = {
      baseUrl: env.URL,
      params: undefined,
    }
  ) {
    return params
      ? `${baseUrl}/api/gitlab.callback?${params}`
      : `${baseUrl}/api/gitlab.callback`;
  }

  static authUrl(state: string): string {
    const baseUrl = `https://gitlab.com/oauth/authorize`;
    const params = {
      client_id: this.clientId,
      redirect_uri: this.callbackUrl(),
      response_type: "code",
      state,
      scope: "api read_api read_user",
    };
    return `${baseUrl}?${queryString.stringify(params)}`;
  }

  static installRequestUrl(): string {
    return `${this.url}?install_request=true`;
  }

  public static getColorForStatus(status: string, isDraftMR: boolean = false) {
    switch (status) {
      case "opened":
        return isDraftMR ? "#848d97" : "#1f75cb";
      case "done":
        return "#a371f7";
      case "closed":
        return "#f85149";
      case "merged":
        return "#8250df";
      case "canceled":
      default:
        return "#848d97";
    }
  }
}
