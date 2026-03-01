import querystring from "node:querystring";
import { WebClient } from "@slack/web-api";
// Note: @chat-adapter/slack is manually installed due to Yarn 4 resolution issues.
// The package provides SlackAdapter for the Chat SDK framework, but we use the
// underlying @slack/web-api directly to maintain our existing architecture.
// This is the same SDK that @chat-adapter/slack uses internally.
import { InvalidRequestError } from "@server/errors";
import fetch from "@server/utils/fetch";
import { SlackUtils } from "../shared/SlackUtils";
import env from "./env";

const SLACK_API_URL = "https://slack.com/api";

/**
 * Makes a POST request to the Slack API using the Slack Web API client.
 * 
 * This uses @slack/web-api which is the same underlying SDK that @chat-adapter/slack
 * uses internally. The @chat-adapter/slack package provides additional framework features
 * (SlackAdapter class, event handling, state management, multi-platform support) but
 * requires adopting the full Chat SDK architecture with significant code changes.
 * 
 * For now, we use the core @slack/web-api SDK directly while keeping the door open
 * for future migration to @chat-adapter/slack's SlackAdapter if needed.
 *
 * @param endpoint - the Slack API endpoint to call (e.g., "chat.postMessage").
 * @param body - the request body containing token and other parameters.
 * @returns the parsed JSON response from Slack.
 */
export async function post(endpoint: string, body: Record<string, any>) {
  const { token, ...params } = body;

  if (!token) {
    throw InvalidRequestError("Slack API token is required");
  }

  try {
    const client = new WebClient(token);
    
    // Use the API call method which handles all endpoints uniformly
    const result = await client.apiCall(endpoint, params);

    if (!result.ok) {
      throw InvalidRequestError(result.error || "Unknown Slack API error");
    }

    return result;
  } catch (err: any) {
    // Handle Slack SDK errors
    if (err.data) {
      throw InvalidRequestError(err.data.error || err.message);
    }
    throw InvalidRequestError(err.message);
  }
}

/**
 * Makes a POST request to the Slack API with form-urlencoded body.
 * Used primarily for OAuth flows.
 *
 * @param endpoint - the Slack API endpoint to call.
 * @param body - the request parameters.
 * @returns the parsed JSON response from Slack.
 */
export async function request(endpoint: string, body: Record<string, any>) {
  let data;
  const { client_id, client_secret, ...params } = body;

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Use HTTP Basic authentication for client credentials as recommended by
  // Slack documentation and OAuth 2.0 RFC 6749 Section 2.3.1.
  // This prevents client_secret from being exposed in URLs and logs.
  if (client_id && client_secret) {
    const credentials = Buffer.from(`${client_id}:${client_secret}`).toString(
      "base64"
    );
    headers["Authorization"] = `Basic ${credentials}`;
  }

  try {
    const response = await fetch(`${SLACK_API_URL}/${endpoint}`, {
      method: "POST",
      headers,
      body: querystring.stringify(params),
    });
    data = await response.json();
  } catch (err) {
    throw InvalidRequestError(err.message);
  }

  if (!data.ok) {
    throw InvalidRequestError(data.error);
  }
  return data;
}

/**
 * Exchanges an OAuth authorization code for an access token.
 *
 * @param code - the authorization code received from Slack.
 * @param redirect_uri - the redirect URI used in the OAuth flow.
 * @returns the OAuth access response containing the access token.
 */
export async function oauthAccess(
  code: string,
  redirect_uri = SlackUtils.callbackUrl()
) {
  return request("oauth.access", {
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    redirect_uri,
    code,
  });
}
