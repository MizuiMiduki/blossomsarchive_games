import { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  class?: string;
  children: JSX.Element;
  onClick?: (e: MouseEvent) => void;
}

export const Link: Component<LinkProps> = (props) => {
  const handleClick = (e: MouseEvent) => {
    if (props.onClick) {
      props.onClick(e);
    }
    // ページ遷移時にブラウザをフルリロードして広告・メモリ・状態を確実に再初期化
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      window.location.href = props.href;
    }
  };

  return (
    <a {...props} onClick={handleClick}>
      {props.children}
    </a>
  );
};
