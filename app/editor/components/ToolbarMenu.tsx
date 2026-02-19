import { useCallback, useMemo } from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import * as Toolbar from "@radix-ui/react-toolbar";
import type { MenuItem } from "@shared/editor/types";
import { hideScrollbars, s } from "@shared/styles";
import { TooltipProvider } from "~/components/TooltipContext";
import type { MenuItem as TMenuItem } from "~/types";
import { useEditor } from "./EditorContext";
import { MediaDimension } from "./MediaDimension";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";
import Tooltip from "./Tooltip";
import { toMenuItems } from "~/components/Menu/transformer";
import { MenuContent } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { Menu, MenuTrigger } from "~/components/primitives/Menu";
import { useTranslation } from "react-i18next";
import EventBoundary from "@shared/components/EventBoundary";

type Props = {
  items: MenuItem[];
};

/*
 * Renders a dropdown menu in the floating toolbar.
 */
function ToolbarDropdown(props: { active: boolean; item: MenuItem }) {
  const { commands, view } = useEditor();
  const { t } = useTranslation();
  const { item } = props;
  const { state } = view;

  const items: TMenuItem[] = useMemo(
    () => (item.children ? mapMenuItems(item.children, commands, state) : []),
    [item.children, commands, state]
  );

  const handleCloseAutoFocus = useCallback((ev: Event) => {
    ev.stopImmediatePropagation();
  }, []);

  return (
    <MenuProvider variant="dropdown">
      <Menu>
        <MenuTrigger>
          <ToolbarButton aria-label={item.label ? undefined : item.tooltip}>
            {item.label && <Label>{item.label}</Label>}
            {item.icon}
          </ToolbarButton>
        </MenuTrigger>
        <MenuContent
          align="end"
          aria-label={item.tooltip || t("More options")}
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <EventBoundary>{toMenuItems(items)}</EventBoundary>
        </MenuContent>
      </Menu>
    </MenuProvider>
  );
}

function ToolbarMenu(props: Props) {
  const { commands, view } = useEditor();
  const { items } = props;
  const { state } = view;

  const handleClick = (item: MenuItem) => () => {
    if (!item.name) {
      return;
    }

    // if item has an associated onClick prop, run it
    if (item.onClick) {
      item.onClick();
      return;
    }

    // otherwise, run the associated editor command
    commands[item.name](
      typeof item.attrs === "function" ? item.attrs(state) : item.attrs
    );
  };

  return (
    <TooltipProvider>
      <Toolbar.Root asChild>
        <FlexibleWrapper>
          {items.map((item, index) => {
            if (item.name === "separator" && item.visible !== false) {
              return <ToolbarSeparator key={index} />;
            }
            if (item.visible === false || (!item.skipIcon && !item.icon)) {
              return null;
            }
            const isActive = item.active ? item.active(state) : false;

            return (
              <Tooltip
                key={index}
                shortcut={item.shortcut}
                content={item.label === item.tooltip ? undefined : item.tooltip}
              >
                {item.name === "dimensions" ? (
                  <MediaDimension key={index} />
                ) : item.children ? (
                  <ToolbarDropdown
                    active={isActive && !item.label}
                    item={item}
                  />
                ) : (
                  <Toolbar.Button asChild>
                    <ToolbarButton
                      onClick={handleClick(item)}
                      active={isActive && !item.label}
                      aria-label={item.label ? undefined : item.tooltip}
                    >
                      {item.label && <Label>{item.label}</Label>}
                      {item.icon}
                    </ToolbarButton>
                  </Toolbar.Button>
                )}
              </Tooltip>
            );
          })}
        </FlexibleWrapper>
      </Toolbar.Root>
    </TooltipProvider>
  );
}

export const mapMenuItems = (
  children: MenuItem[],
  commands: Record<string, Function>,
  state: any,
  parentId = "0"
): TMenuItem[] => {
  const handleClick = (menuItem: MenuItem) => () => {
    if (!menuItem.name) {
      return;
    }

    if (commands[menuItem.name]) {
      commands[menuItem.name](
        typeof menuItem.attrs === "function"
          ? menuItem.attrs(state)
          : menuItem.attrs
      );
    } else if (menuItem.onClick) {
      menuItem.onClick();
    }
  };

  return children.map((child, idx) => {
    if (child.name === "separator") {
      return { type: "separator", visible: child.visible };
    }

    const id = `${parentId}-${idx}`;
    if (child.children?.length) {
      return {
        id,
        type: "submenu",
        title: child.label || child.tooltip,
        icon: child.icon,
        visible: child.visible,
        disabled: child.disabled,
        items: mapMenuItems(child.children, commands, state, id),
      };
    }

    return {
      id,
      type: "button",
      title: child.label,
      icon: child.icon,
      dangerous: child.dangerous,
      visible: child.visible,
      selected: child.active !== undefined ? child.active(state) : undefined,
      onClick: handleClick(child),
    };
  });
};

const FlexibleWrapper = styled.div`
  color: ${s("textSecondary")};
  overflow: hidden;
  display: flex;
  gap: 6px;
  padding: 6px;

  ${breakpoint("mobile", "tablet")`
    justify-content: space-evenly;
    align-items: center;
    overflow-x: auto;
    gap: 10px;

    ${hideScrollbars()}
  `}
`;

const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: ${s("text")};
`;

export default ToolbarMenu;
