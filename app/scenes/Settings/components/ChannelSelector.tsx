import { CheckmarkIcon, EmailIcon, ChevronDownIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { NotificationChannelType } from "@shared/types";
import SlackIcon from "~/../../plugins/slack/client/Icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/primitives/Popover";
import Tooltip from "~/components/Tooltip";
import { undraggableOnDesktop } from "~/styles";

type Channel = {
  type: NotificationChannelType;
  label: string;
  icon: React.ReactElement;
  disabled?: boolean;
};

type Props = {
  value: NotificationChannelType[];
  onChange: (channels: NotificationChannelType[]) => void;
  slackDisabled?: boolean;
};

/**
 * A dropdown selector for managing notification channel preferences.
 * Displays enabled channels and allows toggling via a popover menu.
 */
function ChannelSelector({ value, onChange, slackDisabled = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const channels: Channel[] = React.useMemo(
    () => [
      {
        type: NotificationChannelType.Email,
        label: t("Email"),
        icon: <EmailIcon size={16} />,
      },
      {
        type: NotificationChannelType.Chat,
        label: t("Slack"),
        icon: <SlackIcon size={16} />,
        disabled: slackDisabled,
      },
    ],
    [t, slackDisabled]
  );

  const handleToggle = React.useCallback(
    (channelType: NotificationChannelType) => {
      const newValue = value.includes(channelType)
        ? value.filter((c) => c !== channelType)
        : [...value, channelType];
      onChange(newValue);
    },
    [value, onChange]
  );

  // Filter out disabled channels from value to ensure consistency
  const filteredValue = React.useMemo(() => {
    return value.filter((channelType) => {
      const channel = channels.find((c) => c.type === channelType);
      return channel && !channel.disabled;
    });
  }, [value, channels]);

  const displayText = React.useMemo(() => {
    if (filteredValue.length === 0) {
      return t("No channels");
    }
    if (filteredValue.length === channels.filter(c => !c.disabled).length) {
      return t("All channels");
    }
    return channels
      .filter((c) => filteredValue.includes(c.type))
      .map((c) => c.label)
      .join(", ");
  }, [filteredValue, channels, t]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <SelectorButton
          type="button"
          aria-label={t("Select notification channels")}
          $hasValue={filteredValue.length > 0}
        >
          <ButtonText>{displayText}</ButtonText>
          <ChevronDownIcon size={16} />
        </SelectorButton>
      </PopoverTrigger>
      <PopoverContent width={220} shrink align="end">
        <MenuContainer>
          {channels.map((channel) => {
            const isSelected = filteredValue.includes(channel.type);
            const channelOption = (
              <ChannelOption
                key={channel.type}
                type="button"
                onClick={() => !channel.disabled && handleToggle(channel.type)}
                disabled={channel.disabled}
                $selected={isSelected}
                aria-label={`${isSelected ? t("Disable") : t("Enable")} ${
                  channel.label
                }`}
              >
                <ChannelIconWrapper>{channel.icon}</ChannelIconWrapper>
                <ChannelLabel>{channel.label}</ChannelLabel>
                <CheckWrapper>
                  {isSelected && <CheckmarkIcon size={16} />}
                </CheckWrapper>
              </ChannelOption>
            );

            // Show tooltip for disabled Slack option
            if (channel.disabled && channel.type === NotificationChannelType.Chat) {
              return (
                <Tooltip
                  key={channel.type}
                  content={t("Link your Slack account to enable Slack notifications")}
                  placement="left"
                >
                  <div>{channelOption}</div>
                </Tooltip>
              );
            }

            return channelOption;
          })}
        </MenuContainer>
      </PopoverContent>
    </Popover>
  );
}

const SelectorButton = styled.button<{ $hasValue: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  min-width: 140px;
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  border-radius: 6px;
  color: ${(props) =>
    props.$hasValue ? props.theme.text : props.theme.textTertiary};
  font-size: 14px;
  font-weight: 500;
  cursor: var(--pointer);
  transition: all 0.15s ease-in-out;
  ${undraggableOnDesktop()}

  &:hover {
    border-color: ${s("inputBorderFocused")};
    background: ${s("secondaryBackground")};
  }

  &:focus {
    outline: none;
    border-color: ${s("accent")};
    box-shadow: 0 0 0 2px ${(props) => props.theme.accentBackground};
  }

  svg {
    flex-shrink: 0;
    opacity: 0.7;
  }
`;

const ButtonText = styled.span`
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ChannelOption = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: ${(props) => (props.disabled ? "default" : "var(--pointer)")};
  color: ${(props) =>
    props.disabled ? props.theme.textTertiary : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  transition: background-color 0.1s ease-in-out;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  ${undraggableOnDesktop()}

  &:hover:not(:disabled) {
    background: ${s("listItemHoverBackground")};
  }

  &:active:not(:disabled) {
    background: ${s("listItemPressedBackground")};
  }
`;

const ChannelIconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
`;

const ChannelLabel = styled.span`
  flex: 1;
`;

const CheckWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: ${s("accent")};
`;

export default ChannelSelector;
