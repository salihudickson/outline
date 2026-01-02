import { toJS } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, hover, truncateMultiline } from "@shared/styles";
import { NotificationEventType } from "@shared/types";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import Notification from "~/models/Notification";
import useStores from "~/hooks/useStores";
import { Avatar, AvatarSize, AvatarVariant } from "../Avatar";
import Button from "../Button";
import Flex from "../Flex";
import Text from "../Text";
import Time from "../Time";
import { UnreadBadge } from "../UnreadBadge";
import InputMemberPermissionSelect from "../InputMemberPermissionSelect";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { ContextMenu } from "../Menu/ContextMenu";
import { createActionWithChildren } from "~/actions";
import {
  notificationMarkRead,
  notificationMarkUnread,
  notificationArchive,
} from "~/actions/definitions/notifications";
import { NotificationSection } from "~/actions/sections";

const CommentEditor = lazyWithRetry(
  () => import("~/scenes/Document/components/Comments/CommentEditor")
);

type Props = {
  notification: Notification;
  onNavigate: () => void;
};

function NotificationListItem({ notification, onNavigate }: Props) {
  const { t } = useTranslation();
  const { collections, documents, ui } = useStores();
  const collectionId = notification.document?.collectionId;
  const collection = collectionId ? collections.get(collectionId) : undefined;
  const [selectedPermission, setSelectedPermission] = React.useState<
    CollectionPermission | DocumentPermission
  >(
    notification.documentId
      ? DocumentPermission.Read
      : CollectionPermission.Read
  );
  const [processing, setProcessing] = React.useState(false);

  const isAccessRequest =
    notification.event === NotificationEventType.RequestAccess;
  const accessRequestId = notification.data?.accessRequestId;

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    // Don't navigate if clicking inside action buttons
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest("button") ||
        event.target.closest(".permission-select"))
    ) {
      event.preventDefault();
      return;
    }

    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      void notification.toggleRead();
      return;
    }

    void notification.markAsRead();

    onNavigate();
  };

  const handleApprove = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!accessRequestId || processing) {
        return;
      }

      setProcessing(true);
      try {
        await documents.client.post("/accessRequests.approve", {
          id: accessRequestId,
          permission: selectedPermission,
        });
        ui.showToast(t("Access request approved"), { type: "success" });
        void notification.markAsRead();
      } catch (_error) {
        ui.showToast(t("Failed to approve access request"), { type: "error" });
      } finally {
        setProcessing(false);
      }
    },
    [
      accessRequestId,
      selectedPermission,
      processing,
      documents.client,
      ui,
      t,
      notification,
    ]
  );

  const handleDismiss = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!accessRequestId || processing) {
        return;
      }

      setProcessing(true);
      try {
        await documents.client.post("/accessRequests.dismiss", {
          id: accessRequestId,
        });
        ui.showToast(t("Access request dismissed"), { type: "success" });
        void notification.markAsRead();
      } catch (_error) {
        ui.showToast(t("Failed to dismiss access request"), { type: "error" });
      } finally {
        setProcessing(false);
      }
    },
    [accessRequestId, processing, documents.client, ui, t, notification]
  );

  const permissionOptions = React.useMemo(() => {
    const options = [
      {
        label: t("View"),
        value: notification.documentId
          ? DocumentPermission.Read
          : CollectionPermission.Read,
      },
      {
        label: t("Edit"),
        value: notification.documentId
          ? DocumentPermission.ReadWrite
          : CollectionPermission.ReadWrite,
      },
      {
        label: t("Admin"),
        value: notification.documentId
          ? DocumentPermission.Admin
          : CollectionPermission.Admin,
      },
    ];
    return options;
  }, [notification.documentId, t]);

  const menuAction = React.useMemo(
    () =>
      createActionWithChildren({
        name: ({ t }) => t("Notification options"),
        section: NotificationSection,
        children: [
          notificationMarkRead(notification),
          notificationMarkUnread(notification),
          notificationArchive(notification),
        ],
      }),
    [notification]
  );

  return (
    <ContextMenu action={menuAction} ariaLabel={t("Notification options")}>
      <StyledLink to={notification.path ?? ""} onClick={handleClick}>
        <Container gap={8} $unread={!notification.viewedAt}>
          <StyledAvatar model={notification.actor} />
          <Flex column style={{ flex: 1 }}>
            <Text as="div" size="small">
              <Text weight="bold">
                {notification.actor?.name ?? t("Unknown")}
              </Text>{" "}
              {notification.eventText(t)}{" "}
              <Text weight="bold">{notification.subject}</Text>
            </Text>
            <Text type="tertiary" size="xsmall">
              <Time dateTime={notification.createdAt} addSuffix />{" "}
              {collection && <>&middot; {collection.name}</>}
            </Text>
            {notification.comment && (
              <StyledCommentEditor
                defaultValue={toJS(notification.comment.data)}
              />
            )}
            {isAccessRequest && !notification.viewedAt && (
              <AccessRequestActions gap={8}>
                <PermissionSelectWrapper className="permission-select">
                  <InputMemberPermissionSelect
                    value={selectedPermission}
                    onChange={(value) =>
                      setSelectedPermission(
                        value as CollectionPermission | DocumentPermission
                      )
                    }
                    permissions={permissionOptions}
                    disabled={processing}
                  />
                </PermissionSelectWrapper>
                <ActionButton
                  onClick={handleApprove}
                  disabled={processing}
                  neutral
                >
                  {t("Approve")}
                </ActionButton>
                <ActionButton
                  onClick={handleDismiss}
                  disabled={processing}
                  neutral
                >
                  {t("Dismiss")}
                </ActionButton>
              </AccessRequestActions>
            )}
          </Flex>
          {notification.viewedAt ? null : <UnreadBadge style={{ right: 12 }} />}
        </Container>
      </StyledLink>
    </ContextMenu>
  );
}

const StyledLink = styled(Link)`
  display: block;
  margin: 0 8px;
  cursor: var(--pointer);
`;

const StyledCommentEditor = styled(CommentEditor)`
  font-size: 0.9em;
  margin-top: 4px;

  ${truncateMultiline(3)}
`;

const StyledAvatar = styled(Avatar).attrs({
  variant: AvatarVariant.Round,
  size: AvatarSize.Medium,
})`
  margin-top: 4px;
`;

const Container = styled(Flex)<{ $unread: boolean }>`
  position: relative;
  padding: 8px 12px;
  padding-right: 40px;
  border-radius: 4px;

  ${StyledLink}[data-state=open] &,
  &:${hover},
  &:active {
    background: ${s("listItemHoverBackground")};
  }
`;

const AccessRequestActions = styled(Flex)`
  margin-top: 8px;
  align-items: center;
`;

const PermissionSelectWrapper = styled.div`
  flex: 1;
  min-width: 100px;
`;

const ActionButton = styled(Button)`
  padding: 6px 12px;
  font-size: 13px;
`;

export default observer(NotificationListItem);
