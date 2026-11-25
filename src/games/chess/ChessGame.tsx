import { Component, createSignal, onSettled, onCleanup, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { ZeroTrustP2P } from '../../utils/p2p.ts';
import {
  ChessBoard,
  createInitialChessBoard,
  getValidChessMoves,
  chooseChessMove,
  CHESS_SYMBOLS,
} from './logic.ts';

type PlayMode = 'npc' | 'local' | 'p2p';

export const ChessGame: Component = () => {
  const [board, setBoard] = createSignal<ChessBoard>(createInitialChessBoard());
  const [selectedCell, setSelectedCell] = createSignal<[number, number] | null>(null);
  const [turn, setTurn] = createSignal<'w' | 'b'>('w');
  const [playerColor, setPlayerColor] = createSignal<'w' | 'b'>('w');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [playMode, setPlayMode] = createSignal<PlayMode>('npc');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [capturedByWhite, setCapturedByWhite] = createSignal<string[]>([]);
  const [capturedByBlack, setCapturedByBlack] = createSignal<string[]>([]);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [message, setMessage] = createSignal<string>('');

  // P2P 関連状態
  const [p2pRole, setP2pRole] = createSignal<'host' | 'guest' | null>(null);
  const [p2pStatus, setP2pStatus] = createSignal<'idle' | 'waiting_answer' | 'connected' | 'error'>('idle');
  const [hostOfferCode, setHostOfferCode] = createSignal<string>('');
  const [guestInputOffer, setGuestInputOffer] = createSignal<string>('');
  const [guestAnswerCode, setGuestAnswerCode] = createSignal<string>('');
  const [hostInputAnswer, setHostInputAnswer] = createSignal<string>('');
  const [copyStatus, setCopyStatus] = createSignal<string | null>(null);
  let p2pInstance: ZeroTrustP2P | null = null;

  const restart = () => {
    setBoard(createInitialChessBoard());
    setSelectedCell(null);
    setTurn('w');
    setIsAiThinking(false);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setIsGameOver(false);
    setIsVictory(false);
    setMessage('');
  };

  const initP2p = () => {
    if (p2pInstance) p2pInstance.close();
    p2pInstance = new ZeroTrustP2P({
      onConnected: () => {
        sound.playVictory();
        setP2pStatus('connected');
        setMessage('P2P暗号化接続完了！対局開始！');
        restart();
      },
      onMessage: (data: any) => {
        if (data.type === 'move' && data.from && data.to) {
          handleIncomingP2pMove(data.from, data.to);
        }
      },
      onError: (err) => {
        console.error('P2P Error:', err);
        setP2pStatus('error');
        setMessage('接続エラーが発生しました。');
      },
      onDisconnected: () => {
        setP2pStatus('idle');
        setMessage('相手が切断しました。');
      },
    });
  };

  const handleHostCreateRoom = async () => {
    initP2p();
    setP2pRole('host');
    setPlayerColor('w'); // ホストが白（先手）
    try {
      const offer = await p2pInstance!.createHostOffer();
      setHostOfferCode(offer);
      setP2pStatus('waiting_answer');
    } catch (err) {
      setP2pStatus('error');
    }
  };

  const handleGuestJoin = async () => {
    if (!guestInputOffer().trim()) return;
    initP2p();
    setP2pRole('guest');
    setPlayerColor('b'); // ゲストが黒（後手）
    try {
      const answer = await p2pInstance!.joinGuest(guestInputOffer().trim());
      setGuestAnswerCode(answer);
      setP2pStatus('waiting_answer');
    } catch (err) {
      setP2pStatus('error');
    }
  };

  const handleHostComplete = async () => {
    if (!hostInputAnswer().trim() || !p2pInstance) return;
    try {
      await p2pInstance.completeHostConnection(hostInputAnswer().trim());
    } catch (err) {
      setP2pStatus('error');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(`${label}をコピーしました！`);
    sound.playPop(500);
    setTimeout(() => setCopyStatus(null), 2500);
  };

  const triggerAi = (currentBoard: ChessBoard) => {
    setIsAiThinking(true);
    setTimeout(() => {
      const move = chooseChessMove(currentBoard, 'b', difficulty());
      if (!move) {
        setIsGameOver(true);
        setIsVictory(true);
        setIsAiThinking(false);
        sound.playVictory();
        return;
      }

      const nextBoard = currentBoard.map((row) => [...row]);
      const p = nextBoard[move.from[0]][move.from[1]]!;
      const target = nextBoard[move.to[0]][move.to[1]];

      if (target) {
        setCapturedByBlack((prev) => [...prev, CHESS_SYMBOLS[target.color][target.type]]);
        sound.playMatch(4);
        if (target.type === 'k') {
          setIsGameOver(true);
          setIsVictory(false);
          sound.playGameOver();
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
    }, 550);
  };

  const handleIncomingP2pMove = (from: [number, number], to: [number, number]) => {
    const currentBoard = board();
    const [sr, sc] = from;
    const [tr, tc] = to;
    const p = currentBoard[sr][sc];
    if (!p) return;

    const nextBoard = currentBoard.map((row) => [...row]);
    const target = nextBoard[tr][tc];

    if (target) {
      if (p.color === 'w') {
        setCapturedByWhite((prev) => [...prev, CHESS_SYMBOLS[target.color][target.type]]);
      } else {
        setCapturedByBlack((prev) => [...prev, CHESS_SYMBOLS[target.color][target.type]]);
      }
      sound.playMatch(4);
      if (target.type === 'k') {
        setIsGameOver(true);
        setIsVictory(false);
        sound.playGameOver();
      }
    } else {
      sound.playPop(420);
    }

    let finalType = p.type;
    if (p.type === 'p' && (tr === 0 || tr === 7)) {
      finalType = 'q';
    }

    nextBoard[sr][sc] = null;
    nextBoard[tr][tc] = { ...p, type: finalType };

    setBoard(nextBoard);
    setTurn(playerColor());
  };

  const handleCellClick = (r: number, c: number) => {
    if (isGameOver()) return;
    const mode = playMode();
    const curTurn = turn();
    const currentBoard = board();
    const cell = currentBoard[r][c];
    const sel = selectedCell();

    if (mode === 'npc') {
      if (curTurn !== 'w' || isAiThinking()) return;
    } else if (mode === 'p2p') {
      if (p2pStatus() !== 'connected' || curTurn !== playerColor()) return;
    }

    // 既に駒を選択している場合：移動先をクリックしたか？
    if (sel) {
      const [sr, sc] = sel;
      const validMoves = getValidChessMoves(currentBoard, sr, sc);
      const isValid = validMoves.some(([mr, mc]) => mr === r && mc === c);

      if (isValid) {
        const nextBoard = currentBoard.map((row) => [...row]);
        const movingPiece = nextBoard[sr][sc]!;
        const target = nextBoard[r][c];

        if (target) {
          if (movingPiece.color === 'w') {
            setCapturedByWhite((prev) => [...prev, CHESS_SYMBOLS[target.color][target.type]]);
          } else {
            setCapturedByBlack((prev) => [...prev, CHESS_SYMBOLS[target.color][target.type]]);
          }
          sound.playMatch(5);
          if (target.type === 'k') {
            setIsGameOver(true);
            setIsVictory(mode === 'npc' ? movingPiece.color === 'w' : true);
            sound.playVictory();
          }
        } else {
          sound.playPop(520);
        }

        let finalType = movingPiece.type;
        if (movingPiece.type === 'p' && (r === 0 || r === 7)) {
          finalType = 'q';
        }

        nextBoard[sr][sc] = null;
        nextBoard[r][c] = { ...movingPiece, type: finalType };

        setBoard(nextBoard);
        setSelectedCell(null);

        if (!isGameOver()) {
          const nextTurn = curTurn === 'w' ? 'b' : 'w';
          setTurn(nextTurn);

          if (mode === 'npc') {
            triggerAi(nextBoard);
          } else if (mode === 'p2p') {
            p2pInstance?.send({ type: 'move', from: [sr, sc], to: [r, c] });
          }
        }
        return;
      }

      // 別の自分の駒を選択し直す場合
      const selectableColor = mode === 'local' ? curTurn : mode === 'p2p' ? playerColor() : 'w';
      if (cell && cell.color === selectableColor) {
        setSelectedCell([r, c]);
        sound.playPop(350);
        return;
      }

      setSelectedCell(null);
      return;
    }

    // 駒を選択
    const activeColor = mode === 'local' ? curTurn : mode === 'p2p' ? playerColor() : 'w';
    if (cell && cell.color === activeColor) {
      setSelectedCell([r, c]);
      sound.playPop(440);
    }
  };

  onSettled(() => {
    restart();
  });

  onCleanup(() => {
    if (p2pInstance) {
      p2pInstance.close();
      p2pInstance = null;
    }
  });

  const instructions = [
    'ポーンは前進、ルークは直線、ナイトはL字、ビショップは斜め、クイーンは全方向へ移動できます。',
    'ポーンが一番奥の列まで到達すると強力なクイーンへ昇格します。相手のキング♔を倒そう！',
    '【NPC対戦】初級・中級・上級からNPCの強さを選んで対局できます。',
    '【対面対戦】1台のスマホ/PCで白と黒を交代で動かして友達と対戦できます。',
    '【P2P対戦】招待コードを交換して離れた友達とオンライン直接対局！',
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
        <div class="flex flex-col sm:flex-row items-center gap-2 w-full max-w-md">
          {/* 対戦モード切り替えタブ */}
          <div class="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs w-full justify-between">
            <button
              onClick={() => {
                sound.playPop(420);
                setPlayMode('npc');
                restart();
              }}
              class={`flex-1 py-1 rounded-xl font-bold transition-all text-center ${
                playMode() === 'npc'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              NPC対戦
            </button>
            <button
              onClick={() => {
                sound.playPop(420);
                setPlayMode('local');
                restart();
              }}
              class={`flex-1 py-1 rounded-xl font-bold transition-all text-center ${
                playMode() === 'local'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              対面対戦
            </button>
            <button
              onClick={() => {
                sound.playPop(420);
                setPlayMode('p2p');
              }}
              class={`flex-1 py-1 rounded-xl font-bold transition-all text-center ${
                playMode() === 'p2p'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              P2P通信
            </button>
          </div>

          {/* NPC モード時の難易度 */}
          <Show when={playMode() === 'npc'}>
            <div class="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs shrink-0">
              {(['easy', 'normal', 'hard'] as const).map((diff) => (
                <button
                  onClick={() => {
                    if (difficulty() !== diff) {
                      sound.playPop(450);
                      setDifficulty(diff);
                      restart();
                    }
                  }}
                  class={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    difficulty() === diff
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {diff === 'easy' ? '初級' : diff === 'normal' ? '中級' : '上級'}
                </button>
              ))}
            </div>
          </Show>
        </div>
      }
    >
      <div class="flex flex-col items-center gap-2 w-full max-w-lg">
        {/* P2P 接続パネル */}
        <Show when={playMode() === 'p2p' && p2pStatus() !== 'connected'}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-xl border border-emerald-500/30 text-xs animate-in fade-in">
            <div class="flex items-center justify-between mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span class="font-bold text-slate-800 dark:text-slate-100">P2P オンラインチェス</span>
              <span class="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                E2EE 暗号化通信
              </span>
            </div>

            <Show when={p2pStatus() === 'idle'}>
              <div class="flex flex-col gap-2.5">
                <p class="text-slate-500 text-[11px]">
                  サーバーを介さずブラウザ同士が直接P2P通信で接続してチェスを対局します。
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleHostCreateRoom}
                    class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm active:scale-95 transition-all"
                  >
                    部屋を作る (白/先手)
                  </button>
                  <button
                    onClick={() => {
                      setP2pRole('guest');
                      setP2pStatus('waiting_answer');
                    }}
                    class="py-2.5 rounded-xl border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold active:scale-95 transition-all hover:bg-emerald-50"
                  >
                    部屋に参加 (黒/後手)
                  </button>
                </div>
              </div>
            </Show>

            {/* ホスト */}
            <Show when={p2pRole() === 'host' && p2pStatus() === 'waiting_answer'}>
              <div class="flex flex-col gap-2">
                <span class="font-bold text-slate-700 dark:text-slate-200">1. 招待コードを相手に共有</span>
                <button
                  onClick={() => copyToClipboard(hostOfferCode(), '招待コード')}
                  class="w-full py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"
                >
                  {copyStatus() || '招待コードをコピー'}
                </button>
                <span class="font-bold text-slate-700 dark:text-slate-200 mt-1">2. 相手からの応答コードを入力</span>
                <div class="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="応答コードを貼り付け..."
                    aria-label="相手からの応答コード入力"
                    value={hostInputAnswer()}
                    onInput={(e) => setHostInputAnswer(e.currentTarget.value)}
                    class="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                  />
                  <button
                    onClick={handleHostComplete}
                    class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs active:scale-95"
                  >
                    接続
                  </button>
                </div>
              </div>
            </Show>

            {/* ゲスト */}
            <Show when={p2pRole() === 'guest' && p2pStatus() === 'waiting_answer'}>
              <div class="flex flex-col gap-2">
                <Show when={!guestAnswerCode()}>
                  <span class="font-bold text-slate-700 dark:text-slate-200">ホストの招待コードを貼り付け</span>
                  <div class="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="招待コードを貼り付け..."
                      aria-label="ホストの招待コード入力"
                      value={guestInputOffer()}
                      onInput={(e) => setGuestInputOffer(e.currentTarget.value)}
                      class="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs"
                    />
                    <button
                      onClick={handleGuestJoin}
                      class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs active:scale-95"
                    >
                      応答生成
                    </button>
                  </div>
                </Show>

                <Show when={guestAnswerCode()}>
                  <span class="font-bold text-slate-700 dark:text-slate-200">生成された応答コードをホストに送信</span>
                  <button
                    onClick={() => copyToClipboard(guestAnswerCode(), '応答コード')}
                    class="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500"
                  >
                    {copyStatus() || '応答コードをコピーして送る'}
                  </button>
                  <p class="text-[11px] text-slate-400 animate-pulse text-center">
                    ホストが応答コードを入力すると自動的に対局が始まります...
                  </p>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        {/* 通知メッセージ */}
        <Show when={message()}>
          <div class="w-full text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 py-1 px-3 rounded-xl border border-emerald-500/20">
            {message()}
          </div>
        </Show>

        {/* 獲得した駒 ＆ 手番ステータス */}
        <div class="w-full flex items-center justify-between text-xs px-2 py-1 text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-1.5">
            <span class="font-semibold text-slate-400">白獲得:</span>
            <span class="text-sm font-bold">{capturedByWhite().join(' ') || '-'}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                turn() === 'w'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                  : 'bg-stone-800 text-white border border-stone-700'
              }`}
            >
              {turn() === 'w' ? '♔ 白番' : '♚ 黒番'}
            </span>
            <span class="font-bold">
              {playMode() === 'npc'
                ? isAiThinking()
                  ? 'NPC思考中...'
                  : turn() === 'w'
                  ? 'あなたの番'
                  : 'NPCの番'
                : playMode() === 'local'
                ? `${turn() === 'w' ? '白' : '黒'}の番です`
                : p2pStatus() === 'connected'
                ? turn() === playerColor()
                  ? 'あなたの番'
                  : '相手の番'
                : '接続待機中'}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="font-semibold text-slate-400">黒獲得:</span>
            <span class="text-sm font-bold">{capturedByBlack().join(' ') || '-'}</span>
          </div>
        </div>

        {/* チェス盤 (8x8) */}
        <div class="w-full aspect-square p-2 bg-stone-700 dark:bg-stone-900 rounded-3xl shadow-xl border-4 border-stone-800 select-none">
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
                        type="button"
                        onClick={() => handleCellClick(rIdx(), cIdx())}
                        class={`relative w-full h-full flex items-center justify-center font-bold text-2xl sm:text-3xl md:text-4xl transition-all cursor-pointer ${
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
                          <div class="w-3.5 h-3.5 rounded-full bg-blue-500/80 absolute shadow-xs ring-2 ring-white/50" />
                        </Show>
                      </button>
                    );
                  }}
                </For>
              )}
            </For>
          </div>
        </div>
      </div>
    </GameShell>
  );
};