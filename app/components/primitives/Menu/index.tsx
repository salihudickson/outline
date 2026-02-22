import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as Components from "../components/Menu";
import type { LocationDescriptor } from "history";
import * as React from "react";
import styled from "styled-components";
import Tooltip from "~/components/Tooltip";
import { CheckmarkIcon } from "outline-icons";
import { useMenuContext } from "./MenuContext";
import useMobile from "~/hooks/useMobile";
import { Drawer, DrawerContent } from "../Drawer";
import Scrollable from "~/components/Scrollable";
import { Portal as ReactPortal } from "~/components/Portal";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import { MenuType } from "@shared/editor/types";

type MenuProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Root
> &
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Root> & {
    children: React.ReactNode;
  };

const Menu = ({ children, ...rest }: MenuProps) => {
  const { variant } = useMenuContext();
  const isMobile = useMobile();

  if (variant === MenuType.inline) {
    return isMobile ? (
      <Drawer open={true} modal={false}>
        {children}
      </Drawer>
    ) : (
      <>{children}</>
    );
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
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Sub> & {
    children: React.ReactNode;
  };

const SubMenu = ({ children, ...rest }: SubMenuProps) => {
  const { variant } = useMenuContext();

  // For inline variant, provide custom submenu context
  if (variant === MenuType.inline) {
    return <div>{children}</div>;
  }

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
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content> & {
    pos?: {
      top: number;
      left: number;
    };
  };

const MenuContent = React.forwardRef<
  | React.ElementRef<typeof DropdownMenuPrimitive.Content>
  | React.ElementRef<typeof ContextMenuPrimitive.Content>
  | HTMLDivElement,
  ContentProps
>((props, ref) => {
  const { variant, mainMenuRef } = useMenuContext();
  const isMobile = useMobile();

  const { children, ...rest } = props;
  const contentRef = React.useRef<React.ElementRef<typeof DrawerContent>>(null);

  const enablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "auto";
    }
  }, []);

  const disablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "none";
    }
  }, []);

  if (variant === MenuType.inline) {
    const contentProps = {
      maxHeightVar: "--inline-menu-max-height",
      transformOriginVar: "--inline-menu-transform-origin",
    };
    const { pos } = props;

    return isMobile ? (
      <DrawerContent
        ref={contentRef}
        aria-label={rest["aria-label"]}
        onAnimationStart={disablePointerEvents}
        onAnimationEnd={enablePointerEvents}
      >
        <StyledScrollable hiddenScrollbars overflow="scroll">
          {children}
        </StyledScrollable>
      </DrawerContent>
    ) : (
      <ReactPortal>
        <InlineMenuContentWrapper
          ref={(node) => {
            // Set the main menu ref for submenu positioning
            if (mainMenuRef) {
              (
                mainMenuRef as React.MutableRefObject<HTMLElement | null>
              ).current = node;
            }
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current =
                node;
            }
          }}
          {...contentProps}
          {...rest}
          hiddenScrollbars
          style={{
            top: pos?.top,
            left: pos?.left,
          }}
        >
          {children}
        </InlineMenuContentWrapper>
      </ReactPortal>
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

const SubMenuTrigger = React.forwardRef<HTMLDivElement, BaseItemProps>(
  (props, ref) => {
    const { variant, setActiveSubmenu, addSubmenuTriggerRef } =
      useMenuContext();
    const { label, icon, disabled, id, ...rest } = props;
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const isMobile = useMobile();

    React.useEffect(() => {
      if (id && triggerRef.current) {
        addSubmenuTriggerRef(id, triggerRef);
      }
    }, [triggerRef, id, addSubmenuTriggerRef]);

    if (variant === MenuType.inline) {
      return (
        <Components.MenuSubTrigger
          ref={triggerRef}
          disabled={disabled}
          onClick={() => {
            if (!disabled && id && isMobile) {
              setActiveSubmenu(id);
            }
          }}
          onMouseEnter={() => {
            if (!disabled && id && !isMobile) {
              setActiveSubmenu(id);
            }
          }}
        >
          {icon}
          <Components.MenuLabel style={{ marginRight: 20 }}>
            {label}
          </Components.MenuLabel>
          <Components.MenuDisclosure />
        </Components.MenuSubTrigger>
      );
    }

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
  }
);
SubMenuTrigger.displayName = "SubMenuTrigger";

type SubMenuContentProps = React.HTMLAttributes<HTMLDivElement> & {
  onFocusOutside?: (ev: Event) => void;
};

const SubMenuContent = React.forwardRef<HTMLDivElement, SubMenuContentProps>(
  (props, ref) => {
    const submenuRef = React.useRef<HTMLDivElement | null>(null);
    const {
      variant,
      activeSubmenu,
      submenuTriggerRefs,
      submenuContentRefs,
      addSubmenuContentRef,
      mainMenuRef,
      setActiveSubmenu,
    } = useMenuContext();
    const { children, id, ...rest } = props;
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const isMobile = useMobile();

    // Register this submenu's content ref so siblings/parents can detect clicks inside it.
    React.useEffect(() => {
      if (id) {
        addSubmenuContentRef(id, submenuRef);
      }
    }, [id, addSubmenuContentRef]);

    // Smart click-outside: skip when click landed inside a descendant submenu; otherwise
    // close to the deepest ancestor submenu that contains the click, or null for root.
    const handleClickOutside = React.useCallback(
      (event: MouseEvent | TouchEvent) => {
        const isInsideDescendant =
          id &&
          Object.entries(submenuContentRefs).some(
            ([refId, contentRef]) =>
              refId !== id &&
              refId.startsWith(id + "-") &&
              contentRef.current?.contains(event.target as Node)
          );
        if (isInsideDescendant) {
          return;
        }

        // Walk up the id hierarchy to find the deepest ancestor submenu containing the click.
        let targetSubmenu: string | null = null;
        if (id) {
          const parts = id.split("-");
          for (let len = parts.length - 1; len >= 2; len--) {
            const ancestorId = parts.slice(0, len).join("-");
            const ancestorRef = submenuContentRefs[ancestorId];
            if (ancestorRef?.current?.contains(event.target as Node)) {
              targetSubmenu = ancestorId;
              break;
            }
          }
        }

        setActiveSubmenu(targetSubmenu);
      },
      [id, submenuContentRefs, setActiveSubmenu]
    );

    useOnClickOutside(submenuRef, handleClickOutside);

    React.useEffect(() => {
      const trigger = submenuTriggerRefs[id ?? ""];

      if (trigger?.current) {
        const triggerRect = trigger.current.getBoundingClientRect();
        const parentId = id ? getParentSubmenuId(id) : null;
        const anchorRect = (
          parentId ? submenuContentRefs[parentId]?.current : mainMenuRef.current
        )?.getBoundingClientRect();
        const subMenuRect = submenuRef.current?.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        const spaceOnRight = viewportWidth - triggerRect.right;
        const anchorWidth = anchorRect?.width;
        const submenuWidth = subMenuRect?.width;

        const marginRightForUX = 20;
        const offsetLeftForUX = parentId ? 95 : 75;
        const offsetRightForUX = parentId ? 75 : 65;

        let left = triggerRect.left - offsetLeftForUX;

        // Check if there's enough space on the right
        if (
          submenuWidth &&
          anchorWidth &&
          spaceOnRight < submenuWidth + marginRightForUX
        ) {
          left =
            triggerRect.left - submenuWidth - anchorWidth - offsetRightForUX;
        }

        setPosition({
          top: triggerRect.top,
          left,
        });
      }
    }, [
      variant,
      activeSubmenu,
      submenuTriggerRefs,
      mainMenuRef,
      id,
      submenuContentRefs,
    ]);

    const enablePointerEvents = React.useCallback(() => {
      if (submenuRef.current) {
        submenuRef.current.style.pointerEvents = "auto";
      }
    }, []);

    const disablePointerEvents = React.useCallback(() => {
      if (submenuRef.current) {
        submenuRef.current.style.pointerEvents = "none";
      }
    }, []);

    if (variant === MenuType.inline) {
      const isVisible =
        activeSubmenu === id ||
        (id !== undefined && activeSubmenu?.startsWith(id + "-"));
      if (!isVisible) {
        return null;
      }

      const contentProps = {
        maxHeightVar: "--inline-menu-max-height",
        transformOriginVar: "--inline-menu-transform-origin",
      };

      if (isMobile) {
        if (activeSubmenu !== id) {
          return <>{children}</>;
        }

        return (
          <DrawerContent
            ref={(node) => {
              submenuRef.current = node;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                (ref as React.MutableRefObject<HTMLDivElement | null>).current =
                  node;
              }
            }}
            aria-label={rest["aria-label"]}
            onAnimationStart={disablePointerEvents}
            onAnimationEnd={enablePointerEvents}
            style={
              activeSubmenu !== id ? { display: "none" } : { marginBottom: 1 }
            }
          >
            <StyledScrollable hiddenScrollbars overflow="scroll">
              {children}
            </StyledScrollable>
          </DrawerContent>
        );
      }

      return (
        <ReactPortal>
          <InlineSubMenuContentWrapper
            ref={(node) => {
              submenuRef.current = node;
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                (ref as React.MutableRefObject<HTMLDivElement | null>).current =
                  node;
              }
            }}
            {...contentProps}
            {...rest}
            hiddenScrollbars
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {children}
          </InlineSubMenuContentWrapper>
        </ReactPortal>
      );
    }

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
  }
);
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
  id?: string;
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
  | React.ElementRef<typeof ContextMenuPrimitive.Item>,
  MenuButtonProps
>((props, ref) => {
  const { variant, activeSubmenu, setActiveSubmenu } = useMenuContext();
  const [active, setActive] = React.useState(false);
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

  if (variant === MenuType.inline) {
    const button = (
      <Components.MenuButton
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={disabled}
        $dangerous={dangerous}
        $active={active}
        onClick={() => {
          onClick;
        }}
        onMouseEnter={() => {
          setActive(true);
          if (props.id) {
            const parentId = getParentSubmenuId(props.id);
            if (activeSubmenu && activeSubmenu !== parentId) {
              setActiveSubmenu(parentId);
            }
          } else if (activeSubmenu) {
            setActiveSubmenu(null);
          }
        }}
        onMouseLeave={() => setActive(false)}
      >
        {buttonContent}
      </Components.MenuButton>
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

  if (variant === MenuType.inline) {
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
  | React.ElementRef<typeof ContextMenuPrimitive.Label>,
  MenuLabelProps
>((props, ref) => {
  const { variant } = useMenuContext();
  const { children, ...rest } = props;

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

const getParentSubmenuId = (id: string): string | null => {
  const parts = id.split("-");
  return parts.length > 2 ? parts.slice(0, -1).join("-") : null;
};

const InlineMenuContentWrapper = styled(Components.MenuContent)`
  position: absolute;
  height: fit-content;
  --inline-menu-max-height: 85vh;
  --inline-menu-transform-origin: top left;
  z-index: 1000;
`;

const InlineSubMenuContentWrapper = styled(Components.MenuContent)`
  position: absolute;
  height: fit-content;
  --inline-menu-max-height: 85vh;
  --inline-menu-transform-origin: top left;
  z-index: 1001; /* Higher than main menu */
`;

// Styled scrollable for mobile drawer content
const StyledScrollable = styled(Scrollable)`
  max-height: 75vh;
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
