import { Component, createSignal, onSettled, onCleanup, Show, For } from 'solid-js';
import { ZeroTrustP2P } from '../../utils/p2p';
import confetti from 'canvas-confetti';

const WORD_LIST = [
  'ねこ', 'いぬ', 'りんご', 'くるま', 'ひこうき',
  'さかな', 'ひまわり', 'すいか', 'カメラ', 'とけい',
  'おにぎり', 'ハンバーガー', 'ピアノ', 'ロケット', 'サッカーボール',
  'ケーキ', 'メガネ', 'ゆきだるま', 'ちょうちょ', 'ペンギン',
  'きりん', 'ばなな', 'ぼうし', 'スマートフォン', '傘'
];

interface ChatMessage {
  sender: string;
  text: string;
  isCorrect?: boolean;
}

interface StrokeData {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
}

export const SketchGuessGame: Component = () => {
  const [mode, setMode] = createSignal<'menu' | 'p2p' | 'solo'>('menu');
  const [role, setRole] = createSignal<'host' | 'client'>('host');
  const [roomCode, setRoomCode] = createSignal('');
  const [inputCode, setInputCode] = createSignal('');
  const [connected, setConnected] = createSignal(false);
  const [p2pError, setP2pError] = createSignal('');

  // Game state
  const [isDrawer, setIsDrawer] = createSignal(true);
  const [currentWord, setCurrentWord] = createSignal('');
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [chatLog, setChatLog] = createSignal<ChatMessage[]>([]);
  const [myScore, setMyScore] = createSignal(0);
  const [oppScore, setOppScore] = createSignal(0);
  const [roundEnded, setRoundEnded] = createSignal(false);

  // Canvas drawing state
  let canvasRef!: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  const [currentColor, setCurrentColor] = createSignal('#f8fafc');
  const [brushSize, setBrushSize] = createSignal(4);
  const [guessInput, setGuessInput] = createSignal('');

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let timerId: number | null = null;
  let p2p: ZeroTrustP2P | null = null;

  const COLORS = ['#f8fafc', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#0f172a'];

  const getRandomWord = () => {
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  };

  const startRound = (drawer: boolean, word?: string) => {
    setIsDrawer(drawer);
    const targetWord = word || getRandomWord();
    setCurrentWord(targetWord);
    setTimeLeft(60);
    setRoundEnded(false);
    clearCanvas(false);

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endRound(false, '時間切れ！正解は「' + currentWord() + '」でした');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const endRound = (success: boolean, message: string) => {
    if (timerId) clearInterval(timerId);
    setRoundEnded(true);
    addChat({ sender: 'システム', text: message });

    if (success) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  const clearCanvas = (notify = true) => {
    if (!ctx || !canvasRef) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

    if (notify && p2p && mode() === 'p2p') {
      p2p.send({ type: 'clear' });
    }
  };

  const drawLine = (data: StrokeData, notify = false) => {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(data.x0, data.y0);
    ctx.lineTo(data.x1, data.y1);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (notify && p2p && mode() === 'p2p') {
      p2p.send({ type: 'stroke', stroke: data });
    }
  };

  const getCanvasCoords = (e: MouseEvent | Touch) => {
    const rect = canvasRef.getBoundingClientRect();
    const scaleX = canvasRef.width / rect.width;
    const scaleY = canvasRef.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: MouseEvent | TouchEvent) => {
    if (!isDrawer() || roundEnded()) return;
    isDrawing = true;
    const point = 'touches' in e ? e.touches[0] : e;
    const coords = getCanvasCoords(point);
    lastX = coords.x;
    lastY = coords.y;
  };

  const onPointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing || !isDrawer() || roundEnded()) return;
    const point = 'touches' in e ? e.touches[0] : e;
    const coords = getCanvasCoords(point);

    drawLine(
      {
        x0: lastX,
        y0: lastY,
        x1: coords.x,
        y1: coords.y,
        color: currentColor(),
        size: brushSize(),
      },
      true
    );

    lastX = coords.x;
    lastY = coords.y;
  };

  const onPointerUp = () => {
    isDrawing = false;
  };

  const addChat = (msg: ChatMessage) => {
    setChatLog((prev) => [...prev, msg]);
  };

  const submitGuess = () => {
    const guess = guessInput().trim();
    if (!guess) return;

    setGuessInput('');
    const isCorrect = guess.toLowerCase() === currentWord().toLowerCase();

    const msg: ChatMessage = {
      sender: 'あなた',
      text: guess,
      isCorrect,
    };
    addChat(msg);

    if (mode() === 'p2p' && p2p) {
      p2p.send({ type: 'guess', text: guess, isCorrect });
    }

    if (isCorrect) {
      setMyScore((s) => s + 10);
      endRound(true, `正解！「${currentWord()}」でした！(+10pt)`);
    }
  };

  const nextTurn = () => {
    if (mode() === 'p2p' && p2p) {
      const nextWord = getRandomWord();
      const nextIsDrawer = !isDrawer();
      p2p.send({ type: 'start_round', drawer: !nextIsDrawer, word: nextWord });
      startRound(nextIsDrawer, nextWord);
    } else {
      startRound(true);
    }
  };

  // P2P Handlers
  const setupHost = async () => {
    setP2pError('');
    p2p = new ZeroTrustP2P({
      onConnected: () => {
        setConnected(true);
        const w = getRandomWord();
        p2p?.send({ type: 'start_round', drawer: false, word: w });
        startRound(true, w);
      },
      onMessage: (data: unknown) => handleP2PData(data as any),
      onDisconnected: () => {
        setConnected(false);
      },
      onError: (err: string) => setP2pError(err),
    });

    const offer = await p2p.createHostOffer();
    setRoomCode(offer);
  };

  const joinClient = async () => {
    if (!inputCode().trim()) return;
    setP2pError('');
    p2p = new ZeroTrustP2P({
      onConnected: () => {
        setConnected(true);
      },
      onMessage: (data: unknown) => handleP2PData(data as any),
      onDisconnected: () => {
        setConnected(false);
      },
      onError: (err: string) => setP2pError(err),
    });

    const answer = await p2p.joinGuest(inputCode().trim());
    setRoomCode(answer);
  };

  const finalizeHost = async () => {
    if (!inputCode().trim() || !p2p) return;
    await p2p.completeHostConnection(inputCode().trim());
  };

  const handleP2PData = (data: any) => {
    if (data.type === 'stroke') {
      drawLine(data.stroke, false);
    } else if (data.type === 'clear') {
      clearCanvas(false);
    } else if (data.type === 'guess') {
      addChat({ sender: 'あいて', text: data.text, isCorrect: data.isCorrect });
      if (data.isCorrect) {
        setOppScore((s) => s + 10);
        endRound(true, `相手が正解しました！お題:「${currentWord()}」`);
      }
    } else if (data.type === 'start_round') {
      startRound(data.drawer, data.word);
    }
  };

  onSettled(() => {
    if (canvasRef) {
      ctx = canvasRef.getContext('2d');
      clearCanvas(false);
    }
  });

  onCleanup(() => {
    if (timerId) clearInterval(timerId);
    if (p2p) p2p.close();
  });

  return (
    <div class="flex flex-col items-center w-full max-w-4xl mx-auto p-4 select-none">
      <div class="text-center mb-4">
        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-400">
          Sketch Guess
        </h2>
        <p class="text-sm text-slate-400">
          描いた絵がリアルタイムに伝わる！お絵描き伝言・当てっこゲーム
        </p>
      </div>

      {/* Mode Selection */}
      <Show when={mode() === 'menu'}>
        <div class="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <button
            onClick={() => {
              setMode('solo');
              startRound(true);
            }}
            class="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
          >
            🎨 1人で描く練習
          </button>
          <button
            onClick={() => {
              setMode('p2p');
              setupHost();
            }}
            class="w-full py-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
          >
            🌐 リモート通信対戦（2人でお題当て）
          </button>
        </div>
      </Show>

      {/* P2P Lobby */}
      <Show when={mode() === 'p2p' && !connected()}>
        <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <div class="flex border-b border-slate-800 pb-2 gap-2">
            <button
              onClick={() => {
                setRole('host');
                setupHost();
              }}
              class={`flex-1 py-2 font-bold rounded-lg ${
                role() === 'host' ? 'bg-pink-600 text-white' : 'text-slate-400'
              }`}
            >
              ホスト（部屋作成）
            </button>
            <button
              onClick={() => {
                setRole('client');
                setRoomCode('');
              }}
              class={`flex-1 py-2 font-bold rounded-lg ${
                role() === 'client' ? 'bg-pink-600 text-white' : 'text-slate-400'
              }`}
            >
              参加（コード入力）
            </button>
          </div>

          <Show when={role() === 'host'}>
            <p class="text-xs text-slate-300">
              1. 以下の招待コードを相手に共有してください：
            </p>
            <div class="flex gap-2">
              <input
                type="text"
                readonly
                value={roomCode()}
                class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-pink-300 select-all"
              />
              <button
                onClick={() => navigator.clipboard.writeText(roomCode())}
                class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white"
              >
                コピー
              </button>
            </div>
            <p class="text-xs text-slate-300">
              2. 相手から返ってきた応答コードを貼り付けて接続：
            </p>
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="相手の応答コードを貼り付け"
                value={inputCode()}
                onInput={(e) => setInputCode(e.currentTarget.value)}
                class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-white"
              />
              <button
                onClick={finalizeHost}
                class="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-xs font-bold rounded-lg text-white"
              >
                接続
              </button>
            </div>
          </Show>

          <Show when={role() === 'client'}>
            <p class="text-xs text-slate-300">
              ホストの招待コードを貼り付けて参加してください：
            </p>
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="ホストの招待コード"
                value={inputCode()}
                onInput={(e) => setInputCode(e.currentTarget.value)}
                class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-white"
              />
              <button
                onClick={joinClient}
                class="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-xs font-bold rounded-lg text-white"
              >
                応答生成
              </button>
            </div>
            <Show when={roomCode()}>
              <p class="text-xs text-slate-300 mt-2">
                生成された応答コードをホストに送信してください：
              </p>
              <div class="flex gap-2">
                <input
                  type="text"
                  readonly
                  value={roomCode()}
                  class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-pink-300 select-all"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(roomCode())}
                  class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white"
                >
                  コピー
                </button>
              </div>
            </Show>
          </Show>

          <Show when={p2pError()}>
            <p class="text-xs text-red-400">{p2pError()}</p>
          </Show>

          <button
            onClick={() => setMode('menu')}
            class="text-xs text-slate-400 hover:text-slate-200 mt-2"
          >
            ← メニューに戻る
          </button>
        </div>
      </Show>

      {/* Main Game Screen */}
      <Show when={mode() === 'solo' || (mode() === 'p2p' && connected())}>
        <div class="w-full flex flex-col items-center gap-4">
          {/* Top Status Bar */}
          <div class="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-sm">
            <div class="flex items-center gap-4">
              <span class="font-bold text-amber-400">
                役割: {isDrawer() ? '🎨 描く人（出題）' : '👀 当てる人（回答）'}
              </span>
              <span class="text-xs font-mono text-slate-400">
                残り時間: <span class="text-white font-bold">{timeLeft()}</span> 秒
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-cyan-400 font-bold">あなた: {myScore()} pt</span>
              <Show when={mode() === 'p2p'}>
                <span class="text-xs text-rose-400 font-bold">相手: {oppScore()} pt</span>
              </Show>
            </div>
          </div>

          {/* Word Banner */}
          <div class="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
            <Show when={isDrawer()}>
              <span class="text-xs text-slate-400">あなたのお題: </span>
              <span class="text-xl font-black text-pink-400 ml-2 tracking-wide">
                {currentWord()}
              </span>
            </Show>
            <Show when={!isDrawer()}>
              <span class="text-sm text-slate-300">
                相手が描いているお題を当ててください！
              </span>
            </Show>
          </div>

          {/* Canvas & Chat Layout */}
          <div class="w-full max-w-3xl flex flex-col md:flex-row gap-4 items-start">
            {/* Drawing Area */}
            <div class="flex flex-col items-center w-full md:w-2/3">
              <div class="relative w-full border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-slate-950 touch-none">
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={360}
                  class="w-full aspect-[4/3] block cursor-crosshair"
                  onMouseDown={onPointerDown}
                  onMouseMove={onPointerMove}
                  onMouseUp={onPointerUp}
                  onTouchStart={onPointerDown}
                  onTouchMove={onPointerMove}
                  onTouchEnd={onPointerUp}
                />
              </div>

              {/* Drawer Controls */}
              <Show when={isDrawer()}>
                <div class="w-full flex items-center justify-between gap-2 mt-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
                  {/* Colors */}
                  <div class="flex gap-1">
                    <For each={COLORS}>
                      {(c) => (
                        <button
                          onClick={() => setCurrentColor(c)}
                          class={`w-6 h-6 rounded-full border ${
                            currentColor() === c ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ 'background-color': c }}
                        />
                      )}
                    </For>
                  </div>

                  {/* Brush Size */}
                  <div class="flex items-center gap-1">
                    <button
                      onClick={() => setBrushSize(3)}
                      class={`px-2 py-1 text-xs rounded ${brushSize() === 3 ? 'bg-pink-600 text-white' : 'text-slate-400'}`}
                    >
                      細
                    </button>
                    <button
                      onClick={() => setBrushSize(6)}
                      class={`px-2 py-1 text-xs rounded ${brushSize() === 6 ? 'bg-pink-600 text-white' : 'text-slate-400'}`}
                    >
                      中
                    </button>
                    <button
                      onClick={() => setBrushSize(12)}
                      class={`px-2 py-1 text-xs rounded ${brushSize() === 12 ? 'bg-pink-600 text-white' : 'text-slate-400'}`}
                    >
                      太
                    </button>
                  </div>

                  {/* Clear Button */}
                  <button
                    onClick={() => clearCanvas(true)}
                    class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded text-white"
                  >
                    全消し
                  </button>
                </div>
              </Show>
            </div>

            {/* Chat & Guessing Log */}
            <div class="w-full md:w-1/3 flex flex-col h-[380px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div class="p-2 border-b border-slate-800 text-xs font-bold text-slate-400">
                💬 回答・ログ
              </div>

              {/* Chat Message List */}
              <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-2 text-xs">
                <For each={chatLog()}>
                  {(msg) => (
                    <div
                      class={`p-2 rounded-lg ${
                        msg.isCorrect
                          ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-bold'
                          : msg.sender === 'システム'
                          ? 'bg-slate-800/80 text-amber-300 italic'
                          : 'bg-slate-950 text-slate-200'
                      }`}
                    >
                      <span class="font-bold opacity-75">{msg.sender}: </span>
                      <span>{msg.text}</span>
                    </div>
                  )}
                </For>
              </div>

              {/* Input for Guesser */}
              <div class="p-2 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder={isDrawer() ? '描く番です' : 'お題をひらがな等で入力...'}
                  disabled={isDrawer() || roundEnded()}
                  value={guessInput()}
                  onInput={(e) => setGuessInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitGuess();
                  }}
                  class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-pink-500 disabled:opacity-50"
                />
                <button
                  onClick={submitGuess}
                  disabled={isDrawer() || roundEnded()}
                  class="px-3 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg"
                >
                  送信
                </button>
              </div>
            </div>
          </div>

          {/* Round Complete Next Button */}
          <Show when={roundEnded()}>
            <div class="flex gap-4">
              <button
                onClick={nextTurn}
                class="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg active:scale-95"
              >
                次のラウンド（役割交代）
              </button>
            </div>
          </Show>

          <button
            onClick={() => {
              if (timerId) clearInterval(timerId);
              setMode('menu');
            }}
            class="text-xs text-slate-500 hover:text-slate-300 mt-4"
          >
            ← メニューに戻る
          </button>
        </div>
      </Show>
    </div>
  );
};
