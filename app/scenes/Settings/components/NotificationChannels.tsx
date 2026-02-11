import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import SlackIcon from "~/../../plugins/slack/client/Icon";
import Switch from "~/components/Switch";
import { undraggableOnDesktop } from "~/styles";

type Props = {
  emailChecked: boolean;
  slackChecked: boolean;
  onEmailChange: (checked: boolean) => void;
  onSlackChange: (checked: boolean) => void;
  eventId: string;
  slackDisabled?: boolean;
};

/**
 * Component for managing notification channel preferences (Email and Slack).
 * Displays switches in a clean, table-like layout with channel icons.
 */
function NotificationChannels({
  emailChecked,
  slackChecked,
  onEmailChange,
  onSlackChange,
  eventId,
  slackDisabled = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <Container>
      <ChannelGroup>
        <ChannelLabel htmlFor={`${eventId}-email`}>
          <IconWrapper>
            <EmailIcon size={16} />
          </IconWrapper>
          <ChannelName>{t("Email")}</ChannelName>
        </ChannelLabel>
        <Switch
          id={`${eventId}-email`}
          name={`${eventId}-email`}
          checked={emailChecked}
          onChange={onEmailChange}
        />
      </ChannelGroup>

      <ChannelGroup>
        <ChannelLabel htmlFor={`${eventId}-slack`} $disabled={slackDisabled}>
          <IconWrapper>
            <SlackIcon size={16} />
          </IconWrapper>
          <ChannelName>{t("Slack")}</ChannelName>
        </ChannelLabel>
        <Switch
          id={`${eventId}-slack`}
          name={`${eventId}-slack`}
          checked={slackChecked}
          onChange={onSlackChange}
          disabled={slackDisabled}
        />
      </ChannelGroup>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  gap: 32px;
  align-items: center;
  ${undraggableOnDesktop()}
`;

const ChannelGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 80px;
`;

const ChannelLabel = styled.label<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${(props) =>
    props.$disabled ? props.theme.textTertiary : props.theme.textSecondary};
  cursor: ${(props) => (props.$disabled ? "default" : "var(--pointer)")};
  user-select: none;
  transition: color 0.1s ease-in-out;

  &:hover {
    color: ${(props) =>
      props.$disabled ? props.theme.textTertiary : props.theme.text};
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
`;

const ChannelName = styled.span`
  white-space: nowrap;
`;

export default NotificationChannels;
