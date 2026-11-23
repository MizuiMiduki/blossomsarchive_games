import { Component, createSignal, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  StandardShogiBoard,
  StandardPieceType,
  createInitialStandardShogiBoard,
  getValidStandardMoves,
  getStandardDropMoves,
  chooseStandardShogiMove,
  canPromote,
  mustPromote,
  STANDARD_PIECE_LABELS,
} from './standard-logic.ts';

// 伝統的な将棋の駒 (五角形・木目・筆文字・成駒朱文字)
interface ShogiPieceViewProps {
  type: StandardPieceType;
  promoted?: boolean;
  isAi?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'board';
}

const StandardPieceView: Component<ShogiPieceViewProps> = (props) => {
  const label = () => {
    if (props.type === 'K') {
      return props.isAi ? '王' : '玉';
    }
    return props.promoted
      ? STANDARD_PIECE_LABELS[props.type].promoted
      : STANDARD_PIECE_LABELS[props.type].normal;
  };
  const isRed = () => Boolean(props.promoted);

  return (
    <div
      class={`relative flex items-center justify-center transition-all select-none w-[90%] h-[92%] max-w-[42px] max-h-[48px] ${
        props.isAi ? 'rotate-180' : ''
      } ${props.isSelected ? '-translate-y-1 scale-105' : ''}`}
    >
      <svg
        viewBox="0 0 100 115"
        class="w-full h-full drop-shadow-xs transition-all"
        style={{
          filter: props.isSelected
            ? 'drop-shadow(0 0 6px rgba(244,63,94,0.9)) drop-shadow(0 2px 4px rgba(0,0,0,0.35))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
        }}
      >
        <defs>
          <linearGradient id="shogi-koma-wood-9" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fffdf7" />
            <stop offset="30%" stop-color="#fef3c7" />
            <stop offset="100%" stop-color="#fde68a" />
          </linearGradient>
        </defs>

        {/* 将棋駒の伝統的五角形 */}
        <polygon
          points="50,4 84,28 89,112 11,112 16,28"
          fill="url(#shogi-koma-wood-9)"
          stroke="#b45309"
          stroke-width="3.5"
          stroke-linejoin="round"
        />

        {/* 駒の内側ハイライト線 */}
        <polygon
          points="50,9 80,31 84,107 16,107 20,31"
          fill="none"
          stroke="rgba(255, 255, 255, 0.75)"
          stroke-width="1.8"
          stroke-linejoin="round"
        />

        {/* 筆文字風の漢字 */}
        <text
          x="50"
          y="74"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="'Hiragino Mincho ProN', 'Yu Mincho', 'Sawarabi Mincho', serif"
          font-weight="900"
          font-size="46"
          fill={isRed() ? '#e11d48' : '#1c1917'}
        >
          {label()}
        </text>
      </svg>
    </div>
  );
};

export const StandardShogiGame: Component = () => {
  const [board, setBoard] = createSignal<StandardShogiBoard>(createInitialStandardShogiBoard());
  const [playerHand, setPlayerHand] = createSignal<StandardPieceType[]>([]);
  const [aiHand, setAiHand] = createSignal<StandardPieceType[]>([]);
  const [selectedCell, setSelectedCell] = createSignal<[number, number] | null>(null);
  const [selectedHandPiece, setSelectedHandPiece] = createSignal<StandardPieceType | null>(null);
  const [turn, setTurn] = createSignal<'player' | 'ai'>('player');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [lastMove, setLastMove] = createSignal<{ from?: [number, number]; to: [number, number] } | null>(null);

  // 成り選択用保留ステート
  const [pendingPromotion, setPendingPromotion] = createSignal<{
    from: [number, number];
    to: [number, number];
  } | null>(null);

  const restart = () => {
    setBoard(createInitialStandardShogiBoard());
    setPlayerHand([]);
    setAiHand([]);
    setSelectedCell(null);
    setSelectedHandPiece(null);
    setPendingPromotion(null);
    setLastMove(null);
    setTurn('player');
    setIsAiThinking(false);
    setIsGameOver(false);
    setIsVictory(false);
  };

  const triggerAi = (
    currentBoard: StandardShogiBoard,
    currentAiHand: StandardPieceType[],
    currentPlayerHand: StandardPieceType[]
  ) => {
    setIsAiThinking(true);
    setTimeout(() => {
      const act = chooseStandardShogiMove(currentBoard, currentAiHand, currentPlayerHand, difficulty());
      if (!act) {
        setIsGameOver(true);
        setIsVictory(true);
        setIsAiThinking(false);
        return;
      }

      const nextBoard = currentBoard.map((row) => [...row]);
      let nextAiHand = [...currentAiHand];

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
        setLastMove({ to: act.to });
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
          promoted: act.promote ? true : p.promoted,
        };
        setLastMove({ from: act.from, to: act.to });
      }

      setBoard(nextBoard);
      setAiHand(nextAiHand);
      setTurn('player');
      setIsAiThinking(false);
    }, 450);
  };

  // プレイヤーの移動実行 (成り確定後または不成り移動)
  const executePlayerMove = (from: [number, number], to: [number, number], promote: boolean) => {
    const currentBoard = board();
    const [sr, sc] = from;
    const [r, c] = to;
    const movingPiece = currentBoard[sr][sc]!;
    const targetPiece = currentBoard[r][c];
    const nextBoard = currentBoard.map((row) => [...row]);
    let nextPlayerHand = [...playerHand()];

    if (targetPiece) {
      nextPlayerHand.push(targetPiece.type);
      sound.playMatch(5);
      if (targetPiece.type === 'K') {
        nextBoard[sr][sc] = null;
        nextBoard[r][c] = { ...movingPiece, promoted: promote || movingPiece.promoted };
        setBoard(nextBoard);
        setPlayerHand(nextPlayerHand);
        setIsGameOver(true);
        setIsVictory(true);
        return;
      }
    } else {
      sound.playPop(500);
    }

    nextBoard[sr][sc] = null;
    nextBoard[r][c] = { ...movingPiece, promoted: promote || movingPiece.promoted };

    setBoard(nextBoard);
    setPlayerHand(nextPlayerHand);
    setSelectedCell(null);
    setPendingPromotion(null);
    setLastMove({ from, to });

    setTurn('ai');
    triggerAi(nextBoard, aiHand(), nextPlayerHand);
  };

  // マスクリック処理
  const handleCellClick = (r: number, c: number) => {
    if (turn() !== 'player' || isAiThinking() || isGameOver() || pendingPromotion()) return;

    const currentBoard = board();
    const cell = currentBoard[r][c];
    const sel = selectedCell();
    const handPiece = selectedHandPiece();

    // 1. 持ち駒を打つ処理
    if (handPiece) {
      const validDrops = getStandardDropMoves(currentBoard, handPiece, 'player');
      const isDropValid = validDrops.some(([dr, dc]) => dr === r && dc === c);

      if (isDropValid) {
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
        setLastMove({ to: [r, c] });
        sound.playPop(520);

        setTurn('ai');
        triggerAi(nextBoard, aiHand(), nextHand);
      } else {
        setSelectedHandPiece(null);
      }
      return;
    }

    // 2. 盤上の駒を移動する処理
    if (sel) {
      const [sr, sc] = sel;
      const validMoves = getValidStandardMoves(currentBoard, sr, sc);
      const isMoveValid = validMoves.some(([mr, mc]) => mr === r && mc === c);

      if (isMoveValid) {
        const movingPiece = currentBoard[sr][sc]!;

        // 強制成りの確認
        if (mustPromote(movingPiece.type, r, 'player')) {
          executePlayerMove([sr, sc], [r, c], true);
          return;
        }

        // 任意成りの確認 (敵陣に入る・敵陣内を動く・敵陣から出る)
        if (canPromote(movingPiece, sr, r)) {
          setPendingPromotion({ from: [sr, sc], to: [r, c] });
          return;
        }

        // 不成で移動
        executePlayerMove([sr, sc], [r, c], false);
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

    // 3. 自駒の新規選択
    if (cell && cell.side === 'player') {
      setSelectedCell([r, c]);
      setSelectedHandPiece(null);
      sound.playPop(350);
    }
  };

  // 持ち駒クリック処理
  const handleHandClick = (type: StandardPieceType) => {
    if (turn() !== 'player' || isAiThinking() || isGameOver() || pendingPromotion()) return;

    sound.playPop(350);
    setSelectedCell(null);
    setSelectedHandPiece((prev) => (prev === type ? null : type));
  };

  // 移動・打込可能マスのハイライト計算
  const getHighlightMoves = (): [number, number][] => {
    const currentBoard = board();
    const sel = selectedCell();
    if (sel) {
      return getValidStandardMoves(currentBoard, sel[0], sel[1]);
    }
    const hand = selectedHandPiece();
    if (hand) {
      return getStandardDropMoves(currentBoard, hand, 'player');
    }
    return [];
  };

  const isHighlighted = (r: number, c: number) => {
    return getHighlightMoves().some(([hr, hc]) => hr === r && hc === c);
  };

  const isSelected = (r: number, c: number) => {
    const sel = selectedCell();
    return sel && sel[0] === r && sel[1] === c;
  };

  const isLastMoveCell = (r: number, c: number) => {
    const lm = lastMove();
    if (!lm) return false;
    if (lm.to[0] === r && lm.to[1] === c) return true;
    if (lm.from && lm.from[0] === r && lm.from[1] === c) return true;
    return false;
  };

  const instructions = [
    '【本将棋 (9×9)】伝統の9×9マス盤で戦うクラシック将棋です。',
    '【持ち駒】相手から取った駒は、空いているマスに打って自軍の戦力として再利用できます。',
    '【成り】敵陣3段目（上段3行）に入ると駒を成ることができます（金・玉を除く）。',
    '相手の玉将（王将）を詰ませば勝利です！',
  ];

  return (
    <GameShell
      id="standard-shogi"
      title="Standard Shogi (9×9)"
      score={isVictory() ? (difficulty() === 'hard' ? 5000 : difficulty() === 'normal' ? 2500 : 1200) : 0}
      isGameOver={isGameOver() && !isVictory()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-lg px-2 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500 font-semibold text-[11px]">AI難易度:</span>
            <div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              {(['easy', 'normal', 'hard'] as const).map((d) => (
                <button
                  onClick={() => {
                    sound.playPop(400);
                    setDifficulty(d);
                    restart();
                  }}
                  class={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs ${
                    difficulty() === d
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {d === 'easy' ? '初級' : d === 'normal' ? '中級' : '上級'}
                </button>
              ))}
            </div>
          </div>

          <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Show when={isAiThinking()}>
              <span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>AI思考中...</span>
            </Show>
            <Show when={!isAiThinking() && !isGameOver()}>
              <span>{turn() === 'player' ? 'あなたの手番 (先手)' : '相手の手番 (後手)'}</span>
            </Show>
          </div>
        </div>
      }
    >
      <div class="flex flex-col items-center gap-2 w-full max-w-lg select-none px-1">
        {/* 後手（AI）駒台 */}
        <div class="w-full flex items-center justify-between px-3 py-1.5 bg-amber-50/70 dark:bg-slate-900/80 rounded-xl border border-amber-200/80 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-600 dark:text-slate-300 text-[11px]">後手 (AI) 持ち駒:</span>
            <div class="flex items-center gap-1 flex-wrap min-h-[30px]">
              <For each={aiHand()}>
                {(type) => (
                  <div class="scale-80 transform -rotate-180 origin-center">
                    <StandardPieceView type={type} size="sm" isAi={true} />
                  </div>
                )}
              </For>
              <Show when={aiHand().length === 0}>
                <span class="text-slate-400 text-[11px]">なし</span>
              </Show>
            </div>
          </div>
          <span class="text-[11px] font-semibold text-slate-500">{aiHand().length}枚</span>
        </div>

        {/* 9x9 将棋盤 */}
        <div class="relative p-2.5 sm:p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950/40 border-4 border-amber-700/60 dark:border-amber-900/60 shadow-xl overflow-hidden max-w-full">
          {/* 木製盤面の格子 */}
          <div class="grid grid-cols-9 grid-rows-9 gap-0 bg-amber-200/90 dark:bg-amber-900/40 border-2 border-amber-900/80 rounded-md shadow-inner overflow-hidden">
            <For each={board()}>
              {(row, r) => (
                <For each={row}>
                  {(cell, c) => {
                    const highlight = () => isHighlighted(r(), c());
                    const selected = () => isSelected(r(), c());
                    const lastMoveCell = () => isLastMoveCell(r(), c());

                    return (
                      <div
                        onClick={() => handleCellClick(r(), c())}
                        class={`w-8 h-9 sm:w-11 sm:h-12 border border-amber-900/30 flex items-center justify-center relative cursor-pointer transition-colors ${
                          selected()
                            ? 'bg-rose-200/80 dark:bg-rose-950/60'
                            : lastMoveCell()
                            ? 'bg-amber-300/60 dark:bg-amber-800/40'
                            : 'hover:bg-amber-300/40 dark:hover:bg-amber-800/20'
                        }`}
                      >
                        {/* 星 (点) */}
                        <Show
                          when={
                            (r() === 2 || r() === 6) &&
                            (c() === 2 || c() === 6)
                          }
                        >
                          <div class="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-amber-900/70 z-10 pointer-events-none" />
                        </Show>

                        {/* 移動可能マスのマーカー */}
                        <Show when={highlight()}>
                          <div class="absolute w-2.5 h-2.5 rounded-full bg-rose-500/80 z-20 animate-pulse pointer-events-none" />
                        </Show>

                        {/* 駒 */}
                        <Show when={cell}>
                          {(p) => (
                            <StandardPieceView
                              type={p().type}
                              promoted={p().promoted}
                              isAi={p().side === 'ai'}
                              isSelected={Boolean(selected())}
                              size="board"
                            />
                          )}
                        </Show>
                      </div>
                    );
                  }}
                </For>
              )}
            </For>
          </div>
        </div>

        {/* 先手（Player）駒台 */}
        <div class="w-full flex items-center justify-between px-3 py-1.5 bg-amber-50/70 dark:bg-slate-900/80 rounded-xl border border-amber-200/80 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-700 dark:text-slate-200 text-[11px]">先手 (あなた) 持ち駒:</span>
            <div class="flex items-center gap-1 flex-wrap min-h-[30px]">
              <For each={playerHand()}>
                {(type) => {
                  const isHandSelected = () => selectedHandPiece() === type;
                  return (
                    <div
                      onClick={() => handleHandClick(type)}
                      class={`cursor-pointer transition-transform transform ${
                        isHandSelected() ? '-translate-y-1.5 ring-2 ring-rose-500 rounded-md' : 'hover:scale-105'
                      }`}
                    >
                      <StandardPieceView type={type} size="sm" isSelected={isHandSelected()} />
                    </div>
                  );
                }}
              </For>
              <Show when={playerHand().length === 0}>
                <span class="text-slate-400 text-[11px]">なし</span>
              </Show>
            </div>
          </div>
          <span class="text-[11px] font-semibold text-slate-500">{playerHand().length}枚</span>
        </div>

        {/* 成り選択モーダル */}
        <Show when={pendingPromotion()}>
          {(pending) => (
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
              <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
                <h3 class="text-base font-bold text-slate-900 dark:text-white mb-2">
                  成りますか？
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  敵陣に入りました。駒を成る（強化する）ことができます。
                </p>
                <div class="flex gap-2">
                  <button
                    onClick={() => executePlayerMove(pending().from, pending().to, true)}
                    class="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                  >
                    成る
                  </button>
                  <button
                    onClick={() => executePlayerMove(pending().from, pending().to, false)}
                    class="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                  >
                    不成 (ならず)
                  </button>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>
    </GameShell>
  );
};
