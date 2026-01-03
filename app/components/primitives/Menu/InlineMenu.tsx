import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import * as Components from "../components/Menu";
import { CheckmarkIcon } from "outline-icons";
import type { MenuItem } from "@shared/editor/types";
import type { EditorState } from "prosemirror-state";

/**
 * InlineMenu is a menu component that displays its content directly without
 * requiring a trigger element. This is useful for cases where you want to show
 * menu items immediately, such as when clicking a table row grip.
 *
 * Unlike the standard Menu component which uses Radix UI's dropdown/context menu
 * primitives (requiring Root + Trigger + Content), InlineMenu just renders the
 * menu content directly with proper styling and hover states.
 */

type InlineMenuProps = {
  item: MenuItem;
  state: EditorState;
  handleClick: (menuItem: MenuItem) => () => void;
  "aria-label"?: string;
};

/**
 * InlineMenu component that renders menu items directly without a trigger.
 * Accepts a MenuItem with children and renders them with proper styling.
 */
export const InlineMenu = React.forwardRef<HTMLDivElement, InlineMenuProps>(
  (props, ref) => {
    const { item, state, handleClick, "aria-label": ariaLabel } = props;

    if (!item.children) {
      return null;
    }

    // Filter out invisible items
    const visibleChildren = item.children.filter(
      (child) => child.visible !== false
    );

    // Check if any child has an icon to determine if we should reserve space for icons
    const hasIcons = visibleChildren.some(
      (child) => child.name !== "separator" && child.icon
    );

    return (
      <StyledMenuContent
        ref={ref}
        aria-label={ariaLabel}
        maxHeightVar="--inline-menu-max-height"
        transformOriginVar="--inline-menu-transform-origin"
        hiddenScrollbars
        style={{
          // Set CSS variables for styling compatibility
          ["--inline-menu-max-height" as string]: "85vh",
          ["--inline-menu-transform-origin" as string]: "top left",
        }}
      >
        {visibleChildren.map((child, index) => {
          if (child.name === "separator") {
            return <Components.MenuSeparator key={index} />;
          }

          const selected =
            child.active !== undefined ? child.active(state) : undefined;

          // Reserve space for icon if any child has an icon
          const icon = hasIcons ? (
            <Components.MenuIconWrapper aria-hidden>
              {child.icon || null}
            </Components.MenuIconWrapper>
          ) : (
            child.icon
          );

          return (
            <Components.MenuButton
              key={index}
              disabled={child.disabled}
              $dangerous={child.dangerous}
              onClick={handleClick(child)}
            >
              {icon}
              <Components.MenuLabel>
                {child.label || child.tooltip || ""}
              </Components.MenuLabel>
              {selected !== undefined && (
                <Components.SelectedIconWrapper aria-hidden>
                  {selected ? <CheckmarkIcon size={18} /> : null}
                </Components.SelectedIconWrapper>
              )}
            </Components.MenuButton>
          );
        })}
      </StyledMenuContent>
    );
  }
);
InlineMenu.displayName = "InlineMenu";

// Styled wrapper for MenuContent with mobile-specific overrides
const StyledMenuContent = styled(Components.MenuContent)`
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
