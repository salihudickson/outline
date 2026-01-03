import * as React from "react";
import * as Components from "../components/Menu";
import { CheckmarkIcon } from "outline-icons";
import type { LocationDescriptor } from "history";
import Tooltip from "~/components/Tooltip";

/**
 * InlineMenu is a menu component that displays its content directly without
 * requiring a trigger element. This is useful for cases where you want to show
 * menu items immediately, such as when clicking a table row grip.
 *
 * Unlike the standard Menu component which uses Radix UI's dropdown/context menu
 * primitives (requiring Root + Trigger + Content), InlineMenu just renders the
 * menu content directly.
 */

type BaseItemProps = {
  label: string;
  icon?: React.ReactElement;
  disabled?: boolean;
};

type InlineMenuButtonProps = BaseItemProps & {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  tooltip?: React.ReactNode;
  selected?: boolean;
  dangerous?: boolean;
};

export const InlineMenuButton = React.forwardRef<
  HTMLButtonElement,
  InlineMenuButtonProps
>((props, ref) => {
  const { label, icon, tooltip, disabled, selected, dangerous, onClick } =
    props;

  const button = (
    <Components.MenuButton
      ref={ref}
      disabled={disabled}
      $dangerous={dangerous}
      onClick={onClick}
    >
      {icon}
      <Components.MenuLabel>{label}</Components.MenuLabel>
      {selected !== undefined && (
        <Components.SelectedIconWrapper aria-hidden>
          {selected ? <CheckmarkIcon size={18} /> : null}
        </Components.SelectedIconWrapper>
      )}
    </Components.MenuButton>
  );

  return tooltip ? (
    <Tooltip content={tooltip} placement="bottom">
      {button}
    </Tooltip>
  ) : (
    button
  );
});
InlineMenuButton.displayName = "InlineMenuButton";

type InlineMenuInternalLinkProps = BaseItemProps & {
  to: LocationDescriptor;
};

export const InlineMenuInternalLink = React.forwardRef<
  HTMLAnchorElement,
  InlineMenuInternalLinkProps
>((props, ref) => {
  const { label, icon, disabled, to } = props;

  return (
    <Components.MenuInternalLink ref={ref} to={to} disabled={disabled}>
      {icon}
      <Components.MenuLabel>{label}</Components.MenuLabel>
    </Components.MenuInternalLink>
  );
});
InlineMenuInternalLink.displayName = "InlineMenuInternalLink";

type InlineMenuExternalLinkProps = BaseItemProps & {
  href: string;
  target?: string;
};

export const InlineMenuExternalLink = React.forwardRef<
  HTMLAnchorElement,
  InlineMenuExternalLinkProps
>((props, ref) => {
  const { label, icon, disabled, href, target } = props;

  return (
    <Components.MenuExternalLink
      ref={ref}
      href={href}
      target={target}
      disabled={disabled}
    >
      {icon}
      <Components.MenuLabel>{label}</Components.MenuLabel>
    </Components.MenuExternalLink>
  );
});
InlineMenuExternalLink.displayName = "InlineMenuExternalLink";

export const InlineMenuSeparator = React.forwardRef<HTMLHRElement>((_, ref) => (
  <Components.MenuSeparator ref={ref} />
));
InlineMenuSeparator.displayName = "InlineMenuSeparator";

type InlineMenuContentProps = {
  children: React.ReactNode;
  "aria-label"?: string;
  maxHeight?: string;
  transformOrigin?: string;
};

/**
 * Container for inline menu content. Provides the same styling as regular
 * menu content but without the Radix UI portal/positioning logic.
 */
export const InlineMenuContent = React.forwardRef<
  HTMLDivElement,
  InlineMenuContentProps
>((props, ref) => {
  const {
    children,
    "aria-label": ariaLabel,
    maxHeight = "85vh",
    transformOrigin = "top left",
  } = props;

  return (
    <Components.MenuContent
      ref={ref}
      aria-label={ariaLabel}
      maxHeightVar="--inline-menu-max-height"
      transformOriginVar="--inline-menu-transform-origin"
      hiddenScrollbars
      style={{
        // Set CSS variables for styling compatibility
        ["--inline-menu-max-height" as string]: maxHeight,
        ["--inline-menu-transform-origin" as string]: transformOrigin,
      }}
    >
      {children}
    </Components.MenuContent>
  );
});
InlineMenuContent.displayName = "InlineMenuContent";
