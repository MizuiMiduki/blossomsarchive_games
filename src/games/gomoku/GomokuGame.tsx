import { Component, createSignal, onSettled, onCleanup, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { ZeroTrustP2P } from '../../utils/p2p.ts';
import {
  Stone,
  createEmptyGomokuBoard,
  checkWin,
  chooseGomokuMove,
} from './logic.ts';

type PlayMode = 'npc' | 'local' | 'p2p';

export const GomokuGame: Component = () => {
  const [board, setBoard] = createSignal<(Stone | null)[][]>(createEmptyGomokuBoard());
  const [turn, setTurn] = createSignal<Stone>('black');
  const [playerStone, setPlayerStone] = createSignal<Stone>('black');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [playMode, setPlayMode] = createSignal<PlayMode>('npc');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [winningLine, setWinningLine] = createSignal<[number, number][] | null>(null);
  const [lastMove, setLastMove] = createSignal<[number, number] | null>(null);
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
    setBoard(createEmptyGomokuBoard());
    setTurn('black');
    setIsAiThinking(false);
    setWinningLine(null);
    setLastMove(null);
    setIsGameOver(false);
    setIsVictory(false);
    setMessage('');

    if (playMode() === 'npc' && playerStone() === 'white') {
      triggerAiMove(createEmptyGomokuBoard(), 'black');
    }
  };

  // P2P 接続初期化
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
        if (data.type === 'move' && typeof data.r === 'number' && typeof data.c === 'number') {
          handleIncomingP2pMove(data.r, data.c);
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
    setPlayerStone('black'); // ホストが黒（先手）
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
    setPlayerStone('white'); // ゲストが白（後手）
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
        sound.playGameOver();
        return;
      }

      setTurn(playerStone());
      setIsAiThinking(false);
    }, 450);
  };

  const handleIncomingP2pMove = (r: number, c: number) => {
    const oppStone: Stone = playerStone() === 'black' ? 'white' : 'black';
    const currentBoard = board();
    if (currentBoard[r][c]) return;

    const nextBoard = currentBoard.map((row) => [...row]);
    nextBoard[r][c] = oppStone;
    setBoard(nextBoard);
    setLastMove([r, c]);
    sound.playPop(420);

    const winLine = checkWin(nextBoard, r, c, oppStone);
    if (winLine) {
      setWinningLine(winLine);
      setIsGameOver(true);
      setIsVictory(false);
      sound.playGameOver();
      return;
    }

    setTurn(playerStone());
  };

  const handleCellClick = (r: number, c: number) => {
    if (isGameOver()) return;
    const currentBoard = board();
    if (currentBoard[r][c]) return;

    const mode = playMode();

    if (mode === 'npc') {
      if (isAiThinking() || turn() !== playerStone()) return;

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
        sound.playVictory();
        return;
      }

      const aiStone: Stone = playerStone() === 'black' ? 'white' : 'black';
      setTurn(aiStone);
      triggerAiMove(nextBoard, aiStone);
    } else if (mode === 'local') {
      // ローカル対面対戦: 黒と白が交互に着手
      const curTurn = turn();
      const nextBoard = currentBoard.map((row) => [...row]);
      nextBoard[r][c] = curTurn;
      setBoard(nextBoard);
      setLastMove([r, c]);
      sound.playPop(520);

      const winLine = checkWin(nextBoard, r, c, curTurn);
      if (winLine) {
        setWinningLine(winLine);
        setIsGameOver(true);
        setIsVictory(true);
        sound.playVictory();
        return;
      }

      setTurn(curTurn === 'black' ? 'white' : 'black');
    } else if (mode === 'p2p') {
      // P2P オンライン対戦
      if (p2pStatus() !== 'connected' || turn() !== playerStone()) return;

      const nextBoard = currentBoard.map((row) => [...row]);
      nextBoard[r][c] = playerStone();
      setBoard(nextBoard);
      setLastMove([r, c]);
      sound.playPop(520);

      // 相手へ着手を送信
      p2pInstance?.send({ type: 'move', r, c });

      const winLine = checkWin(nextBoard, r, c, playerStone());
      if (winLine) {
        setWinningLine(winLine);
        setIsGameOver(true);
        setIsVictory(true);
        sound.playVictory();
        return;
      }

      const oppStone: Stone = playerStone() === 'black' ? 'white' : 'black';
      setTurn(oppStone);
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
    '縦・横・斜めのいずれかに自分の石を「連続して5つ」並べると勝利です。',
    '相手の4連や3連を見逃さずに阻止しつつ、自分の連を広げましょう！',
    '【NPC対戦】初級・中級・上級からNPCの強さを選んで対局できます。',
    '【対面対戦】1台の端末を挟んで友達や家族と交代で対局できます。',
    '【P2P対戦】招待コードを交換して、遠くの友達とブラウザ間直接通信でオンライン対局！',
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

          {/* NPC モード時の難易度・先後手 */}
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
                      ? 'bg-rose-500 text-white'
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
              <span class="font-bold text-slate-800 dark:text-slate-100">P2P オンライン対戦</span>
              <span class="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                E2EE 暗号化通信
              </span>
            </div>

            <Show when={p2pStatus() === 'idle'}>
              <div class="flex flex-col gap-2.5">
                <p class="text-slate-500 text-[11px]">
                  サーバーを介さずブラウザ同士が直接接続して対局します。
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleHostCreateRoom}
                    class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm active:scale-95 transition-all"
                  >
                    部屋を作る (先手/黒)
                  </button>
                  <button
                    onClick={() => {
                      setP2pRole('guest');
                      setP2pStatus('waiting_answer');
                    }}
                    class="py-2.5 rounded-xl border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold active:scale-95 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    部屋に参加 (後手/白)
                  </button>
                </div>
              </div>
            </Show>

            {/* ホスト: 招待コード発行 & 応答待ち */}
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

            {/* ゲスト: 招待コード入力 & 応答コード生成 */}
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

        {/* 手番ステータス */}
        <div class="w-full flex items-center justify-between px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-2">
            <span>手番:</span>
            <span
              class={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                turn() === 'black'
                  ? 'bg-slate-900 text-white dark:bg-slate-800'
                  : 'bg-white text-slate-900 border border-slate-300 dark:bg-slate-100'
              }`}
            >
              {turn() === 'black' ? '● 先手 (黒)' : '○ 後手 (白)'}
            </span>
          </div>

          <div class="font-bold text-slate-800 dark:text-slate-200">
            {playMode() === 'npc'
              ? isAiThinking()
                ? 'NPCが思考中...'
                : turn() === playerStone()
                ? 'あなたの番です'
                : 'NPCの番'
              : playMode() === 'local'
              ? `${turn() === 'black' ? '黒' : '白'}の番です`
              : p2pStatus() === 'connected'
              ? turn() === playerStone()
                ? 'あなたの番です'
                : '相手の番'
              : '接続待機中'}
          </div>
        </div>

        {/* 碁盤 (13x13) */}
        <div class="w-full aspect-square bg-amber-100 dark:bg-amber-950/80 p-2 sm:p-2.5 rounded-3xl shadow-xl border-4 border-amber-300/60 dark:border-amber-900/60 select-none">
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
                        type="button"
                        onClick={() => handleCellClick(rIdx(), cIdx())}
                        class="relative w-full h-full flex items-center justify-center border-r border-b border-amber-800/25 dark:border-amber-700/25 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 cursor-pointer"
                      >
                        <Show when={cell}>
                          <div
                            class={`w-[84%] h-[84%] rounded-full shadow-md flex items-center justify-center transition-all ${
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
      </div>
    </GameShell>
  );
};