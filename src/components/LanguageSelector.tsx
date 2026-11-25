import { Component, createSignal, onCleanup, onSettled, For, Show } from 'solid-js';
import { GlobeIcon } from './Icons.tsx';
import { getLang, setLang, LANG_OPTIONS, SupportedLang, t } from '../utils/i18n.ts';
import { sound } from '../utils/sound.ts';

export const LanguageSelector: Component<{ class?: string }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let menuRef: HTMLDivElement | undefined;

  const currentOption = () => LANG_OPTIONS.find((o) => o.code === getLang()) || LANG_OPTIONS[0];

  const handleSelect = (code: SupportedLang) => {
    sound.playPop(520);
    setLang(code);
    setIsOpen(false);

    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const segments = pathname.split('/').filter(Boolean);
      const isKnownLangPrefix = LANG_OPTIONS.some((o) => o.code.toLowerCase() === segments[0]?.toLowerCase());
      const restSegments = isKnownLangPrefix ? segments.slice(1) : segments;

      let newPath = '/';
      if (code === 'ja') {
        newPath = restSegments.length > 0 ? `/${restSegments.join('/')}` : '/';
      } else {
        newPath = restSegments.length > 0 ? `/${code}/${restSegments.join('/')}` : `/${code}`;
      }

      const targetUrl = newPath + window.location.search;
      if (window.location.pathname !== newPath) {
        window.location.href = targetUrl;
      }
    }
  };

  const handleToggle = () => {
    sound.playPop(480);
    setIsOpen((prev) => !prev);
  };

  onSettled(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    onCleanup(() => window.removeEventListener('click', handleOutsideClick));
  });

  return (
    <div ref={menuRef} class={`relative inline-block text-left ${isOpen() ? 'z-50' : 'z-20'} ${props.class || ''}`}>
      <button
        onClick={handleToggle}
        title={t('selectLang')}
        aria-label={t('selectLang')}
        class="px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs select-none cursor-pointer"
      >
        <GlobeIcon size={16} class="text-slate-500 dark:text-slate-400" />
        <span class="text-sm leading-none">{currentOption().flag}</span>
        <span class="hidden md:inline text-[11px] font-medium">{currentOption().nativeLabel}</span>
      </button>

      <Show when={isOpen()}>
        <div class="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div class="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
            {t('selectLang')}
          </div>
          <For each={LANG_OPTIONS}>
            {(opt) => {
              const isSelected = () => getLang() === opt.code;
              return (
                <button
                  onClick={() => handleSelect(opt.code)}
                  class={`w-full px-3 py-1.5 text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                    isSelected()
                      ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span class="flex items-center gap-2">
                    <span class="text-base leading-none">{opt.flag}</span>
                    <span>{opt.nativeLabel}</span>
                  </span>
                  <Show when={isSelected()}>
                    <span class="text-[11px] text-emerald-600 dark:text-emerald-400">✓</span>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};
