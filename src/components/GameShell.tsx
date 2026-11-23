import { Component, createSignal, onSettled, Show } from 'solid-js';
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
  SparklesIcon,
} from './Icons.tsx';
import { sound } from '../utils/sound.ts';
import { recordGamePlay, getGameStats } from '../utils/storage.ts';

interface GameShellProps {
  id: string;
  title: string;
  instructions: string[];
  score?: number;
  isGameOver?: boolean;
  isVictory?: boolean;
  onRestart: () => void;
  children: JSX.Element;
  extraControls?: JSX.Element;
}

export const GameShell: Component<GameShellProps> = (props) => {
  const [showHelp, setShowHelp] = createSignal(false);
  const [isMuted, setIsMuted] = createSignal(sound.getMuted());
  const [isNewRecord, setIsNewRecord] = createSignal(false);
  const [stats, setStats] = createSignal(getGameStats(props.id));

  let containerRef: HTMLDivElement | undefined;

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

  const checkStatus = () => {
    if (props.isVictory && !prevVictory) {
      prevVictory = true;
      handleGameEnd(true);
    } else if (props.isGameOver && !prevGameOver) {
      prevGameOver = true;
      handleGameEnd(false);
    } else if (!props.isGameOver && !props.isVictory) {
      prevGameOver = false;
      prevVictory = false;
      setIsNewRecord(false);
    }
  };

  onSettled(() => {
    checkStatus();
  });

  return (
    <div
      ref={containerRef}
      class="flex flex-col items-center justify-between min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-2 sm:p-4 select-none"
    >
      {/* 上部ヘッダーコントロール */}
      <header class="w-full max-w-xl flex items-center justify-between py-2 px-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs mb-3">
        <a
          href="/"
          onClick={() => sound.playPop(400)}
          class="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon size={18} />
          <span>一覧へ</span>
        </a>

        <div class="text-center">
          <h1 class="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 justify-center">
            {props.title}
          </h1>
          <Show when={props.score !== undefined}>
            <div class="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>スコア: <strong class="text-slate-900 dark:text-white font-bold">{props.score}</strong></span>
              <span>最高: <strong class="text-slate-700 dark:text-slate-300">{stats().highScore}</strong></span>
            </div>
          </Show>
        </div>

        <div class="flex items-center gap-1">
          <button
            onClick={() => {
              sound.playPop(450);
              setShowHelp(true);
            }}
            title="遊び方"
            class="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <InfoIcon size={18} />
          </button>
          <button
            onClick={toggleSound}
            title={isMuted() ? 'ミュート解除' : 'ミュート'}
            class="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Show when={isMuted()} fallback={<VolumeIcon size={18} />}>
              <VolumeXIcon size={18} class="text-slate-400" />
            </Show>
          </button>
          <button
            onClick={() => {
              sound.playPop(420);
              props.onRestart();
            }}
            title="リスタート"
            class="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcwIcon size={18} />
          </button>
          <button
            onClick={toggleFullscreen}
            title="全画面"
            class="p-2 hidden sm:flex text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MaximizeIcon size={18} />
          </button>
        </div>
      </header>

      {/* ゲームコンテンツ本体 */}
      <main class="w-full flex-1 flex flex-col items-center justify-center relative">
        {props.children}
      </main>

      {/* 画面下の追加コントロール（Undoボタンなどがあれば） */}
      <Show when={props.extraControls}>
        <div class="w-full max-w-xl mt-3 flex items-center justify-center">
          {props.extraControls}
        </div>
      </Show>

      {/* フッターコピーライト */}
      <footer class="mt-3 text-[10px] text-slate-400 dark:text-slate-500 text-center select-none">
        ©2017 - {new Date().getFullYear()} BlossomsArchive
      </footer>

      {/* 遊び方・ルールモーダル */}
      <Show when={showHelp()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <InfoIcon class="text-slate-600 dark:text-slate-300" size={20} />
              {props.title} の遊び方
            </h3>
            <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-6">
              {props.instructions.map((item, idx) => (
                <li class="flex items-start gap-2">
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                sound.playPop(480);
                setShowHelp(false);
              }}
              class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium shadow-2xs transition-all active:scale-95"
            >
              閉じる
            </button>
          </div>
        </div>
      </Show>

      {/* ゲームオーバー / 勝利モーダル */}
      <Show when={props.isGameOver || props.isVictory}>
        <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-200">
            <div class="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Show when={props.isVictory} fallback={<span class="text-3xl">🎮</span>}>
                <SparklesIcon size={32} class="text-amber-500 animate-spin-slow" />
              </Show>
            </div>

            <h2 class="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">
              {props.isVictory ? 'ステージクリア！' : 'ゲームオーバー'}
            </h2>

            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {props.isVictory ? '素晴らしい！見事クリアしました！' : 'もう一度挑戦してみましょう！'}
            </p>

            <Show when={props.score !== undefined}>
              <div class="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 mb-5 border border-slate-200 dark:border-slate-700">
                <div class="text-xs text-slate-500 dark:text-slate-400">最終スコア</div>
                <div class="text-3xl font-black text-slate-900 dark:text-white tracking-tight my-0.5">
                  {props.score}
                </div>
                <Show when={isNewRecord()}>
                  <div class="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full mt-1">
                    <AwardIcon size={14} />
                    新記録達成！
                  </div>
                </Show>
              </div>
            </Show>

            <div class="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  sound.playPop(520);
                  props.onRestart();
                }}
                class="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcwIcon size={18} />
                もう一度遊ぶ
              </button>
              <a
                href="/"
                onClick={() => sound.playPop(400)}
                class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ゲーム一覧へ戻る
              </a>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
