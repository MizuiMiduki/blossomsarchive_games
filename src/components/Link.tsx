import { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useNavigate } from '@solidjs/router';

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  class?: string;
  children: JSX.Element;
  onClick?: (e: MouseEvent) => void;
}

export const Link: Component<LinkProps> = (props) => {
  const navigate = useNavigate();

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) {
      props.onClick(e);
    }
    // Only intercept normal left clicks without modifier keys
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigate(props.href);
    }
  };

  return (
    <a {...props} onClick={handleClick}>
      {props.children}
    </a>
  );
};
