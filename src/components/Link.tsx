import { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { getLang } from '../utils/i18n.ts';

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  class?: string;
  children: JSX.Element;
  onClick?: (e: MouseEvent) => void;
}

export const Link: Component<LinkProps> = (props) => {
  const getLocalizedHref = () => {
    const lang = getLang();
    const href = props.href;
    if (!href.startsWith('/') || href.startsWith('//') || lang === 'ja') {
      return href;
    }
    if (href.startsWith(`/${lang}/`) || href === `/${lang}`) {
      return href;
    }
    return href === '/' ? `/${lang}` : `/${lang}${href}`;
  };

  const handleClick = (e: MouseEvent) => {
    if (props.onClick) {
      props.onClick(e);
    }
    // ページ遷移時にブラウザをフルリロードして広告・メモリ・状態を確実に再初期化
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      window.location.href = getLocalizedHref();
    }
  };

  return (
    <a {...props} href={getLocalizedHref()} onClick={handleClick}>
      {props.children}
    </a>
  );
};
