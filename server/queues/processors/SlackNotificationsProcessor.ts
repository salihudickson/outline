import { NotificationChannelType, NotificationEventType } from "@shared/types";
import { Notification, Integration } from "@server/models";
import type { Event, NotificationEvent } from "@server/types";
import * as Slack from "../../../plugins/slack/server/slack";
import BaseProcessor from "./BaseProcessor";
import Logger from "@server/logging/Logger";

/**
 * Processor for sending Slack DM notifications.
 * Listens for notification.create events and sends Slack DMs to users
 * who have linked their Slack accounts and enabled Slack notifications.
 */
export default class SlackNotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["notifications.create"];

  async perform(event: NotificationEvent) {
    const notification = await Notification.scope([
      "withTeam",
      "withUser",
      "withActor",
    ]).findByPk(event.modelId);
    
    if (!notification) {
      return;
    }

    // Check if user is suspended
    if (notification.user.isSuspended) {
      return;
    }

    // Check if user has Slack notifications enabled for this event type
    if (!notification.user.subscribedToEventType(
      notification.event,
      NotificationChannelType.Chat
    )) {
      return;
    }

    // Get user's Slack user ID from their linked account
    const slackUserId = await notification.user.getSlackUserId();
    if (!slackUserId) {
      Logger.debug("processor", `User ${notification.userId} has no linked Slack account`);
      return;
    }

    // Get the team's Slack integration authentication to get the bot token
    const integration = await Integration.scope("withAuthentication").findOne({
      where: {
        teamId: notification.user.teamId,
        service: "slack",
        type: "command", // The command integration has the bot token
      },
    });

    if (!integration?.authentication?.token) {
      Logger.debug("processor", `No Slack integration found for team ${notification.user.teamId}`);
      return;
    }

    try {
      const message = this.formatSlackMessage(notification);
      
      await Slack.post("chat.postMessage", {
        token: integration.authentication.token,
        channel: slackUserId,
        text: message.text,
        blocks: message.blocks,
      });

      await notification.update({
        slackSentAt: new Date(),
      });

      Logger.info("processor", `Slack DM sent for notification ${notification.id}`);
    } catch (error) {
      Logger.error(`Failed to send Slack DM for notification ${notification.id}`, error);
    }
  }

  /**
   * Format a notification into a Slack message with rich formatting.
   *
   * @param notification - the notification to format.
   * @returns the formatted Slack message.
   */
  private formatSlackMessage(notification: Notification): {
    text: string;
    blocks: unknown[];
  } {
    const actorName = notification.actor.name;
    const teamUrl = notification.team.url;
    let text = "";
    let url = "";

    switch (notification.event) {
      case NotificationEventType.PublishDocument:
        text = `${actorName} published a new document`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.UpdateDocument:
        text = `${actorName} updated a document you're subscribed to`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.MentionedInDocument:
        text = `${actorName} mentioned you in a document`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.MentionedInComment:
        text = `${actorName} mentioned you in a comment`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.GroupMentionedInDocument:
        text = `${actorName} mentioned a group you're in`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.GroupMentionedInComment:
        text = `${actorName} mentioned a group you're in`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.CreateComment:
        text = `${actorName} commented on a document you're subscribed to`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.ResolveComment:
        text = `${actorName} resolved a comment thread you participated in`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.CreateCollection:
        text = `A new collection was created`;
        url = `${teamUrl}/collection/${notification.collectionId}`;
        break;

      case NotificationEventType.AddUserToDocument:
        text = `${actorName} shared a document with you`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.AddUserToCollection:
        text = `${actorName} shared a collection with you`;
        url = `${teamUrl}/collection/${notification.collectionId}`;
        break;

      default:
        text = `You have a new notification from ${actorName}`;
        url = teamUrl;
    }

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${text}*`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View",
            },
            url,
          },
        ],
      },
    ];

    return { text, blocks };
  }
}
