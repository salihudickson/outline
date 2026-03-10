import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";

interface Props {
  /** Callback fired when the button is clicked. */
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  /** Additional class name. */
  className?: string;
}

/**
 * A pill-shaped "Read more" button with a down-arrow icon, intended to be
 * placed at the bottom of truncated content areas so the user can expand them.
 *
 * @param props - component props.
 * @returns the read more button element.
 */
export function ReadMoreButton({ onClick, className }: Props) {
  const { t } = useTranslation();

  return (
    <Button onClick={onClick} className={className} type="button">
      <StyledIcon size={16} />
      {t("Read more")}
    </Button>
  );
}

const StyledIcon = styled(ExpandedIcon)`
  flex-shrink: 0;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 100px;
  border: 1.5px solid ${s("buttonNeutralBorder")};
  background: ${s("background")};
  color: ${s("textSecondary")};
  font-size: 14px;
  font-weight: 500;
  cursor: var(--pointer);
  user-select: none;
  white-space: nowrap;
  transition:
    background 100ms ease-out,
    color 100ms ease-out;

  &:hover {
    background: ${s("buttonNeutralBackground")};
    color: ${s("text")};
  }

  &:focus-visible {
    outline: 2px solid ${s("accent")};
    outline-offset: 2px;
  }
`;
