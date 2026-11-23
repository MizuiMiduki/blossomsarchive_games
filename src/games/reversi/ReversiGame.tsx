import { Component, createSignal, onSettled, For, Show, createMemo } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  Player,
  BoardState,
  BOARD_SIZE,
  createInitialBoard,
  getOpponent,
  getValidMoves,
  applyMove,
  countStones,
  chooseAIMove,
} from './logic.ts';

export const ReversiGame: Component = () => {
  const [board, setBoard] = createSignal<BoardState>(createInitialBoard());
  const [turn, setTurn] = createSignal<Player>('black');
  const [playerColor, setPlayerColor] = createSignal<Player>('black');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [showGuide, setShowGuide] = createSignal(true);
  const [message, setMessage] = createSignal<string>('');
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

  // 石の数カウント
  const counts = createMemo(() => countStones(board()));

  // 現在の手番の合法手
  const validMoves = createMemo(() => getValidMoves(board(), turn()));

  // ゲームの初期化
  const restart = () => {
    setBoard(createInitialBoard());
    setTurn('black');
    setIsAiThinking(false);
    setMessage('');
    setIsGameOver(false);
    setIsVictory(false);

    // プレイヤーが後手（白）の場合、AIが初手を打つ
    if (playerColor() === 'white') {
      triggerAiMove(createInitialBoard(), 'black');
    }
  };

  // AIの思考と着手
  const triggerAiMove = (currentBoard: BoardState, aiPlayer: Player) => {
    setIsAiThinking(true);
    setMessage('相手が思考中...');

    setTimeout(() => {
      const move = chooseAIMove(currentBoard, aiPlayer, difficulty());

      if (!move) {
        // AIがパス
        const opp = getOpponent(aiPlayer);
        const oppMoves = getValidMoves(currentBoard, opp);
        if (oppMoves.length === 0) {
          // 両者着手不可 -> 終局
          endGame(currentBoard);
        } else {
          setMessage('相手がパスしました！あなたの手番です');
          sound.playPop(350);
          setTurn(opp);
          setIsAiThinking(false);
        }
        return;
      }

      const [r, c] = move;
      const { board: nextBoard, flipped } = applyMove(currentBoard, r, c, aiPlayer);
      setBoard(nextBoard);
      sound.playMatch(Math.min(flipped.length, 6));

      const nextPlayer = getOpponent(aiPlayer);
      const nextMoves = getValidMoves(nextBoard, nextPlayer);

      if (nextMoves.length > 0) {
        setTurn(nextPlayer);
        setIsAiThinking(false);
        setMessage('');
      } else {
        // プレイヤーがパス
        const aiFollowUpMoves = getValidMoves(nextBoard, aiPlayer);
        if (aiFollowUpMoves.length > 0) {
          setMessage('置ける場所がありません。あなたのパスです');
          sound.playPop(350);
          setTimeout(() => triggerAiMove(nextBoard, aiPlayer), 1000);
        } else {
          endGame(nextBoard);
        }
      }
    }, 600);
  };

  // プレイヤーのマス選択
  const handleCellClick = (r: number, c: number) => {
    if (isAiThinking() || isGameOver()) return;
    if (turn() !== playerColor()) return;

    const currentBoard = board();
    const moves = validMoves();
    const isValid = moves.some(([mr, mc]) => mr === r && mc === c);
    if (!isValid) return;

    // 着手
    const { board: nextBoard, flipped } = applyMove(currentBoard, r, c, playerColor());
    setBoard(nextBoard);
    sound.playMatch(Math.min(flipped.length, 6));

    const aiColor = getOpponent(playerColor());
    const aiMoves = getValidMoves(nextBoard, aiColor);

    if (aiMoves.length > 0) {
      setTurn(aiColor);
      triggerAiMove(nextBoard, aiColor);
    } else {
      // AIがパスの場合
      const playerFollowUpMoves = getValidMoves(nextBoard, playerColor());
      if (playerFollowUpMoves.length > 0) {
        setMessage('相手の手がありません。連続してあなたの手番です！');
        sound.playPop(480);
      } else {
        endGame(nextBoard);
      }
    }
  };

  // 終局処理
  const endGame = (finalBoard: BoardState) => {
    const finalCounts = countStones(finalBoard);
    setIsAiThinking(false);
    setIsGameOver(true);

    const playerStones = playerColor() === 'black' ? finalCounts.black : finalCounts.white;
    const aiStones = playerColor() === 'black' ? finalCounts.white : finalCounts.black;

    if (playerStones > aiStones) {
      setIsVictory(true);
      setMessage(`見事な勝利！ ${playerStones} 対 ${aiStones}`);
    } else if (playerStones < aiStones) {
      setIsVictory(false);
      setMessage(`惜敗... ${playerStones} 対 ${aiStones}`);
    } else {
      setIsVictory(false);
      setMessage(`引き分け！ ${playerStones} 対 ${aiStones}`);
    }
  };

  onSettled(() => {
    restart();
  });

  const instructions = [
    '相手の石を自分の石で縦・横・斜めに挟むと、自分の石にひっくり返せます。',
    '四隅（角）は絶対にひっくり返されない最強のポジションです！',
    '最終的に盤面の石が多い方が勝利となります。',
  ];

  return (
    <GameShell
      id="petal-reversi"
      title="Petal Reversi (オセロ)"
      score={playerColor() === 'black' ? counts().black : counts().white}
      isGameOver={isGameOver() && !isVictory()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center gap-2 sm:gap-3 bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-rose-100 dark:border-slate-800 text-xs flex-wrap justify-center">
          {/* 難易度 */}
          <div class="flex items-center gap-1">
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
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
                }`}
              >
                {diff === 'easy' ? '初級' : diff === 'normal' ? '中級' : '上級'}
              </button>
            ))}
          </div>

          <div class="w-px h-4 bg-slate-200 dark:bg-slate-700" />

          {/* 手番選択 */}
          <div class="flex items-center gap-1">
            <button
              onClick={() => {
                if (playerColor() !== 'black') {
                  sound.playPop(420);
                  setPlayerColor('black');
                  restart();
                }
              }}
              class={`px-2 py-1 rounded-xl font-semibold transition-all ${
                playerColor() === 'black'
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'text-slate-500'
              }`}
            >
              先手(🌺)
            </button>
            <button
              onClick={() => {
                if (playerColor() !== 'white') {
                  sound.playPop(420);
                  setPlayerColor('white');
                  restart();
                }
              }}
              class={`px-2 py-1 rounded-xl font-semibold transition-all ${
                playerColor() === 'white'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                  : 'text-slate-500'
              }`}
            >
              後手(🌸)
            </button>
          </div>

          <div class="w-px h-4 bg-slate-200 dark:bg-slate-700" />

          {/* ヒントトグル */}
          <button
            onClick={() => {
              sound.playPop(400);
              setShowGuide((g) => !g);
            }}
            class="px-2 py-1 text-slate-500 hover:text-rose-500 font-medium"
          >
            ヒント: {showGuide() ? 'ON' : 'OFF'}
          </button>
        </div>
      }
    >
      {/* プレイヤー情報 & スコア */}
      <div class="w-full max-w-sm flex items-center justify-between px-3 py-2 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-rose-100 dark:border-slate-800 shadow-xs mb-3">
        {/* 黒 (紅椿) */}
        <div
          class={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
            turn() === 'black'
              ? 'bg-rose-100/80 dark:bg-rose-950/80 ring-2 ring-rose-400 font-bold'
              : 'opacity-70'
          }`}
        >
          <span class="text-2xl leading-none">🌺</span>
          <div class="text-left text-xs">
            <div class="font-bold text-slate-800 dark:text-slate-100">
              {playerColor() === 'black' ? 'あなた' : 'NPC'}
            </div>
            <div class="text-rose-600 dark:text-rose-400 font-black text-sm">
              {counts().black} 個
            </div>
          </div>
        </div>

        {/* 手番ステータス */}
        <div class="text-center text-xs font-semibold px-2">
          <Show
            when={message()}
            fallback={
              <div class="text-slate-600 dark:text-slate-300">
                {turn() === playerColor() ? (
                  <span class="text-rose-500 font-bold animate-pulse">あなたの番</span>
                ) : (
                  <span>相手の番...</span>
                )}
              </div>
            }
          >
            <span class="text-rose-500 font-bold">{message()}</span>
          </Show>
        </div>

        {/* 白 (白桜) */}
        <div
          class={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
            turn() === 'white'
              ? 'bg-pink-100/80 dark:bg-slate-800 ring-2 ring-pink-400 font-bold'
              : 'opacity-70'
          }`}
        >
          <div class="text-right text-xs">
            <div class="font-bold text-slate-800 dark:text-slate-100">
              {playerColor() === 'white' ? 'あなた' : 'NPC'}
            </div>
            <div class="text-pink-600 dark:text-pink-300 font-black text-sm">
              {counts().white} 個
            </div>
          </div>
          <span class="text-2xl leading-none">🌸</span>
        </div>
      </div>

      {/* オセロ盤面 (8x8) */}
      <div class="w-full max-w-[360px] aspect-square bg-emerald-800 dark:bg-emerald-950 p-2 sm:p-2.5 rounded-3xl shadow-xl border-4 border-emerald-900/40 select-none">
        <div class="grid grid-cols-8 grid-rows-8 gap-1 w-full h-full bg-emerald-700/60 dark:bg-emerald-900/60 p-1 rounded-2xl">
          <For each={board()}>
            {(row, rIdx) => (
              <For each={row}>
                {(cell, cIdx) => {
                  const isValid = () =>
                    showGuide() &&
                    turn() === playerColor() &&
                    !isAiThinking() &&
                    validMoves().some(([mr, mc]) => mr === rIdx() && mc === cIdx());

                  return (
                    <button
                      onClick={() => handleCellClick(rIdx(), cIdx())}
                      class="relative w-full h-full bg-emerald-600/90 hover:bg-emerald-500/90 dark:bg-emerald-900/80 dark:hover:bg-emerald-800/80 rounded-lg flex items-center justify-center transition-colors active:scale-95"
                    >
                      {/* 石の描画 */}
                      <Show when={cell}>
                        <div
                          class={`w-[85%] h-[85%] rounded-full flex items-center justify-center text-lg sm:text-xl shadow-md transition-all duration-300 transform scale-100 ${
                            cell === 'black'
                              ? 'bg-gradient-to-tr from-slate-900 to-rose-950 text-white'
                              : 'bg-gradient-to-tr from-rose-50 to-white text-rose-800'
                          }`}
                        >
                          {cell === 'black' ? '🌺' : '🌸'}
                        </div>
                      </Show>

                      {/* ガイドドット (置ける場所) */}
                      <Show when={isValid()}>
                        <div class="w-2.5 h-2.5 rounded-full bg-amber-300/80 shadow-xs animate-ping duration-1000" />
                        <div class="w-2 h-2 rounded-full bg-amber-300 shadow-xs absolute" />
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
