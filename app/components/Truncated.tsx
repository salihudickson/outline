import * as React from "react";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import { ReadMoreButton } from "./ReadMoreButton";

interface Props {
  /**
   * Maximum height in pixels before the content is truncated and the
   * "Read more" button is shown. Defaults to 200.
   */
  maxHeight?: number;
  /** The content to potentially truncate. */
  children: React.ReactNode;
  /** Additional class name applied to the root element. */
  className?: string;
}

/**
 * A wrapper component that truncates its children to a maximum height and
 * reveals a floating "Read more" button when truncation is active. Clicking
 * the button removes the height constraint so the full content is visible.
 *
 * @param props - component props.
 * @returns the truncated content wrapper.
 */
export function Truncated({ maxHeight = 200, children, className }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // The ResizeObserver inside the effect fires whenever the content element
  // changes size (including when children change their rendered dimensions),
  // so children does not need to be listed as an explicit dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) {
      return;
    }

    const checkTruncation = () => {
      const truncated = el.scrollHeight > maxHeight;
      setIsTruncated(truncated);
      // Reset the expanded flag when content is no longer truncated so that
      // if it later grows again the "Read more" button reappears correctly.
      if (!truncated) {
        setExpanded(false);
      }
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);

    return () => observer.disconnect();
  }, [maxHeight]);

  const handleReadMore = React.useCallback(() => {
    setExpanded(true);
  }, []);

  const showButton = isTruncated && !expanded;

  return (
    <Wrapper className={className} $showGradient={showButton}>
      <Content ref={contentRef} $maxHeight={maxHeight} $truncated={showButton}>
        {children}
      </Content>
      {showButton && (
        <ButtonOverlay>
          <ReadMoreButton onClick={handleReadMore} />
        </ButtonOverlay>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $showGradient: boolean }>`
  position: relative;

  ${({ $showGradient }) =>
    $showGradient &&
    css`
      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 80px;
        background: linear-gradient(
          to bottom,
          transparent,
          ${s("background")}
        );
        pointer-events: none;
      }
    `}
`;

const Content = styled.div<{ $maxHeight: number; $truncated: boolean }>`
  ${({ $truncated, $maxHeight }) =>
    $truncated &&
    css`
      overflow: hidden;
      max-height: ${$maxHeight}px;
    `}
`;

const ButtonOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding-bottom: 12px;
  z-index: 1;
`;
