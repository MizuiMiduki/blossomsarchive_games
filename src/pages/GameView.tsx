import { Component, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Link } from '../components/Link.tsx';
import { GAMES } from '../games/registry.ts';
import { GamepadIcon } from '../components/Icons.tsx';

export const GameView: Component = () => {
  const params = useParams();
  const game = () => GAMES.find((g) => g.id === params.id);

  return (
    <Show
      when={game()}
      fallback={
        <div class="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50 dark:bg-slate-950">
          <GamepadIcon size={48} class="text-slate-400 mb-4" />
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            ゲームが見つかりませんでした
          </h2>
          <p class="text-xs text-slate-500 mb-4">
            指定されたゲームは存在しないか、現在準備中です。
          </p>
          <Link
            href="/"
            class="px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold text-xs shadow-xs hover:bg-slate-800 dark:hover:bg-white transition-all"
          >
            ゲーム一覧へ戻る
          </Link>
        </div>
      }
    >
      {(item) => {
        const Comp = item().component;
        return <Comp />;
      }}
    </Show>
  );
};
