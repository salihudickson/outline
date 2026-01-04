import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as Components from "../components/Menu";
import type { LocationDescriptor } from "history";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Tooltip from "~/components/Tooltip";
import { CheckmarkIcon } from "outline-icons";
import { useMenuContext } from "./MenuContext";

type MenuProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Root
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Root> & {
    children: React.ReactNode;
  };

const Menu = ({ children, ...rest }: MenuProps) => {
  const { variant } = useMenuContext();

  // For inline variant, just render children directly without any wrapper
  // (no Radix wrapper, no Drawer on mobile - just direct rendering)
  if (variant === "inline") {
    return <>{children}</>;
  }

  const Root =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Root
      : ContextMenuPrimitive.Root;

  return <Root {...rest}>{children}</Root>;
};

type SubMenuProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Sub
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Sub>;

const SubMenu = ({ children, ...rest }: SubMenuProps) => {
  const { variant } = useMenuContext();

  const Sub =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Sub
      : ContextMenuPrimitive.Sub;

  return <Sub {...rest}>{children}</Sub>;
};

type TriggerProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Trigger
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>;

const MenuTrigger = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Trigger>
  | React.ElementRef<typeof ContextMenuPrimitive.Trigger>,
  TriggerProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { children, ...rest } = props;

  const Trigger =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Trigger
      : ContextMenuPrimitive.Trigger;

  return (
    <Trigger ref={ref} {...rest} asChild>
      {children}
    </Trigger>
  );
});
MenuTrigger.displayName = "MenuTrigger";

type ContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>;

const MenuContent = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Content>
  | React.ElementRef<typeof ContextMenuPrimitive.Content>
  | HTMLDivElement,
  ContentProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { children, ...rest } = props;

  // For inline variant, render content directly without Portal
  // (same on both mobile and desktop - just inline rendering)
  if (variant === "inline") {
    const contentProps = {
      maxHeightVar: "--inline-menu-max-height",
      transformOriginVar: "--inline-menu-transform-origin",
    };

    return (
      <InlineMenuContentWrapper
        ref={ref as React.Ref<HTMLDivElement>}
        {...contentProps}
        hiddenScrollbars
        style={{
          ["--inline-menu-max-height" as string]: "85vh",
          ["--inline-menu-transform-origin" as string]: "top left",
        }}
      >
        {children}
      </InlineMenuContentWrapper>
    );
  }

  const Portal =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Portal
      : ContextMenuPrimitive.Portal;

  const Content =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Content
      : ContextMenuPrimitive.Content;

  const offsetProp =
    variant === "dropdown" ? { sideOffset: 4 } : { alignOffset: 4 };

  const contentProps = {
    maxHeightVar:
      variant === "dropdown"
        ? "--radix-dropdown-menu-content-available-height"
        : "--radix-context-menu-content-available-height",
    transformOriginVar:
      variant === "dropdown"
        ? "--radix-dropdown-menu-content-transform-origin"
        : "--radix-context-menu-content-transform-origin",
  };

  return (
    <Portal>
      <Content ref={ref} {...offsetProp} {...rest} collisionPadding={6} asChild>
        <Components.MenuContent {...contentProps} hiddenScrollbars>
          {children}
        </Components.MenuContent>
      </Content>
    </Portal>
  );
});
MenuContent.displayName = "MenuContent";

type SubMenuTriggerProps = BaseItemProps &
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>;

const SubMenuTrigger = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>
  | React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  SubMenuTriggerProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { label, icon, disabled, ...rest } = props;

  const Trigger =
    variant === "dropdown"
      ? DropdownMenuPrimitive.SubTrigger
      : ContextMenuPrimitive.SubTrigger;

  return (
    <Trigger ref={ref} {...rest} asChild>
      <Components.MenuSubTrigger disabled={disabled}>
        {icon}
        <Components.MenuLabel>{label}</Components.MenuLabel>
        <Components.MenuDisclosure />
      </Components.MenuSubTrigger>
    </Trigger>
  );
});
SubMenuTrigger.displayName = "SubMenuTrigger";

type SubMenuContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubContent
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>;

const SubMenuContent = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.SubContent>
  | React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  SubMenuContentProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { children, ...rest } = props;

  const Portal =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Portal
      : ContextMenuPrimitive.Portal;

  const Content =
    variant === "dropdown"
      ? DropdownMenuPrimitive.SubContent
      : ContextMenuPrimitive.SubContent;

  const contentProps = {
    maxHeightVar:
      variant === "dropdown"
        ? "--radix-dropdown-menu-content-available-height"
        : "--radix-context-menu-content-available-height",
    transformOriginVar:
      variant === "dropdown"
        ? "--radix-dropdown-menu-content-transform-origin"
        : "--radix-context-menu-content-transform-origin",
  };

  return (
    <Portal>
      <Content ref={ref} {...rest} collisionPadding={6} asChild>
        <Components.MenuContent {...contentProps} hiddenScrollbars>
          {children}
        </Components.MenuContent>
      </Content>
    </Portal>
  );
});
SubMenuContent.displayName = "SubMenuContent";

type MenuGroupProps = {
  label: string;
  items: React.ReactNode[];
} & Omit<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>,
  "children" | "asChild"
> &
  Omit<
    React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>,
    "children" | "asChild"
  >;

const MenuGroup = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Group>
  | React.ElementRef<typeof ContextMenuPrimitive.Group>
  | HTMLDivElement,
  MenuGroupProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { label, items, ...rest } = props;

  // For inline variant, render group without Radix wrapper
  if (variant === "inline") {
    return (
      <div ref={ref as React.Ref<HTMLDivElement>} {...rest}>
        <MenuLabel>{label}</MenuLabel>
        {items}
      </div>
    );
  }

  const Group =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Group
      : ContextMenuPrimitive.Group;

  return (
    <Group ref={ref} {...rest}>
      <MenuLabel>{label}</MenuLabel>
      {items}
    </Group>
  );
});
MenuGroup.displayName = "MenuGroup";

type BaseItemProps = {
  label: string;
  icon?: React.ReactElement;
  disabled?: boolean;
};

type MenuButtonProps = BaseItemProps & {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  tooltip?: React.ReactChild;
  selected?: boolean;
  dangerous?: boolean;
} & Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  > &
  Omit<
    React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const MenuButton = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Item>
  | React.ElementRef<typeof ContextMenuPrimitive.Item>
  | HTMLButtonElement,
  MenuButtonProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const {
    label,
    icon,
    tooltip,
    disabled,
    selected,
    dangerous,
    onClick,
    ...rest
  } = props;

  // Common button content
  const buttonContent = (
    <>
      {icon}
      <Components.MenuLabel>{label}</Components.MenuLabel>
      {selected !== undefined && (
        <Components.SelectedIconWrapper aria-hidden>
          {selected ? <CheckmarkIcon size={18} /> : null}
        </Components.SelectedIconWrapper>
      )}
    </>
  );

  // For inline variant, render button directly without Radix Item wrapper
  if (variant === "inline") {
    const button = (
      <InlineMenuButton
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={disabled}
        $dangerous={dangerous}
        onClick={onClick}
      >
        {buttonContent}
      </InlineMenuButton>
    );

    return tooltip ? (
      <Tooltip content={tooltip} placement="bottom">
        <div>{button}</div>
      </Tooltip>
    ) : (
      <>{button}</>
    );
  }

  const Item =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Item
      : ContextMenuPrimitive.Item;

  const button = (
    <Item ref={ref} disabled={disabled} {...rest} asChild>
      <Components.MenuButton
        disabled={disabled}
        $dangerous={dangerous}
        onClick={onClick}
      >
        {buttonContent}
      </Components.MenuButton>
    </Item>
  );

  return tooltip ? (
    <Tooltip content={tooltip} placement="bottom">
      <div>{button}</div>
    </Tooltip>
  ) : (
    <>{button}</>
  );
});
MenuButton.displayName = "MenuButton";

type MenuInternalLinkProps = BaseItemProps & {
  to: LocationDescriptor;
} & Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  > &
  Omit<
    React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const MenuInternalLink = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Item>
  | React.ElementRef<typeof ContextMenuPrimitive.Item>,
  MenuInternalLinkProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { label, icon, disabled, to, ...rest } = props;

  const Item =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Item
      : ContextMenuPrimitive.Item;

  return (
    <Item ref={ref} disabled={disabled} {...rest} asChild>
      <Components.MenuInternalLink to={to} disabled={disabled}>
        {icon}
        <Components.MenuLabel>{label}</Components.MenuLabel>
      </Components.MenuInternalLink>
    </Item>
  );
});
MenuInternalLink.displayName = "MenuInternalLink";

type MenuExternalLinkProps = BaseItemProps & {
  href: string;
  target?: string;
} & Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  > &
  Omit<
    React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>,
    "children" | "asChild" | "onClick"
  >;

const MenuExternalLink = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Item>
  | React.ElementRef<typeof ContextMenuPrimitive.Item>,
  MenuExternalLinkProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { label, icon, disabled, href, target, ...rest } = props;

  const Item =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Item
      : ContextMenuPrimitive.Item;

  return (
    <Item ref={ref} disabled={disabled} {...rest} asChild>
      <Components.MenuExternalLink
        href={href}
        target={target}
        disabled={disabled}
      >
        {icon}
        <Components.MenuLabel>{label}</Components.MenuLabel>
      </Components.MenuExternalLink>
    </Item>
  );
});
MenuExternalLink.displayName = "MenuExternalLink";

type MenuSeparatorProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Separator
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>;

const MenuSeparator = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Separator>
  | React.ElementRef<typeof ContextMenuPrimitive.Separator>
  | HTMLHRElement,
  MenuSeparatorProps
>((props, ref) => {
  const { variant } = useMenuContext();

  // For inline variant, render separator directly without Radix wrapper
  if (variant === "inline") {
    return <Components.MenuSeparator ref={ref as React.Ref<HTMLHRElement>} />;
  }

  const Separator =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Separator
      : ContextMenuPrimitive.Separator;

  return (
    <Separator ref={ref} {...props} asChild>
      <Components.MenuSeparator />
    </Separator>
  );
});
MenuSeparator.displayName = "MenuSeparator";

type MenuLabelProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>;

const MenuLabel = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Label>
  | React.ElementRef<typeof ContextMenuPrimitive.Label>
  | HTMLHeadingElement,
  MenuLabelProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { children, ...rest } = props;

  // For inline variant, render label without Radix wrapper
  if (variant === "inline") {
    return (
      <Components.MenuHeader ref={ref as React.Ref<HTMLHeadingElement>} {...rest}>
        {children}
      </Components.MenuHeader>
    );
  }

  const Label =
    variant === "dropdown"
      ? DropdownMenuPrimitive.Label
      : ContextMenuPrimitive.Label;

  return (
    <Label ref={ref} {...rest} asChild>
      <Components.MenuHeader>{children}</Components.MenuHeader>
    </Label>
  );
});
MenuLabel.displayName = "MenuLabel";

// Styled wrapper for inline menu content with mobile-specific overrides
const InlineMenuContentWrapper = styled(Components.MenuContent)`
  ${breakpoint("mobile", "tablet")`
    // On mobile/tablet, remove width constraints and make it full-width
    min-width: auto;
    max-width: none;
    width: 100%;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
  `}
`;

// Styled button for inline menu with hover states (since Radix doesn't provide data-highlighted)
const InlineMenuButton = styled(Components.MenuButton)`
  &:hover:not(:disabled) {
    color: ${(props) => props.theme.accentText};
    background: ${(props) =>
      props.$dangerous ? props.theme.danger : props.theme.accent};
    outline-color: ${(props) =>
      props.$dangerous ? props.theme.danger : props.theme.accent};
    box-shadow: none;
    cursor: var(--pointer);

    svg:not([data-fixed-color]) {
      color: ${(props) => props.theme.accentText};
      fill: ${(props) => props.theme.accentText};
    }
  }

  &:focus-visible:not(:disabled) {
    color: ${(props) => props.theme.accentText};
    background: ${(props) =>
      props.$dangerous ? props.theme.danger : props.theme.accent};
    outline-color: ${(props) =>
      props.$dangerous ? props.theme.danger : props.theme.accent};
    box-shadow: none;

    svg:not([data-fixed-color]) {
      color: ${(props) => props.theme.accentText};
      fill: ${(props) => props.theme.accentText};
    }
  }
`;

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuButton,
  MenuInternalLink,
  MenuExternalLink,
  MenuSeparator,
  MenuGroup,
  MenuLabel,
  SubMenu,
  SubMenuTrigger,
  SubMenuContent,
};
