import { Component, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { GAMES } from '../games/registry.ts';

export const GameView: Component = () => {
  const params = useParams();
  const game = () => GAMES.find((g) => g.id === params.id);

  return (
    <Show
      when={game() && game()?.component}
      fallback={
        <div class="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50 dark:bg-slate-950">
          <div class="text-5xl mb-4">🍂</div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            ゲームが見つかりませんでした
          </h2>
          <p class="text-xs text-slate-500 mb-4">
            指定されたゲームは存在しないか、現在準備中です。
          </p>
          <a
            href="/"
            class="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-500/25"
          >
            ゲーム一覧へ戻る
          </a>
        </div>
      }
    >
      {(g) => {
        const Comp = g().component!;
        return <Comp />;
      }}
    </Show>
  );
};
