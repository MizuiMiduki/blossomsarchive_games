import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  ChessBoard,
  createInitialChessBoard,
  getValidChessMoves,
  chooseChessMove,
  CHESS_SYMBOLS,
} from './logic.ts';

export const ChessGame: Component = () => {
  const [board, setBoard] = createSignal<ChessBoard>(createInitialChessBoard());
  const [selectedCell, setSelectedCell] = createSignal<[number, number] | null>(null);
  const [turn, setTurn] = createSignal<'w' | 'b'>('w');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [capturedByPlayer, setCapturedByPlayer] = createSignal<string[]>([]);
  const [, setCapturedByAi] = createSignal<string[]>([]);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

  const restart = () => {
    setBoard(createInitialChessBoard());
    setSelectedCell(null);
    setTurn('w');
    setIsAiThinking(false);
    setCapturedByPlayer([]);
    setCapturedByAi([]);
    setIsGameOver(false);
    setIsVictory(false);
  };

  const triggerAi = (currentBoard: ChessBoard) => {
    setIsAiThinking(true);
    setTimeout(() => {
      const move = chooseChessMove(currentBoard, 'b', difficulty());
      if (!move) {
        setIsGameOver(true);
        setIsVictory(true);
        setIsAiThinking(false);
        return;
      }

      const nextBoard = currentBoard.map((row) => [...row]);
      const p = nextBoard[move.from[0]][move.from[1]]!;
      const target = nextBoard[move.to[0]][move.to[1]];

      if (target) {
        setCapturedByAi((prev) => [...prev, CHESS_SYMBOLS[target.color][target.type]]);
        sound.playMatch(4);
        if (target.type === 'k') {
          setIsGameOver(true);
          setIsVictory(false);
        }
      } else {
        sound.playPop(420);
      }

      let finalType = p.type;
      if (p.type === 'p' && move.to[0] === 7) {
        finalType = 'q';
      }

      nextBoard[move.from[0]][move.from[1]] = null;
      nextBoard[move.to[0]][move.to[1]] = { ...p, type: finalType };

      setBoard(nextBoard);
      setTurn('w');
      setIsAiThinking(false);
    }, 600);
  };

  const handleCellClick = (r: number, c: number) => {
    if (turn() !== 'w' || isAiThinking() || isGameOver()) return;

    const currentBoard = board();
    const cell = currentBoard[r][c];
    const sel = selectedCell();

    if (sel) {
      const [sr, sc] = sel;
      const validMoves = getValidChessMoves(currentBoard, sr, sc);
      const isValid = validMoves.some(([mr, mc]) => mr === r && mc === c);

      if (isValid) {
        const nextBoard = currentBoard.map((row) => [...row]);
        const movingPiece = nextBoard[sr][sc]!;
        const target = nextBoard[r][c];

        if (target) {
          setCapturedByPlayer((prev) => [...prev, CHESS_SYMBOLS[target.color][target.type]]);
          sound.playMatch(5);
          if (target.type === 'k') {
            setIsGameOver(true);
            setIsVictory(true);
          }
        } else {
          sound.playPop(520);
        }

        let finalType = movingPiece.type;
        if (movingPiece.type === 'p' && r === 0) {
          finalType = 'q';
        }

        nextBoard[sr][sc] = null;
        nextBoard[r][c] = { ...movingPiece, type: finalType };

        setBoard(nextBoard);
        setSelectedCell(null);

        if (!isGameOver()) {
          setTurn('b');
          triggerAi(nextBoard);
        }
        return;
      }

      if (cell && cell.color === 'w') {
        setSelectedCell([r, c]);
        sound.playPop(350);
        return;
      }

      setSelectedCell(null);
      return;
    }

    if (cell && cell.color === 'w') {
      setSelectedCell([r, c]);
      sound.playPop(440);
    }
  };

  onSettled(() => {
    restart();
  });

  const instructions = [
    '白（手前）を操作して、相手のキング♔を倒しましょう！',
    'ポーンは前進、ルークは直線、ナイトはL字、ビショップは斜め、クイーンは全方向へ移動できます。',
    'ポーンが一番奥の列まで到達すると強力なクイーンへ昇格します。',
    '【NPC対戦】初級・中級・上級からNPCの強さを選んで対局できます。',
  ];

  return (
    <GameShell
      id="blossom-chess"
      title="Chess"
      score={isVictory() ? (difficulty() === 'hard' ? 4000 : difficulty() === 'normal' ? 2000 : 1000) : 0}
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
              class={`px-3 py-1 rounded-xl font-semibold transition-all ${
                difficulty() === diff
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {diff === 'easy' ? '初級' : diff === 'normal' ? '中級' : '上級'}
            </button>
          ))}
        </div>
      }
    >
      {/* 獲得した駒 */}
      <div class="w-full max-w-[340px] flex items-center justify-between text-xs px-2 py-1 mb-1 text-slate-500">
        <div class="flex items-center gap-1">
          <span>取った駒:</span>
          <span class="text-base text-slate-900 dark:text-slate-100">{capturedByPlayer().join(' ')}</span>
        </div>
        <div class="text-xs">
          {turn() === 'w' ? (
            <span class="text-slate-900 dark:text-white font-bold">あなたの番</span>
          ) : (
            <span>相手が思考中...</span>
          )}
        </div>
      </div>

      {/* チェス盤 (8x8) */}
      <div class="w-full max-w-[340px] aspect-square p-2 bg-stone-700 dark:bg-stone-900 rounded-2xl shadow-xl border-4 border-stone-800 select-none">
        <div class="grid grid-cols-8 grid-rows-8 gap-0 w-full h-full border border-stone-900">
          <For each={board()}>
            {(row, rIdx) => (
              <For each={row}>
                {(cell, cIdx) => {
                  const isLight = (rIdx() + cIdx()) % 2 === 0;
                  const isSelected = () =>
                    selectedCell() && selectedCell()![0] === rIdx() && selectedCell()![1] === cIdx();

                  const isValidTarget = () => {
                    if (!selectedCell()) return false;
                    const moves = getValidChessMoves(board(), selectedCell()![0], selectedCell()![1]);
                    return moves.some(([mr, mc]) => mr === rIdx() && mc === cIdx());
                  };

                  return (
                    <button
                      onClick={() => handleCellClick(rIdx(), cIdx())}
                      class={`relative w-full h-full flex items-center justify-center font-bold text-xl sm:text-2xl transition-all ${
                        isLight
                          ? 'bg-amber-100 hover:bg-amber-200/90 text-slate-900'
                          : 'bg-stone-500 hover:bg-stone-400 text-white'
                      } ${isSelected() ? 'ring-2 ring-blue-500 ring-inset bg-blue-100 dark:bg-blue-900/40' : ''}`}
                    >
                      <Show when={cell}>
                        <span
                          class={`drop-shadow-xs transform transition-transform ${
                            cell!.color === 'w' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-950'
                          }`}
                        >
                          {CHESS_SYMBOLS[cell!.color][cell!.type]}
                        </span>
                      </Show>
                      <Show when={isValidTarget()}>
                        <div class="w-3 h-3 rounded-full bg-blue-500/80 absolute shadow-xs" />
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
