import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  ShogiBoard,
  PieceType,
  createInitialShogiBoard,
  getValidShogiMoves,
  chooseShogiMove,
  PIECE_LABELS,
} from './logic.ts';

export const MiniShogiGame: Component = () => {
  const [board, setBoard] = createSignal<ShogiBoard>(createInitialShogiBoard());
  const [playerHand, setPlayerHand] = createSignal<PieceType[]>([]);
  const [aiHand, setAiHand] = createSignal<PieceType[]>([]);
  const [selectedCell, setSelectedCell] = createSignal<[number, number] | null>(null);
  const [selectedHandPiece, setSelectedHandPiece] = createSignal<PieceType | null>(null);
  const [turn, setTurn] = createSignal<'player' | 'ai'>('player');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

  const restart = () => {
    setBoard(createInitialShogiBoard());
    setPlayerHand([]);
    setAiHand([]);
    setSelectedCell(null);
    setSelectedHandPiece(null);
    setTurn('player');
    setIsAiThinking(false);
    setIsGameOver(false);
    setIsVictory(false);
  };

  const triggerAi = (currentBoard: ShogiBoard, currentAiHand: PieceType[], currentPlayerHand: PieceType[]) => {
    setIsAiThinking(true);
    setTimeout(() => {
      const act = chooseShogiMove(currentBoard, currentAiHand, currentPlayerHand, difficulty());
      if (!act) {
        setIsGameOver(true);
        setIsVictory(true);
        setIsAiThinking(false);
        return;
      }

      const nextBoard = currentBoard.map((row) => [...row]);
      let nextAiHand = [...currentAiHand];
      let nextPlayerHand = [...currentPlayerHand];

      if (act.isDrop && act.dropType) {
        nextBoard[act.to[0]][act.to[1]] = {
          id: Date.now(),
          type: act.dropType,
          promoted: false,
          side: 'ai',
        };
        const idx = nextAiHand.indexOf(act.dropType);
        if (idx >= 0) nextAiHand.splice(idx, 1);
        sound.playPop(420);
      } else if (!act.isDrop && act.from) {
        const p = nextBoard[act.from[0]][act.from[1]]!;
        const target = nextBoard[act.to[0]][act.to[1]];

        if (target) {
          nextAiHand.push(target.type);
          sound.playMatch(4);
          if (target.type === 'K') {
            setBoard(nextBoard);
            setIsGameOver(true);
            setIsVictory(false);
            setIsAiThinking(false);
            return;
          }
        } else {
          sound.playPop(420);
        }

        nextBoard[act.from[0]][act.from[1]] = null;
        nextBoard[act.to[0]][act.to[1]] = {
          ...p,
          promoted: p.promoted || !!act.promote,
        };
      }

      setBoard(nextBoard);
      setAiHand(nextAiHand);
      setPlayerHand(nextPlayerHand);
      setTurn('player');
      setIsAiThinking(false);
    }, 600);
  };

  const handleCellClick = (r: number, c: number) => {
    if (turn() !== 'player' || isAiThinking() || isGameOver()) return;

    const currentBoard = board();
    const cell = currentBoard[r][c];
    const sel = selectedCell();
    const handPiece = selectedHandPiece();

    if (handPiece) {
      if (!cell) {
        const nextBoard = currentBoard.map((row) => [...row]);
        nextBoard[r][c] = {
          id: Date.now(),
          type: handPiece,
          promoted: false,
          side: 'player',
        };
        const nextHand = [...playerHand()];
        const idx = nextHand.indexOf(handPiece);
        if (idx >= 0) nextHand.splice(idx, 1);

        setBoard(nextBoard);
        setPlayerHand(nextHand);
        setSelectedHandPiece(null);
        sound.playPop(520);

        setTurn('ai');
        triggerAi(nextBoard, aiHand(), nextHand);
      } else {
        setSelectedHandPiece(null);
      }
      return;
    }

    if (sel) {
      const [sr, sc] = sel;
      const validMoves = getValidShogiMoves(currentBoard, sr, sc);
      const isMoveValid = validMoves.some(([mr, mc]) => mr === r && mc === c);

      if (isMoveValid) {
        const movingPiece = currentBoard[sr][sc]!;
        const targetPiece = currentBoard[r][c];
        const nextBoard = currentBoard.map((row) => [...row]);
        let nextPlayerHand = [...playerHand()];

        if (targetPiece) {
          nextPlayerHand.push(targetPiece.type);
          sound.playMatch(5);
          if (targetPiece.type === 'K') {
            nextBoard[sr][sc] = null;
            nextBoard[r][c] = movingPiece;
            setBoard(nextBoard);
            setPlayerHand(nextPlayerHand);
            setIsGameOver(true);
            setIsVictory(true);
            return;
          }
        } else {
          sound.playPop(500);
        }

        let promoted = movingPiece.promoted;
        if (!promoted && movingPiece.type !== 'K' && movingPiece.type !== 'G' && (r === 0 || sr === 0)) {
          promoted = true;
        }

        nextBoard[sr][sc] = null;
        nextBoard[r][c] = { ...movingPiece, promoted };

        setBoard(nextBoard);
        setPlayerHand(nextPlayerHand);
        setSelectedCell(null);

        setTurn('ai');
        triggerAi(nextBoard, aiHand(), nextPlayerHand);
        return;
      }

      if (cell && cell.side === 'player') {
        setSelectedCell([r, c]);
        sound.playPop(350);
        return;
      }

      setSelectedCell(null);
      return;
    }

    if (cell && cell.side === 'player') {
      setSelectedCell([r, c]);
      setSelectedHandPiece(null);
      sound.playPop(440);
    }
  };

  onSettled(() => {
    restart();
  });

  const instructions = [
    '王・金・銀・角・飛・歩のミニ将棋。相手の「玉」を取ると勝利です！',
    '取った相手の駒は「持ち駒」として空いているマスに打つことができます。',
    '敵陣（一番奥の列）に進むと自動的に強力な駒へ「成る」ことができます。',
    '【NPC対戦】初級・中級・上級からNPCの強さを選んで対局できます。',
  ];

  return (
    <GameShell
      id="mini-shogi"
      title="5×5 ミニ将棋"
      score={isVictory() ? (difficulty() === 'hard' ? 3000 : difficulty() === 'normal' ? 1500 : 800) : 0}
      isGameOver={isGameOver() && !isVictory()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-rose-100 dark:border-slate-800 text-xs">
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
              class={`px-3 py-1 rounded-xl font-bold transition-all ${
                difficulty() === diff
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
              }`}
            >
              {diff === 'easy' ? '🌱 初級' : diff === 'normal' ? '🌸 中級' : '👑 上級'}
            </button>
          ))}
        </div>
      }
    >
      {/* AIの持ち駒 */}
      <div class="w-full max-w-[340px] flex items-center justify-between px-3 py-1.5 bg-amber-100/60 dark:bg-amber-950/40 rounded-xl mb-2 text-xs border border-amber-200/60 dark:border-amber-900/60">
        <span class="font-bold text-slate-600 dark:text-slate-400">相手の持ち駒:</span>
        <div class="flex items-center gap-1 min-h-[26px]">
          <For each={aiHand()}>
            {(p) => (
              <span class="px-1.5 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold">
                {PIECE_LABELS[p].normal}
              </span>
            )}
          </For>
        </div>
      </div>

      {/* 将棋盤 (5x5) */}
      <div class="w-full max-w-[340px] aspect-square bg-amber-200 dark:bg-amber-950 p-2 rounded-2xl shadow-xl border-4 border-amber-400 dark:border-amber-900 select-none">
        <div class="grid grid-cols-5 grid-rows-5 gap-1 w-full h-full bg-amber-300/40 dark:bg-amber-900/40 p-1 rounded-xl">
          <For each={board()}>
            {(row, rIdx) => (
              <For each={row}>
                {(cell, cIdx) => {
                  const isSelected = () =>
                    selectedCell() && selectedCell()![0] === rIdx() && selectedCell()![1] === cIdx();

                  const isValidTarget = () => {
                    if (selectedCell()) {
                      const moves = getValidShogiMoves(board(), selectedCell()![0], selectedCell()![1]);
                      return moves.some(([mr, mc]) => mr === rIdx() && mc === cIdx());
                    }
                    if (selectedHandPiece()) {
                      return cell === null;
                    }
                    return false;
                  };

                  return (
                    <button
                      onClick={() => handleCellClick(rIdx(), cIdx())}
                      class={`relative w-full h-full rounded-lg flex items-center justify-center font-bold text-lg sm:text-xl border transition-all ${
                        isSelected()
                          ? 'bg-amber-100 dark:bg-amber-800 ring-2 ring-rose-500 scale-98 shadow-inner'
                          : isValidTarget()
                          ? 'bg-rose-100/80 dark:bg-rose-950/80 border-rose-400 animate-pulse'
                          : 'bg-amber-100/90 dark:bg-amber-900/60 border-amber-300/60 dark:border-amber-800/60'
                      }`}
                    >
                      <Show when={cell}>
                        <div
                          class={`flex items-center justify-center transform transition-transform ${
                            cell!.side === 'ai' ? 'rotate-180 text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'
                          } ${cell!.promoted ? 'text-rose-600 dark:text-rose-400' : ''}`}
                        >
                          {cell!.promoted ? PIECE_LABELS[cell!.type].promoted : PIECE_LABELS[cell!.type].normal}
                        </div>
                      </Show>
                      <Show when={isValidTarget() && !cell}>
                        <div class="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                      </Show>
                    </button>
                  );
                }}
              </For>
            )}
          </For>
        </div>
      </div>

      {/* プレイヤーの持ち駒 */}
      <div class="w-full max-w-[340px] flex items-center justify-between px-3 py-2 bg-white/80 dark:bg-slate-900/80 rounded-xl mt-2 text-xs border border-rose-100 dark:border-slate-800">
        <span class="font-bold text-slate-700 dark:text-slate-300">あなたの持ち駒:</span>
        <div class="flex items-center gap-1.5 min-h-[30px] flex-wrap">
          <For each={playerHand()}>
            {(p) => (
              <button
                onClick={() => {
                  sound.playPop(400);
                  setSelectedHandPiece((prev) => (prev === p ? null : p));
                  setSelectedCell(null);
                }}
                class={`px-2 py-1 rounded-lg border font-bold text-sm shadow-xs transition-all ${
                  selectedHandPiece() === p
                    ? 'bg-rose-500 text-white border-rose-600 scale-105'
                    : 'bg-amber-100 dark:bg-amber-900 border-amber-300 text-amber-900 dark:text-amber-100 hover:border-rose-400'
                }`}
              >
                {PIECE_LABELS[p].normal}
              </button>
            )}
          </For>
        </div>
      </div>
    </GameShell>
  );
};
