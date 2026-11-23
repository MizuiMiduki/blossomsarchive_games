import { Component, createSignal, onSettled, For, Show, createMemo } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import {
  Player,
  BoardState,
  createInitialBoard,
  getOpponent,
  getValidMoves,
  applyMove,
  countStones,
  chooseAIMove,
} from './logic.ts';
import { ZeroTrustP2P } from '../../utils/p2p.ts';
import {
  calculateStateHash,
  validateIncomingPacket,
  P2PActionPacket,
} from '../../utils/security.ts';

type PlayMode = 'npc' | 'p2p';

export const ReversiGame: Component = () => {
  // 基本ゲーム状態
  const [board, setBoard] = createSignal<BoardState>(createInitialBoard());
  const [turn, setTurn] = createSignal<Player>('black');
  const [playerColor, setPlayerColor] = createSignal<Player>('black');
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [playMode, setPlayMode] = createSignal<PlayMode>('npc');
  const [isAiThinking, setIsAiThinking] = createSignal(false);
  const [showGuide] = createSignal(true);
  const [message, setMessage] = createSignal<string>('');
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

  // --- P2P サーバーレス対戦関連の状態 ---
  const [p2pRole, setP2pRole] = createSignal<'host' | 'guest' | null>(null);
  const [p2pStatus, setP2pStatus] = createSignal<'idle' | 'generating' | 'waiting_answer' | 'connected' | 'error'>('idle');
  const [hostOfferCode, setHostOfferCode] = createSignal<string>('');
  const [hostQrUrl, setHostQrUrl] = createSignal<string>('');
  const [guestInputOffer, setGuestInputOffer] = createSignal<string>('');
  const [guestAnswerCode, setGuestAnswerCode] = createSignal<string>('');
  const [hostInputAnswer, setHostInputAnswer] = createSignal<string>('');
  const [p2pErrorMessage, setP2pErrorMessage] = createSignal<string>('');
  const [expectedSeq, setExpectedSeq] = createSignal<number>(1);
  const [copyStatus, setCopyStatus] = createSignal<string | null>(null);

  let p2pInstance: ZeroTrustP2P | null = null;

  // 石の数カウント
  const counts = createMemo(() => countStones(board()));
  // 現在の手番の合法手
  const validMoves = createMemo(() => getValidMoves(board(), turn()));

  // ゲームリセット
  const restart = () => {
    setBoard(createInitialBoard());
    setTurn('black');
    setIsAiThinking(false);
    setMessage('');
    setIsGameOver(false);
    setIsVictory(false);
    setExpectedSeq(1);

    if (playMode() === 'npc' && playerColor() === 'white') {
      triggerAiMove(createInitialBoard(), 'black');
    }
  };

  // --- P2P接続の初期化 & イベントハンドラー ---
  const initP2pInstance = () => {
    if (p2pInstance) p2pInstance.close();

    p2pInstance = new ZeroTrustP2P({
      onConnected: () => {
        sound.playVictory();
        setP2pStatus('connected');
        setMessage('P2P暗号化接続が完了しました！対戦開始！');
        restart();
      },
      onMessage: async (data: unknown) => {
        await handleIncomingP2pMessage(data);
      },
      onDisconnected: () => {
        setP2pStatus('idle');
        setMessage('相手とのP2P接続が切断されました。');
        sound.playPop(300);
      },
      onError: (err: string) => {
        setP2pStatus('error');
        setP2pErrorMessage(err);
      },
    });
  };

  // ホスト: 部屋を作成
  const handleHostCreateRoom = async () => {
    initP2pInstance();
    setP2pRole('host');
    setPlayerColor('black'); // ホストは先手黒
    setP2pStatus('generating');
    setP2pErrorMessage('');

    try {
      const offer = await p2pInstance!.createHostOffer();
      setHostOfferCode(offer);
      const qr = await ZeroTrustP2P.toQrCode(offer);
      setHostQrUrl(qr);
      setP2pStatus('waiting_answer');
      sound.playPop(520);
    } catch {
      setP2pStatus('error');
      setP2pErrorMessage('招待コードの生成に失敗しました。');
    }
  };

  // ホスト: ゲストからの応答コードを適用
  const handleHostApplyAnswer = async () => {
    if (!hostInputAnswer().trim() || !p2pInstance) return;
    try {
      await p2pInstance.completeHostConnection(hostInputAnswer().trim());
      sound.playPop(500);
    } catch {
      setP2pErrorMessage('応答コードの適用に失敗しました。コードを確認してください。');
    }
  };

  // ゲスト: 招待コードを入力して応答コードを生成
  const handleGuestJoinRoom = async () => {
    if (!guestInputOffer().trim()) return;
    initP2pInstance();
    setP2pRole('guest');
    setPlayerColor('white'); // ゲストは後手白
    setP2pStatus('generating');
    setP2pErrorMessage('');

    try {
      const answer = await p2pInstance!.joinGuest(guestInputOffer().trim());
      setGuestAnswerCode(answer);
      setP2pStatus('waiting_answer');
      sound.playPop(520);
    } catch {
      setP2pStatus('error');
      setP2pErrorMessage('招待コードが無効です。');
    }
  };

  // --- P2Pパケットの厳格な検証 & 受信処理 ---
  const handleIncomingP2pMessage = async (raw: unknown) => {
    // 1. スキーマ & シーケンス & タイムスタンプ検証
    const packet = validateIncomingPacket(raw, expectedSeq());
    if (!packet) {
      setMessage('⚠️ セキュリティ警告: 不正な通信パケットを検知しブロックしました。');
      sound.playPop(200);
      p2pInstance?.close();
      return;
    }

    setExpectedSeq((s) => s + 1);

    const currentBoard = board();

    // 2. 相手の手番かチェック
    const opponentColor = getOpponent(playerColor());
    if (turn() !== opponentColor) {
      setMessage('⚠️ セキュリティ警告: 相手の手番違反を検知しました。');
      p2pInstance?.close();
      return;
    }

    // 3. 盤面ハッシュの検証 (相手と自分の盤面状態が完全に一致しているか)
    const localHash = await calculateStateHash(currentBoard);
    if (packet.stateHash !== localHash) {
      setMessage('⚠️ セキュリティ警告: 盤面状態の不一致 (Desync/改ざん) を検知しました。');
      p2pInstance?.close();
      return;
    }

    // 4. アクション実行
    if (packet.type === 'move' && packet.row !== undefined && packet.col !== undefined) {
      const moves = getValidMoves(currentBoard, opponentColor);
      const isValid = moves.some(([mr, mc]) => mr === packet.row && mc === packet.col);

      if (!isValid) {
        setMessage('⚠️ セキュリティ警告: ルール違反の手を検知しました。');
        p2pInstance?.close();
        return;
      }

      const { board: nextBoard, flipped } = applyMove(currentBoard, packet.row, packet.col, opponentColor);
      setBoard(nextBoard);
      sound.playMatch(Math.min(flipped.length, 6));

      // 手番の更新
      const nextMoves = getValidMoves(nextBoard, playerColor());
      if (nextMoves.length > 0) {
        setTurn(playerColor());
        setMessage('あなたの手番です');
      } else {
        // プレイヤーがパス
        const oppFollowUp = getValidMoves(nextBoard, opponentColor);
        if (oppFollowUp.length > 0) {
          setMessage('置ける場所がありません。あなたのパスです');
          setTurn(opponentColor);
          // パスパケットを送信
          await sendP2pAction({ type: 'pass', stateHash: await calculateStateHash(nextBoard) });
        } else {
          endGame(nextBoard);
        }
      }
    } else if (packet.type === 'pass') {
      setMessage('相手がパスしました！あなたの手番です');
      setTurn(playerColor());
      sound.playPop(440);
    }
  };

  // P2Pパケットの署名 & 送信
  const sendP2pAction = async (action: { type: P2PActionPacket['type']; row?: number; col?: number; stateHash: string }) => {
    if (!p2pInstance) return;
    const packet: P2PActionPacket = {
      seq: expectedSeq(),
      timestamp: Date.now(),
      type: action.type,
      row: action.row,
      col: action.col,
      stateHash: action.stateHash,
    };
    p2pInstance.send(packet);
    setExpectedSeq((s) => s + 1);
  };

  // --- NPC 思考ルーチン ---
  const triggerAiMove = (currentBoard: BoardState, aiPlayer: Player) => {
    setIsAiThinking(true);
    setMessage('相手が思考中...');

    setTimeout(() => {
      const move = chooseAIMove(currentBoard, aiPlayer, difficulty());

      if (!move) {
        const opp = getOpponent(aiPlayer);
        const oppMoves = getValidMoves(currentBoard, opp);
        if (oppMoves.length === 0) {
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
        const aiFollowUp = getValidMoves(nextBoard, aiPlayer);
        if (aiFollowUp.length > 0) {
          setMessage('置ける場所がありません。あなたのパスです');
          sound.playPop(350);
          setTimeout(() => triggerAiMove(nextBoard, aiPlayer), 1000);
        } else {
          endGame(nextBoard);
        }
      }
    }, 600);
  };

  // マスタップ処理
  const handleCellClick = async (r: number, c: number) => {
    if (isAiThinking() || isGameOver() || turn() !== playerColor()) return;

    const currentBoard = board();
    const moves = validMoves();
    const isValid = moves.some(([mr, mc]) => mr === r && mc === c);
    if (!isValid) return;

    // 着手実行
    const stateHashBefore = await calculateStateHash(currentBoard);
    const { board: nextBoard, flipped } = applyMove(currentBoard, r, c, playerColor());
    setBoard(nextBoard);
    sound.playMatch(Math.min(flipped.length, 6));

    if (playMode() === 'p2p') {
      // P2P対戦: 暗号化パケット送信
      await sendP2pAction({
        type: 'move',
        row: r,
        col: c,
        stateHash: stateHashBefore,
      });

      const opponentColor = getOpponent(playerColor());
      const oppMoves = getValidMoves(nextBoard, opponentColor);

      if (oppMoves.length > 0) {
        setTurn(opponentColor);
        setMessage('相手の手番を待っています...');
      } else {
        // 相手がパスの場合
        const myFollowUp = getValidMoves(nextBoard, playerColor());
        if (myFollowUp.length > 0) {
          setMessage('相手の手がありません。連続してあなたの番です！');
          sound.playPop(480);
        } else {
          endGame(nextBoard);
        }
      }
    } else {
      // NPC対戦
      const aiColor = getOpponent(playerColor());
      const aiMoves = getValidMoves(nextBoard, aiColor);
      if (aiMoves.length > 0) {
        setTurn(aiColor);
        triggerAiMove(nextBoard, aiColor);
      } else {
        const playerFollowUp = getValidMoves(nextBoard, playerColor());
        if (playerFollowUp.length > 0) {
          setMessage('相手の手がありません。連続してあなたの手番です！');
        } else {
          endGame(nextBoard);
        }
      }
    }
  };

  // 終局処理
  const endGame = (finalBoard: BoardState) => {
    const finalCounts = countStones(finalBoard);
    setIsAiThinking(false);
    setIsGameOver(true);

    const playerStones = playerColor() === 'black' ? finalCounts.black : finalCounts.white;
    const oppStones = playerColor() === 'black' ? finalCounts.white : finalCounts.black;

    if (playerStones > oppStones) {
      setIsVictory(true);
      setMessage(`見事な勝利！ ${playerStones} 対 ${oppStones}`);
    } else if (playerStones < oppStones) {
      setIsVictory(false);
      setMessage(`惜敗... ${playerStones} 対 ${oppStones}`);
    } else {
      setIsVictory(false);
      setMessage(`引き分け！ ${playerStones} 対 ${oppStones}`);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    sound.playPop(520);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label}をコピーしました！`);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      // fallback
    }
  };

  onSettled(() => {
    restart();
    return () => {
      p2pInstance?.close();
    };
  });

  const instructions = [
    '相手の石を挟むと自分の色に反転します。四隅を抑えるのが勝利へのカギ！',
    '【NPC対戦】初級〜上級のAIと対戦できます。',
    '【P2P対戦】サーバーを介さずブラウザ同士が直接暗号化通信。招待コード/QRコードを交換するだけで誰とでも安全に対戦できます。',
  ];

  return (
    <GameShell
      id="petal-reversi"
      title="Reversi (オセロ)"
      score={playerColor() === 'black' ? counts().black : counts().white}
      isGameOver={isGameOver() && !isVictory()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex flex-col gap-2 w-full max-w-sm">
          {/* NPC難易度 & 先手後手 (NPCモード時) */}
          <Show when={playMode() === 'npc'}>
            <div class="flex items-center justify-between p-1.5 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-rose-100 dark:border-slate-800 text-xs shadow-2xs">
              <span class="font-bold text-slate-500 pl-1">強さ:</span>
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
                    class={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                      difficulty() === diff
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
                    }`}
                  >
                    {diff === 'easy' ? '🌱 初級' : diff === 'normal' ? '🌸 中級' : '👑 上級'}
                  </button>
                ))}
              </div>

              <div class="w-px h-4 bg-slate-200 dark:bg-slate-700" />

              <button
                onClick={() => {
                  const next: Player = playerColor() === 'black' ? 'white' : 'black';
                  sound.playPop(420);
                  setPlayerColor(next);
                  restart();
                }}
                class="px-2 py-1 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-500"
              >
                {playerColor() === 'black' ? '先手(黒⚫)' : '後手(白⚪)'}
              </button>
            </div>
          </Show>

          {/* モード選択 */}
          <div class="flex items-center justify-center gap-2 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-rose-100 dark:border-slate-800 text-xs shadow-2xs">
            <button
              onClick={() => {
                sound.playPop(420);
                setPlayMode('npc');
                restart();
              }}
              class={`flex-1 py-1 rounded-xl font-bold transition-all text-center ${
                playMode() === 'npc'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
              }`}
            >
              🤖 NPC対戦
            </button>
            <button
              onClick={() => {
                sound.playPop(420);
                setPlayMode('p2p');
              }}
              class={`flex-1 py-1 rounded-xl font-bold transition-all text-center ${
                playMode() === 'p2p'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-emerald-500'
              }`}
            >
              🔒 P2P暗号化対戦
            </button>
          </div>
        </div>
      }
    >
      {/* P2P 接続パネル (P2P対戦モード時のみ表示) */}
      <Show when={playMode() === 'p2p' && p2pStatus() !== 'connected'}>
        <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-xl border border-emerald-200 dark:border-emerald-950 mb-3 text-xs animate-in fade-in">
          <div class="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>🛡️ ゼロトラスト P2P 接続</span>
            </span>
            <span class="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              サーバー介在ゼロ / E2EE
            </span>
          </div>

          <Show when={p2pStatus() === 'idle'}>
            <div class="flex flex-col gap-2">
              <p class="text-slate-500 text-[11px] leading-relaxed">
                中央サーバーを一切介さず、ブラウザ同士が直接P2P通信で接続します。
              </p>
              <div class="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={handleHostCreateRoom}
                  class="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm active:scale-95 transition-all"
                >
                  部屋を作る (ホスト)
                </button>
                <button
                  onClick={() => setP2pRole('guest')}
                  class="py-2.5 rounded-xl border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold active:scale-95 transition-all"
                >
                  部屋に参加 (ゲスト)
                </button>
              </div>
            </div>
          </Show>

          {/* ホスト: 招待コード提示 & 応答コード待ち */}
          <Show when={p2pRole() === 'host' && p2pStatus() === 'waiting_answer'}>
            <div class="flex flex-col items-center gap-2">
              <span class="font-bold text-slate-700 dark:text-slate-200">1. 招待コードを相手に共有</span>
              <Show when={hostQrUrl()}>
                <img src={hostQrUrl()} alt="P2P招待QR" class="w-36 h-36 border p-1 rounded-xl bg-white shadow-xs" />
              </Show>
              <button
                onClick={() => copyToClipboard(hostOfferCode(), '招待コード')}
                class="w-full py-1.5 rounded-lg border border-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px] hover:bg-slate-50"
              >
                {copyStatus() || '📋 招待コードをコピー'}
              </button>

              <span class="font-bold text-slate-700 dark:text-slate-200 mt-2">2. 相手から届いた応答コードを入力</span>
              <input
                type="text"
                placeholder="応答コードを貼り付け..."
                value={hostInputAnswer()}
                onInput={(e) => setHostInputAnswer(e.currentTarget.value)}
                class="w-full p-2 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
              />
              <button
                onClick={handleHostApplyAnswer}
                class="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm"
              >
                接続を完了して対戦開始
              </button>
            </div>
          </Show>

          {/* ゲスト: 招待コード貼り付け & 応答コード生成 */}
          <Show when={p2pRole() === 'guest' && p2pStatus() !== 'waiting_answer'}>
            <div class="flex flex-col gap-2">
              <span class="font-bold text-slate-700 dark:text-slate-200">ホストの招待コードを入力:</span>
              <textarea
                rows={3}
                placeholder="ホストから貰った招待コードを貼り付け..."
                value={guestInputOffer()}
                onInput={(e) => setGuestInputOffer(e.currentTarget.value)}
                class="w-full p-2 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
              />
              <button
                onClick={handleGuestJoinRoom}
                class="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm"
              >
                応答コードを発行する
              </button>
            </div>
          </Show>

          <Show when={p2pRole() === 'guest' && p2pStatus() === 'waiting_answer'}>
            <div class="flex flex-col items-center gap-2">
              <span class="font-bold text-slate-700 dark:text-slate-200">生成された応答コードをホストに渡してください:</span>
              <button
                onClick={() => copyToClipboard(guestAnswerCode(), '応答コード')}
                class="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm"
              >
                {copyStatus() || '📋 応答コードをコピー'}
              </button>
              <span class="text-[10px] text-slate-400 animate-pulse">ホストの承認を待っています...</span>
            </div>
          </Show>

          <Show when={p2pErrorMessage()}>
            <div class="text-[11px] font-bold text-rose-500 mt-2 text-center">{p2pErrorMessage()}</div>
          </Show>
        </div>
      </Show>

      {/* スコア & 手番情報 */}
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
              {playerColor() === 'black' ? 'あなた' : playMode() === 'p2p' ? '相手(P2P)' : 'NPC'}
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
            <span class="text-rose-500 font-bold leading-tight block text-[11px]">{message()}</span>
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
              {playerColor() === 'white' ? 'あなた' : playMode() === 'p2p' ? '相手(P2P)' : 'NPC'}
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
                    (playMode() === 'npc' || p2pStatus() === 'connected') &&
                    validMoves().some(([mr, mc]) => mr === rIdx() && mc === cIdx());

                  return (
                    <button
                      onClick={() => handleCellClick(rIdx(), cIdx())}
                      class="relative w-full h-full bg-emerald-600/90 hover:bg-emerald-500/90 dark:bg-emerald-900/80 dark:hover:bg-emerald-800/80 rounded-lg flex items-center justify-center transition-colors active:scale-95"
                    >
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
