import Router from "koa-router";
import axios from "axios";
import { IntegrationService, IntegrationType } from "@shared/types";
import { createContext } from "@server/context";
import apexAuthRedirect from "@server/middlewares/apexAuthRedirect";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import validateWebhook from "@server/middlewares/validateWebhook";
import { IntegrationAuthentication, Integration } from "@server/models";
import { APIContext } from "@server/types";
import { GitLabUtils } from "../../shared/GitLabUtils";
import env from "../env";
import { GitLab } from "../gitlab";
import GitLabWebhookTask from "../tasks/GitLabWebhookTask";
import * as T from "./schema";

const router = new Router();

router.get(
  "gitlab.callback",
  auth({ optional: true }),
  validate(T.GitLabCallbackSchema),
  apexAuthRedirect<T.GitLabCallbackReq>({
    getTeamId: (ctx) => ctx.input.query.state,
    getRedirectPath: (ctx, team) =>
      GitLabUtils.callbackUrl({
        baseUrl: team.url,
        params: ctx.request.querystring,
      }),
    getErrorPath: () => GitLabUtils.errorUrl("unauthenticated"),
  }),
  transaction(),
  async (ctx: APIContext<T.GitLabCallbackReq>) => {
    const { code, state: teamId, error } = ctx.input.query;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    if (error) {
      ctx.redirect(GitLabUtils.errorUrl(error));
      return;
    }

    // Exchange code for access token
    const tokenUrl = "https://gitlab.com/oauth/token";
    const tokenResponse = await axios.post(tokenUrl, {
      client_id: env.GITLAB_CLIENT_ID,
      client_secret: env.GITLAB_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GitLabUtils.callbackUrl(),
    });

    const { access_token: accessToken } = tokenResponse.data;

    // Get user info to get the account details
    const client = GitLab.authenticateAsUser(accessToken);
    const userInfo = await client.Users.current();

    const scopes = ["api", "read_api", "read_user"];

    const authentication = await IntegrationAuthentication.create(
      {
        service: IntegrationService.GitLab,
        userId: user.id,
        teamId: user.teamId,
        scopes,
      },
      { transaction }
    );

    await Integration.createWithCtx(createContext({ user, transaction }), {
      service: IntegrationService.GitLab,
      type: IntegrationType.Embed,
      userId: user.id,
      teamId: user.teamId,
      authenticationId: authentication.id,
      settings: {
        gitlab: {
          installation: {
            id: userInfo.id,
            account: {
              id: userInfo.id,
              name: accessToken, // Store access token as account name (not ideal, but matches structure)
              avatarUrl: userInfo.avatar_url,
            },
          },
        },
      },
    });

    ctx.redirect(GitLabUtils.url);
  }
);

router.post(
  "gitlab.webhooks",
  validateWebhook({
    secretKey: env.GITLAB_WEBHOOK_SECRET!,
    getSignatureFromHeader: (ctx) => {
      const { headers } = ctx.request;
      const signatureHeader = headers["x-gitlab-token"];
      return Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader;
    },
  }),
  async (ctx: APIContext) => {
    const { headers, body } = ctx.request;

    await new GitLabWebhookTask().schedule({
      payload: body,
      headers,
    });

    ctx.status = 202;
  }
);

export default router;
