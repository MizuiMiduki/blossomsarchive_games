import { Component, createSignal, onSettled, onCleanup, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { ZeroTrustP2P } from '../../utils/p2p.ts';
import {
  ShogiBoard,
  PieceType,
  createInitialShogiBoard,
  getValidShogiMoves,
  chooseShogiMove,
  PIECE_LABELS,
} from './logic.ts';

// 伝統的な将棋の駒 (五角形・木目・筆文字・成駒朱文字)
interface ShogiPieceViewProps {
  type: PieceType;
  promoted?: boolean;
  isAi?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'board';
}

const ShogiPieceView: Component<ShogiPieceViewProps> = (props) => {
  const label = () => {
    if (props.type === 'K') {
      return props.isAi ? '王' : '玉';
    }
    return props.promoted ? PIECE_LABELS[props.type].promoted : PIECE_LABELS[props.type].normal;
  };
  const isRed = () => Boolean(props.promoted);
  const sizeClass = () => {
    if (props.size === 'sm') return 'w-7 h-8';
    if (props.size === 'md') return 'w-9 h-10';
    return 'w-[84%] h-[90%] max-w-[64px] max-h-[72px]';
  };

  return (
    <div
      class={`relative flex items-center justify-center transition-all select-none ${sizeClass()} ${
        props.isAi ? 'rotate-180' : ''
      } ${props.isSelected ? '-translate-y-1 scale-105' : ''}`}
    >
      <svg
        viewBox="0 0 100 115"
        class="w-full h-full drop-shadow-sm transition-all"
        style={{
          filter: props.isSelected
            ? 'drop-shadow(0 0 6px rgba(244,63,94,0.9)) drop-shadow(0 3px 5px rgba(0,0,0,0.35))'
            : 'drop-shadow(0 2px 3px rgba(0,0,0,0.22))',
        }}
      >
        <defs>
          <linearGradient id="shogi-koma-wood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fffdf7" />
            <stop offset="30%" stop-color="#fef3c7" />
            <stop offset="100%" stop-color="#fde68a" />
          </linearGradient>
        </defs>

        {/* 将棋駒の伝統的五角形 (尖った頭部・左右の肩・やや幅広の底辺) */}
        <polygon
          points="50,4 84,28 89,112 11,112 16,28"
          fill="url(#shogi-koma-wood)"
          stroke="#b45309"
          stroke-width="3.5"
          stroke-linejoin="round"
        />

        {/* 駒の内側ハイライト線 (面取りの立体感) */}
        <polygon
          points="50,9 80,31 84,107 16,107 20,31"
          fill="none"
          stroke="rgba(255, 255, 255, 0.75)"
          stroke-width="1.8"
          stroke-linejoin="round"
        />

        {/* 筆文字風の漢字 (黒墨 / 成駒は漆の朱色) */}
        <text
          x="50"
          y="74"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="'Hiragino Mincho ProN', 'Yu Mincho', 'Sawarabi Mincho', serif"
          font-weight="900"
          font-size="44"
          fill={isRed() ? '#e11d48' : '#1c1917'}
        >
          {label()}
        </text>
      </svg>
    </div>
  );
};

type PlayMode = 'npc' | 'local' | 'p2p';

export const MiniShogiGame: Component = () => {
  const [board, setBoard] = createSignal<ShogiBoard>(createInitialShogiBoard());
  const [playerHand, setPlayerHand] = createSignal<PieceType[]>([]);
  const [aiHand, setAiHand] = createSignal<PieceType[]>([]);
  const [selectedCell, setSelectedCell] = createSignal<[number, number] | null>(null);
  const [selectedHandPiece, setSelectedHandPiece] = createSignal<PieceType | null>(null);
  const [selectedHandOwner, setSelectedHandOwner] = createSignal<'player' | 'ai' | null>(null);
  const [turn, setTurn] = createSignal<'player' | 'ai'>('player');
  const [playerSide, setPlayerSide] = createSignal<'player' | 'ai'>('player');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [playMode, setPlayMode] = createSignal<PlayMode>('npc');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

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
    setBoard(createInitialShogiBoard());
    setPlayerHand([]);
    setAiHand([]);
    setSelectedCell(null);
    setSelectedHandPiece(null);
    setSelectedHandOwner(null);
    setTurn('player');
    setIsAiThinking(false);
    setIsGameOver(false);
    setIsVictory(false);
  };

  const initP2p = () => {
    if (p2pInstance) p2pInstance.close();
    p2pInstance = new ZeroTrustP2P({
      onConnected: () => {
        sound.playVictory();
        setP2pStatus('connected');
        restart();
      },
      onMessage: (data: any) => {
        if (data.type === 'move' && data.from && data.to) {
          executeMoveAction(data.from, data.to, 'ai', false);
        } else if (data.type === 'drop' && data.dropType && data.to) {
          executeDropAction(data.dropType, data.to, 'ai', false);
        }
      },
      onError: (err) => {
        console.error('P2P Error:', err);
        setP2pStatus('error');
      },
      onDisconnected: () => {
        setP2pStatus('idle');
      },
    });
  };

  const handleHostCreateRoom = async () => {
    initP2p();
    setP2pRole('host');
    setPlayerSide('player'); // 先手
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
    setPlayerSide('ai'); // 後手
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

  const triggerAi = (currentBoard: ShogiBoard, currentAiHand: PieceType[], currentPlayerHand: PieceType[]) => {
    setIsAiThinking(true);
    setTimeout(() => {
      const act = chooseShogiMove(currentBoard, currentAiHand, currentPlayerHand, difficulty());
      if (!act) {
        setIsGameOver(true);
        setIsVictory(true);
        setIsAiThinking(false);
        sound.playVictory();
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
            sound.playGameOver();
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
    }, 450);
  };

  // 駒の移動アクション
  const executeMoveAction = (
    from: [number, number],
    to: [number, number],
    movingSide: 'player' | 'ai',
    sendP2p = true
  ) => {
    const currentBoard = board();
    const [sr, sc] = from;
    const [r, c] = to;
    const movingPiece = currentBoard[sr][sc]!;
    const targetPiece = currentBoard[r][c];
    const nextBoard = currentBoard.map((row) => [...row]);
    let nextPlayerHand = [...playerHand()];
    let nextAiHand = [...aiHand()];

    if (targetPiece) {
      if (movingSide === 'player') {
        nextPlayerHand.push(targetPiece.type);
      } else {
        nextAiHand.push(targetPiece.type);
      }
      sound.playMatch(5);
      if (targetPiece.type === 'K') {
        nextBoard[sr][sc] = null;
        nextBoard[r][c] = movingPiece;
        setBoard(nextBoard);
        setPlayerHand(nextPlayerHand);
        setAiHand(nextAiHand);
        setIsGameOver(true);
        setIsVictory(movingSide === playerSide());
        sound.playVictory();
        return;
      }
    } else {
      sound.playPop(500);
    }

    // 成り判定 (5五将棋は1段目突入で自動成)
    let promoted = movingPiece.promoted;
    if (!promoted && movingPiece.type !== 'K' && movingPiece.type !== 'G') {
      if (movingSide === 'player' && (r === 0 || sr === 0)) {
        promoted = true;
      } else if (movingSide === 'ai' && (r === 4 || sr === 4)) {
        promoted = true;
      }
    }

    nextBoard[sr][sc] = null;
    nextBoard[r][c] = { ...movingPiece, promoted };

    setBoard(nextBoard);
    setPlayerHand(nextPlayerHand);
    setAiHand(nextAiHand);
    setSelectedCell(null);

    const nextTurn = movingSide === 'player' ? 'ai' : 'player';
    setTurn(nextTurn);

    if (sendP2p && playMode() === 'p2p') {
      p2pInstance?.send({ type: 'move', from, to });
    }

    if (playMode() === 'npc' && nextTurn === 'ai') {
      triggerAi(nextBoard, nextAiHand, nextPlayerHand);
    }
  };

  // 持ち駒を打つアクション
  const executeDropAction = (
    dropType: PieceType,
    to: [number, number],
    droppingSide: 'player' | 'ai',
    sendP2p = true
  ) => {
    const currentBoard = board();
    const [r, c] = to;
    const nextBoard = currentBoard.map((row) => [...row]);
    nextBoard[r][c] = {
      id: Date.now(),
      type: dropType,
      promoted: false,
      side: droppingSide,
    };

    let nextPlayerHand = [...playerHand()];
    let nextAiHand = [...aiHand()];

    if (droppingSide === 'player') {
      const idx = nextPlayerHand.indexOf(dropType);
      if (idx >= 0) nextPlayerHand.splice(idx, 1);
    } else {
      const idx = nextAiHand.indexOf(dropType);
      if (idx >= 0) nextAiHand.splice(idx, 1);
    }

    setBoard(nextBoard);
    setPlayerHand(nextPlayerHand);
    setAiHand(nextAiHand);
    setSelectedHandPiece(null);
    setSelectedHandOwner(null);
    sound.playPop(520);

    const nextTurn = droppingSide === 'player' ? 'ai' : 'player';
    setTurn(nextTurn);

    if (sendP2p && playMode() === 'p2p') {
      p2pInstance?.send({ type: 'drop', dropType, to });
    }

    if (playMode() === 'npc' && nextTurn === 'ai') {
      triggerAi(nextBoard, nextAiHand, nextPlayerHand);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (isGameOver()) return;
    const mode = playMode();
    const curTurn = turn();

    if (mode === 'npc') {
      if (curTurn !== 'player' || isAiThinking()) return;
    } else if (mode === 'p2p') {
      if (p2pStatus() !== 'connected' || curTurn !== playerSide()) return;
    }

    const currentBoard = board();
    const cell = currentBoard[r][c];
    const sel = selectedCell();
    const handPiece = selectedHandPiece();
    const activeSide = curTurn;

    // 1. 持ち駒を打つ処理
    if (handPiece && selectedHandOwner() === activeSide) {
      if (!cell) {
        executeDropAction(handPiece, [r, c], activeSide);
      } else {
        setSelectedHandPiece(null);
        setSelectedHandOwner(null);
      }
      return;
    }

    // 2. 盤上の駒を移動する処理
    if (sel) {
      const [sr, sc] = sel;
      const validMoves = getValidShogiMoves(currentBoard, sr, sc);
      const isMoveValid = validMoves.some(([mr, mc]) => mr === r && mc === c);

      if (isMoveValid) {
        executeMoveAction([sr, sc], [r, c], activeSide);
        return;
      }

      if (cell && cell.side === activeSide) {
        setSelectedCell([r, c]);
        sound.playPop(350);
        return;
      }

      setSelectedCell(null);
      return;
    }

    // 3. 駒を選択
    if (cell && cell.side === activeSide) {
      setSelectedCell([r, c]);
      setSelectedHandPiece(null);
      setSelectedHandOwner(null);
      sound.playPop(440);
    }
  };

  const handleHandClick = (type: PieceType, owner: 'player' | 'ai') => {
    if (isGameOver()) return;
    const mode = playMode();
    const curTurn = turn();

    if (mode === 'npc') {
      if (curTurn !== 'player' || isAiThinking() || owner !== 'player') return;
    } else if (mode === 'p2p') {
      if (p2pStatus() !== 'connected' || curTurn !== playerSide() || owner !== playerSide()) return;
    } else if (mode === 'local') {
      if (curTurn !== owner) return;
    }

    if (selectedHandPiece() === type && selectedHandOwner() === owner) {
      setSelectedHandPiece(null);
      setSelectedHandOwner(null);
      return;
    }

    setSelectedHandPiece(type);
    setSelectedHandOwner(owner);
    setSelectedCell(null);
    sound.playPop(380);
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
    '5×5盤のコンパクトなミニ将棋です。王将（玉将）を詰ませば勝利！',
    '相手の駒を取ると自分の「持ち駒」になり、空いているマスに打つことができます。',
    '敵陣の1段目に進むと成ることができます（金・王以外）。',
    '【NPC対戦】初級・中級・上級からNPCの強さを選んで対局できます。',
    '【対面対戦】1台のスマホ/PCで先手と後手を交代で指して対局できます。',
    '【P2P対戦】招待コードを交換して離れた友達とオンライン直接対局！',
  ];

  return (
    <GameShell
      id="mini-shogi"
      title="5五将棋 (Mini Shogi)"
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
      <div class="flex flex-col items-center gap-1.5 w-full max-w-lg">
        {/* P2P 接続パネル */}
        <Show when={playMode() === 'p2p' && p2pStatus() !== 'connected'}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-xl border border-emerald-500/30 text-xs animate-in fade-in">
            <div class="flex items-center justify-between mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <span class="font-bold text-slate-800 dark:text-slate-100">P2P オンライン5五将棋</span>
              <span class="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                E2EE 暗号化通信
              </span>
            </div>

            <Show when={p2pStatus() === 'idle'}>
              <div class="flex flex-col gap-2.5">
                <p class="text-slate-500 text-[11px]">
                  サーバーを介さずブラウザ同士が直接P2P通信で接続して5五将棋を対局します。
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleHostCreateRoom}
                    class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm active:scale-95 transition-all"
                  >
                    部屋を作る (先手/下側)
                  </button>
                  <button
                    onClick={() => {
                      setP2pRole('guest');
                      setP2pStatus('waiting_answer');
                    }}
                    class="py-2.5 rounded-xl border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold active:scale-95 transition-all hover:bg-emerald-50"
                  >
                    部屋に参加 (後手/上側)
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

        {/* 後手 持ち駒台 */}
        <div class="w-full flex items-center justify-between px-3 py-1.5 bg-amber-50/70 dark:bg-slate-900/80 rounded-xl border border-amber-200/80 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-700 dark:text-slate-200 text-[11px]">
              {playMode() === 'local' ? '後手 持ち駒:' : '後手 (相手) 持ち駒:'}
            </span>
            <div class="flex items-center gap-1 flex-wrap min-h-[30px]">
              <For each={aiHand()}>
                {(type) => {
                  const isHandSelected = () =>
                    selectedHandPiece() === type && selectedHandOwner() === 'ai';
                  return (
                    <div
                      onClick={() => handleHandClick(type, 'ai')}
                      class={`cursor-pointer transition-transform transform ${
                        isHandSelected() ? '-translate-y-1.5 ring-2 ring-rose-500 rounded-md' : 'hover:scale-105'
                      }`}
                    >
                      <ShogiPieceView type={type} size="sm" isAi={true} isSelected={isHandSelected()} />
                    </div>
                  );
                }}
              </For>
              <Show when={aiHand().length === 0}>
                <span class="text-slate-400 text-[11px]">なし</span>
              </Show>
            </div>
          </div>
          <span class="text-[11px] font-semibold text-slate-500">{aiHand().length}枚</span>
        </div>

        {/* 手番ステータス */}
        <div class="w-full flex items-center justify-between px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-2">
            <span>手番:</span>
            <span
              class={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                turn() === 'player'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                  : 'bg-stone-800 text-white border border-stone-700'
              }`}
            >
              {turn() === 'player' ? '☗ 先手番' : '☖ 後手番'}
            </span>
          </div>

          <div class="font-bold text-slate-800 dark:text-slate-200">
            {playMode() === 'npc'
              ? isAiThinking()
                ? 'NPC思考中...'
                : turn() === 'player'
                ? 'あなたの番'
                : 'NPCの番'
              : playMode() === 'local'
              ? `${turn() === 'player' ? '先手' : '後手'}の番です`
              : p2pStatus() === 'connected'
              ? turn() === playerSide()
                ? 'あなたの番'
                : '相手の番'
              : '接続待機中'}
          </div>
        </div>

        {/* 5五将棋盤 */}
        <div class="w-full max-w-[420px] aspect-square bg-[#e6bf83] dark:bg-[#b08850] p-2 sm:p-3 rounded-2xl shadow-xl border-4 border-[#8c5e2d] relative select-none">
          <div class="grid grid-cols-5 grid-rows-5 gap-0 w-full h-full border border-amber-950/80 bg-[#f7d8a5] dark:bg-[#cca36a]">
            <For each={board()}>
              {(row, rIdx) => (
                <For each={row}>
                  {(cell, cIdx) => {
                    const r = () => rIdx();
                    const c = () => cIdx();
                    const selected = () =>
                      selectedCell() && selectedCell()![0] === r() && selectedCell()![1] === c();

                    const highlight = () => {
                      if (selectedCell()) {
                        const moves = getValidShogiMoves(board(), selectedCell()![0], selectedCell()![1]);
                        return moves.some(([mr, mc]) => mr === r() && mc === c());
                      }
                      if (selectedHandPiece() && selectedHandOwner()) {
                        return !board()[r()][c()];
                      }
                      return false;
                    };

                    return (
                      <div
                        onClick={() => handleCellClick(r(), c())}
                        class={`relative w-full h-full flex items-center justify-center border-r border-b border-amber-950/40 cursor-pointer ${
                          selected()
                            ? 'bg-rose-400/35'
                            : 'hover:bg-amber-200/50 dark:hover:bg-amber-700/40'
                        }`}
                      >
                        {/* 移動可能マスのマーカー */}
                        <Show when={highlight()}>
                          <div class="w-3 h-3 rounded-full bg-rose-500/80 absolute z-20 animate-pulse pointer-events-none" />
                        </Show>

                        {/* 駒 */}
                        <Show when={cell}>
                          {(p) => (
                            <ShogiPieceView
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

        {/* 先手 持ち駒台 */}
        <div class="w-full flex items-center justify-between px-3 py-1.5 bg-amber-50/70 dark:bg-slate-900/80 rounded-xl border border-amber-200/80 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-700 dark:text-slate-200 text-[11px]">
              {playMode() === 'local' ? '先手 持ち駒:' : '先手 (あなた) 持ち駒:'}
            </span>
            <div class="flex items-center gap-1 flex-wrap min-h-[30px]">
              <For each={playerHand()}>
                {(type) => {
                  const isHandSelected = () =>
                    selectedHandPiece() === type && selectedHandOwner() === 'player';
                  return (
                    <div
                      onClick={() => handleHandClick(type, 'player')}
                      class={`cursor-pointer transition-transform transform ${
                        isHandSelected() ? '-translate-y-1.5 ring-2 ring-rose-500 rounded-md' : 'hover:scale-105'
                      }`}
                    >
                      <ShogiPieceView type={type} size="sm" isSelected={isHandSelected()} />
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
      </div>
    </GameShell>
  );
};