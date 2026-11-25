import { Component, createSignal, createEffect, onSettled, onCleanup, Show } from 'solid-js';
import { Link } from './Link.tsx';
import AdSense from './AdSense.tsx';
import type { JSX } from '@solidjs/web';
import confetti from 'canvas-confetti';
import {
  ArrowLeftIcon,
  RotateCcwIcon,
  MaximizeIcon,
  InfoIcon,
  VolumeIcon,
  VolumeXIcon,
  AwardIcon,
  GamepadIcon,
  TrophyIcon,
  ShareIcon,
} from './Icons.tsx';
import { sound } from '../utils/sound.ts';
import { t, getLang, getDefaultInstructions } from '../utils/i18n.ts';
import { LanguageSelector } from './LanguageSelector.tsx';
import { getLocalizedGame } from '../utils/gameTranslations.ts';
import {
  recordGameStart,
  updateHighScore,
  recordGamePlay,
  getGameStats,
} from '../utils/storage.ts';

interface GameShellProps {
  id: string;
  title: string;
  instructions: string[];
  score?: number;
  isGameOver?: boolean;
  isVictory?: boolean;
  gameOverTitle?: string;
  gameOverMessage?: string;
  victoryTitle?: string;
  victoryMessage?: string;
  onRestart: () => void;
  onNextStage?: () => void;
  nextStageLabel?: string;
  children: JSX.Element;
  extraControls?: JSX.Element;
}

export const GameShell: Component<GameShellProps> = (props) => {
  const [showHelp, setShowHelp] = createSignal(false);
  const [isMuted, setIsMuted] = createSignal(sound.getMuted());
  const [isNewRecord, setIsNewRecord] = createSignal(false);
  const [stats, setStats] = createSignal(getGameStats(props.id));
  const [viewportHeight, setViewportHeight] = createSignal<string>('100dvh');
  const [shareCopied, setShareCopied] = createSignal(false);

  let containerRef: HTMLDivElement | undefined;

  const localizedMeta = () =>
    getLocalizedGame(props.id, {
      title: props.title,
      titleJp: props.title,
      description: '',
    });

  const handleShare = async () => {
    sound.playPop(520);
    const gameTitle = localizedMeta().title;
    const title = `${gameTitle} - BlossomsArchive Games`;
    const scoreText = props.score !== undefined ? ` [${t('score')}: ${props.score}]` : '';
    const resultText = props.isVictory ? ` ${t('victory')}` : '';
    const text = `${gameTitle}${scoreText}${resultText}\nBlossomsArchive Games - Web Mini Games\n`;
    const url = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(`${text}${url}`);
        copied = true;
      } catch {}
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = `${text}${url}`;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copied = true;
      } catch {}
    }

    if (copied) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  const toggleSound = () => {
    const next = !isMuted();
    setIsMuted(next);
    sound.setMuted(next);
    sound.playPop(520);
  };

  const toggleFullscreen = () => {
    sound.playPop(500);
    if (!document.fullscreenElement) {
      containerRef?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ゲームオーバーまたは勝利時のスコア記録 & 演出
  const handleGameEnd = (isVictory: boolean) => {
    if (props.score !== undefined) {
      const res = recordGamePlay(props.id, props.score, isVictory);
      setIsNewRecord(res.isNewHighScore);
      setStats(getGameStats(props.id));
    }
    if (isVictory || isNewRecord()) {
      sound.playVictory();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fb7185', '#f43f5e', '#fbbf24', '#38bdf8', '#a855f7'],
      });
    } else {
      sound.playGameOver();
    }
  };

  let prevGameOver = false;
  let prevVictory = false;

  // ゲーム開始・マウント時にプレイ回数を加算
  onSettled(() => {
    recordGameStart(props.id);
    setStats(getGameStats(props.id));
  });

  // ビューポート追従 & キーボード押し上げ防止 & クリーンアップ
  if (typeof window !== 'undefined') {
    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      } else {
        setViewportHeight(`${window.innerHeight}px`);
      }
    };

    updateViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);

    // モバイル仮想キーボード表示時にヘッダーが画面外へ押し上げられるのを防止
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
        });
      }
    };
    window.addEventListener('focusin', handleFocusIn);

    // ゲーム画面表示中は外側の余計なバウンス・スクロールを抑止
    document.body.classList.add('overflow-hidden');

    onCleanup(() => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('focusin', handleFocusIn);
      document.body.classList.remove('overflow-hidden');
    });
  }

  // リアルタイムハイスコア自動保存
  createEffect(
    () => props.score,
    (score) => {
      if (score !== undefined && score > 0) {
        if (updateHighScore(props.id, score)) {
          setIsNewRecord(true);
          setStats(getGameStats(props.id));
        }
      }
    }
  );

  // ゲームオーバー / 勝利状態のリアクティブ検知
  createEffect(
    () => ({ isGameOver: Boolean(props.isGameOver), isVictory: Boolean(props.isVictory) }),
    ({ isGameOver, isVictory }) => {
      if (isVictory && !prevVictory) {
        prevVictory = true;
        handleGameEnd(true);
      } else if (isGameOver && !prevGameOver) {
        prevGameOver = true;
        handleGameEnd(false);
      } else if (!isGameOver && !isVictory) {
        prevGameOver = false;
        prevVictory = false;
        setIsNewRecord(false);
      }
    }
  );

  // リスタート処理
  const handleRestart = () => {
    recordGameStart(props.id);
    setStats(getGameStats(props.id));
    prevGameOver = false;
    prevVictory = false;
    setIsNewRecord(false);
    props.onRestart();
  };

  return (
    <div
      ref={containerRef}
      style={{ height: viewportHeight() }}
      class="fixed inset-0 w-full flex flex-col items-center justify-between bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-1 sm:p-2.5 pt-[max(0.35rem,env(safe-area-inset-top))] pb-[max(0.35rem,env(safe-area-inset-bottom))] pl-[max(0.35rem,env(safe-area-inset-left))] pr-[max(0.35rem,env(safe-area-inset-right))] select-none overflow-hidden overscroll-none"
    >
      {/* 上部ヘッダーコントロール */}
      <header class="w-full max-w-4xl shrink-0 flex items-center justify-between py-1.5 px-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-1">
        <Link
          href="/"
          onClick={() => sound.playPop(400)}
          class="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon size={18} />
          <span>{t('backToList')}</span>
        </Link>

        <div class="text-center">
          <h1 class="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 justify-center">
            {localizedMeta().title}
          </h1>
          <Show when={props.score !== undefined}>
            <div class="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{t('score')}: <strong class="text-slate-900 dark:text-white font-bold">{props.score}</strong></span>
              <span>{t('highScore')}: <strong class="text-slate-700 dark:text-slate-300">{stats().highScore}</strong></span>
            </div>
          </Show>
        </div>

        <div class="flex items-center gap-1">
          <LanguageSelector />
          <button
            onClick={() => {
              sound.playPop(450);
              setShowHelp(true);
            }}
            title={t('howToPlay')}
            class="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <InfoIcon size={18} />
          </button>
          <button
            onClick={toggleSound}
            title={isMuted() ? t('soundUnmute') : t('soundMute')}
            class="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Show when={isMuted()} fallback={<VolumeIcon size={18} />}>
              <VolumeXIcon size={18} class="text-slate-400" />
            </Show>
          </button>
          <button
            onClick={handleShare}
            title={t('shareResult')}
            class="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ShareIcon size={18} />
          </button>
          <button
            onClick={() => {
              sound.playPop(420);
              handleRestart();
            }}
            title={t('retryStage')}
            class="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcwIcon size={18} />
          </button>
          <button
            onClick={toggleFullscreen}
            title="Fullscreen"
            class="p-2 hidden sm:flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <MaximizeIcon size={18} />
          </button>
        </div>
      </header>

      {/* ゲームコンテンツ本体: ビューポート高さを最大限に活用 */}
      <main class="w-full flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-hidden">
        {props.children}
      </main>

      {/* 画面下の追加コントロール */}
      <Show when={props.extraControls}>
        <div class="w-full max-w-4xl shrink-0 mt-1 flex items-center justify-center">
          {props.extraControls}
        </div>
      </Show>

      {/* フッターコピーライト */}
      <footer class="hidden sm:block mt-0.5 text-[9px] text-slate-400 dark:text-slate-500 text-center select-none shrink-0">
        ©2017 - {new Date().getFullYear()} BlossomsArchive
      </footer>

      {/* 遊び方・ルールモーダル */}
      <Show when={showHelp()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
              <InfoIcon class="text-slate-600 dark:text-slate-300" size={20} />
              {localizedMeta().title} {t('howToPlay')}
            </h3>

            {/* ゲーム概要説明 */}
            <div class="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 mb-4">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {t('gameOverview')}
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {localizedMeta().description}
              </p>
            </div>

            {/* 操作・ルール手順リスト */}
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t('rulesHeader')}
            </div>
            <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-6">
              {(() => {
                const lang = getLang();
                const meta = localizedMeta();
                const customInstructions = meta.instructions && meta.instructions.length > 0 ? meta.instructions : null;
                const items = customInstructions || (lang === 'ja' ? props.instructions : getDefaultInstructions(lang));
                return items.map((item, idx) => (
                  <li class="flex items-start gap-2">
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span class="text-xs leading-relaxed">{item}</span>
                  </li>
                ));
              })()}
            </ul>
            <AdSense class="my-3 min-h-[100px]" />
            <button
              onClick={() => {
                sound.playPop(480);
                setShowHelp(false);
              }}
              class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </Show>

      {/* ゲームオーバー / 勝利モーダル */}
      <Show when={props.isGameOver || props.isVictory}>
        <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div class="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Show when={props.isVictory} fallback={<GamepadIcon size={32} class="text-slate-400" />}>
                <TrophyIcon size={32} class="text-amber-500 animate-spin-slow" />
              </Show>
            </div>

            <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">
              {props.isVictory
                ? props.victoryTitle || t('victory')
                : props.gameOverTitle || t('gameOver')}
            </h2>

            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {props.isVictory
                ? props.victoryMessage || t('clearMessage')
                : props.gameOverMessage || t('playAgain')}
            </p>

            <Show when={props.score !== undefined}>
              <div class="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 mb-5 border border-slate-200 dark:border-slate-700">
                <div class="text-xs text-slate-500 dark:text-slate-400">{t('finalScore')}</div>
                <div class="text-3xl font-black text-slate-900 dark:text-white tracking-tight my-0.5">
                  {props.score}
                </div>
                <Show when={isNewRecord()}>
                  <div class="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full mt-1">
                    <AwardIcon size={14} />
                    {t('newRecord')}
                  </div>
                </Show>
              </div>
            </Show>

            <div class="flex flex-col gap-2.5">
              <Show when={props.isVictory && props.onNextStage}>
                <button
                  onClick={() => {
                    sound.playPop(520);
                    props.onNextStage!();
                  }}
                  class="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <span>{props.nextStageLabel || t('nextStage')}</span>
                </button>
              </Show>
              <button
                onClick={handleShare}
                class="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <ShareIcon size={16} />
                <span>{shareCopied() ? t('shareCopied') : t('shareResult')}</span>
              </button>
              <button
                onClick={() => {
                  sound.playPop(520);
                  handleRestart();
                }}
                class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <RotateCcwIcon size={16} />
                {t('retryStage')}
              </button>
              <Link
                href="/"
                onClick={() => sound.playPop(400)}
                class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
              >
                {t('backToList')}
              </Link>
            </div>

            {/* ゲーム終了時 AdSense 広告 */}
            <AdSense class="mt-4 min-h-[120px]" />
          </div>
        </div>
      </Show>

      {/* 共有完了トースト通知 */}
      <Show when={shareCopied()}>
        <div class="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold animate-in fade-in duration-150">
          {t('shareCopied')}
        </div>
      </Show>
    </div>
  );
};
