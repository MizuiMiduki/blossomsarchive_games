import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  Stone,
  createEmptyGomokuBoard,
  checkWin,
  chooseGomokuMove,
} from './logic.ts';

export const GomokuGame: Component = () => {
  const [board, setBoard] = createSignal<(Stone | null)[][]>(createEmptyGomokuBoard());
  const [turn, setTurn] = createSignal<Stone>('black');
  const [playerStone, setPlayerStone] = createSignal<Stone>('black');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [winningLine, setWinningLine] = createSignal<[number, number][] | null>(null);
  const [lastMove, setLastMove] = createSignal<[number, number] | null>(null);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

  const restart = () => {
    setBoard(createEmptyGomokuBoard());
    setTurn('black');
    setIsAiThinking(false);
    setWinningLine(null);
    setLastMove(null);
    setIsGameOver(false);
    setIsVictory(false);

    if (playerStone() === 'white') {
      triggerAiMove(createEmptyGomokuBoard(), 'black');
    }
  };

  const triggerAiMove = (currentBoard: (Stone | null)[][], aiStone: Stone) => {
    setIsAiThinking(true);
    setTimeout(() => {
      const move = chooseGomokuMove(currentBoard, aiStone, difficulty());
      if (!move) return;

      const [r, c] = move;
      const nextBoard = currentBoard.map((row) => [...row]);
      nextBoard[r][c] = aiStone;
      setBoard(nextBoard);
      setLastMove([r, c]);
      sound.playPop(380);

      const winLine = checkWin(nextBoard, r, c, aiStone);
      if (winLine) {
        setWinningLine(winLine);
        setIsGameOver(true);
        setIsVictory(false);
        setIsAiThinking(false);
        return;
      }

      setTurn(playerStone());
      setIsAiThinking(false);
    }, 500);
  };

  const handleCellClick = (r: number, c: number) => {
    if (isAiThinking() || isGameOver() || turn() !== playerStone()) return;
    const currentBoard = board();
    if (currentBoard[r][c]) return;

    const nextBoard = currentBoard.map((row) => [...row]);
    nextBoard[r][c] = playerStone();
    setBoard(nextBoard);
    setLastMove([r, c]);
    sound.playPop(520);

    const winLine = checkWin(nextBoard, r, c, playerStone());
    if (winLine) {
      setWinningLine(winLine);
      setIsGameOver(true);
      setIsVictory(true);
      return;
    }

    const aiStone: Stone = playerStone() === 'black' ? 'white' : 'black';
    setTurn(aiStone);
    triggerAiMove(nextBoard, aiStone);
  };

  onSettled(() => {
    restart();
  });

  const instructions = [
    '縦・横・斜めのいずれかに自分の石を「連続して5つ」並べると勝利です。',
    '相手の4連や3連を見逃さずに阻止しつつ、自分の連を広げましょう！',
    '【NPC対戦】初級・中級・上級からNPCの強さを選んで対局できます。',
  ];

  return (
    <GameShell
      id="gomoku-garden"
      title="Gomoku (五目並べ)"
      score={isVictory() ? (difficulty() === 'hard' ? 3000 : difficulty() === 'normal' ? 1500 : 800) : 0}
      isGameOver={isGameOver() && !isVictory()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <span class="font-bold text-slate-500 pl-1">強さ:</span>
          {(['easy', 'normal', 'hard'] as const).map((diff) => (
            <button
              onClick={() => {
                if (difficulty() !== diff) {
                  sound.playPop(450);
                  setDifficulty(diff);
                  restart();
                }
              }}
              class={`px-2.5 py-1 rounded-xl font-semibold transition-all ${
                difficulty() === diff
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {diff === 'easy' ? '初級' : diff === 'normal' ? '中級' : '上級'}
            </button>
          ))}
          <div class="w-px h-4 bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => {
              const next: Stone = playerStone() === 'black' ? 'white' : 'black';
              sound.playPop(420);
              setPlayerStone(next);
              restart();
            }}
            class="px-2.5 py-1 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
          >
            {playerStone() === 'black' ? '先手 (黒)' : '後手 (白)'}
          </button>
        </div>
      }
    >
      {/* 手番ステータス */}
      <div class="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
        <span>手番:</span>
        <span class={`font-bold ${turn() === playerStone() ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
          {isAiThinking() ? '相手が思考中...' : turn() === playerStone() ? 'あなたの番です' : '相手の番'}
        </span>
      </div>

      {/* 碁盤 (13x13) */}
      <div class="w-full max-w-[360px] aspect-square bg-amber-100 dark:bg-amber-950/80 p-2 rounded-2xl shadow-xl border-4 border-amber-300/60 dark:border-amber-900/60 select-none">
        <div class="grid grid-cols-13 grid-rows-13 gap-0 w-full h-full border border-amber-800/40 dark:border-amber-700/40 relative">
          <For each={board()}>
            {(row, rIdx) => (
              <For each={row}>
                {(cell, cIdx) => {
                  const isLast = () => lastMove() && lastMove()![0] === rIdx() && lastMove()![1] === cIdx();
                  const isWinning = () =>
                    winningLine() &&
                    winningLine()!.some(([wr, wc]) => wr === rIdx() && wc === cIdx());

                  return (
                    <button
                      onClick={() => handleCellClick(rIdx(), cIdx())}
                      class="relative w-full h-full flex items-center justify-center border-r border-b border-amber-800/25 dark:border-amber-700/25 hover:bg-amber-200/50 dark:hover:bg-amber-900/50"
                    >
                      <Show when={cell}>
                        <div
                          class={`w-[82%] h-[82%] rounded-full shadow-md flex items-center justify-center transition-all ${
                            cell === 'black'
                              ? 'bg-slate-950 border border-slate-900 text-white shadow-slate-900/40'
                              : 'bg-white border border-slate-300 text-slate-900 shadow-slate-400/20'
                          } ${isWinning() ? 'ring-2 ring-emerald-500 animate-bounce' : ''}`}
                        >
                          <Show when={isLast()}>
                            <div class="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          </Show>
                        </div>
                      </Show>
                    </button>
                  );
                }}
              </For>
            )}
          </For>
        </div>
      </div>
    </GameShell>
  );
};
