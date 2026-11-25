import { Component, createSignal, onSettled, onCleanup, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { ZeroTrustP2P } from '../../utils/p2p.ts';
import confetti from 'canvas-confetti';

interface WireModule {
  wires: { color: 'red' | 'blue' | 'yellow' | 'white' | 'black'; cut: boolean; correct: boolean }[];
  solved: boolean;
}

interface ButtonModule {
  label: string;
  color: 'red' | 'blue' | 'yellow' | 'white';
  pressed: boolean;
  solved: boolean;
}

interface SymbolsModule {
  symbols: { char: string; order: number; pressed: boolean }[];
  solved: boolean;
}

export const BombDefusalGame: Component = () => {
  const [role, setRole] = createSignal<'defuser' | 'expert' | null>(null);
  const [p2pStatus, setP2pStatus] = createSignal<'idle' | 'host' | 'guest' | 'connected'>('idle');
  const [offerCode, setOfferCode] = createSignal('');
  const [answerCode, setAnswerCode] = createSignal('');
  const [inputCode, setInputCode] = createSignal('');

  const [timeLeft, setTimeLeft] = createSignal(180); // 3分
  const [strikes, setStrikes] = createSignal(0);
  const [isExploded, setIsExploded] = createSignal(false);
  const [isDefused, setIsDefused] = createSignal(false);

  // 爆弾モジュール状態
  const [wireMod, setWireMod] = createSignal<WireModule>({
    wires: [
      { color: 'red', cut: false, correct: false },
      { color: 'blue', cut: false, correct: false },
      { color: 'yellow', cut: false, correct: true },
      { color: 'white', cut: false, correct: false },
    ],
    solved: false,
  });

  const [btnMod, setBtnMod] = createSignal<ButtonModule>({
    label: 'ABORT',
    color: 'blue',
    pressed: false,
    solved: false,
  });

  const [symMod, setSymMod] = createSignal<SymbolsModule>({
    symbols: [
      { char: '★', order: 2, pressed: false },
      { char: 'Ψ', order: 1, pressed: false },
      { char: 'Ω', order: 4, pressed: false },
      { char: '¶', order: 3, pressed: false },
    ],
    solved: false,
  });

  let timerId: number | null = null;
  let p2p: ZeroTrustP2P | null = null;

  const instructions = [
    '【非対称・爆弾解除作戦】2人のプレイヤーがそれぞれ別の画面を見て協力するゲームです。',
    '【解除担当（Defuser）】爆弾のワイヤーやボタンを操作できますが、解除ルールは一切わかりません。',
    '【マニュアル担当（Expert）】解読手順マニュアルを持っていますが、爆弾の画面は見えません。',
    '通話やチャットで状況を言葉だけで伝え合い、制限時間3分以内に全3モジュールを解除しましょう！',
  ];

  const initP2P = () => {
    if (p2p) p2p.close();
    p2p = new ZeroTrustP2P({
      onConnected: () => {
        sound.playVictory();
        setP2pStatus('connected');
        startTimer();
      },
      onMessage: (data: unknown) => {
        handleP2PMessage(data);
      },
      onDisconnected: () => {
        setP2pStatus('idle');
      },
      onError: (err) => {
        console.error(err);
      },
    });
  };

  const handleP2PMessage = (data: unknown) => {
    const msg = data as { type: string; payload?: unknown };
    if (!msg || !msg.type) return;

    if (msg.type === 'sync_state') {
      const p = msg.payload as {
        timeLeft: number;
        strikes: number;
        wireMod: WireModule;
        btnMod: ButtonModule;
        symMod: SymbolsModule;
        isDefused: boolean;
        isExploded: boolean;
      };
      setTimeLeft(p.timeLeft);
      setStrikes(p.strikes);
      setWireMod(p.wireMod);
      setBtnMod(p.btnMod);
      setSymMod(p.symMod);
      if (p.isDefused && !isDefused()) {
        sound.playVictory();
        setIsDefused(true);
        confetti({ particleCount: 50, spread: 80 });
      }
      if (p.isExploded && !isExploded()) {
        sound.playGameOver();
        setIsExploded(true);
      }
    }
  };

  const broadcastState = () => {
    if (p2p && p2pStatus() === 'connected') {
      p2p.send({
        type: 'sync_state',
        payload: {
          timeLeft: timeLeft(),
          strikes: strikes(),
          wireMod: wireMod(),
          btnMod: btnMod(),
          symMod: symMod(),
          isDefused: isDefused(),
          isExploded: isExploded(),
        },
      });
    }
  };

  const createHost = async () => {
    initP2P();
    setP2pStatus('host');
    setRole('defuser');
    try {
      const offer = await p2p!.createHostOffer();
      setOfferCode(offer);
    } catch {}
  };

  const joinGuest = async () => {
    initP2P();
    setP2pStatus('guest');
    setRole('expert');
    try {
      const answer = await p2p!.joinGuest(inputCode().trim());
      setAnswerCode(answer);
    } catch {}
  };

  const completeConnection = async () => {
    try {
      await p2p!.completeHostConnection(inputCode().trim());
      setP2pStatus('connected');
      startTimer();
    } catch {}
  };

  const startSolo = (chosenRole: 'defuser' | 'expert') => {
    setRole(chosenRole);
    startTimer();
  };

  const startTimer = () => {
    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerId!);
          explodeBomb();
          return 0;
        }
        return t - 1;
      });
      broadcastState();
    }, 1000);
  };

  const addStrike = () => {
    sound.playPop(220);
    const nextS = strikes() + 1;
    setStrikes(nextS);
    if (nextS >= 3) {
      explodeBomb();
    }
    broadcastState();
  };

  const explodeBomb = () => {
    sound.playGameOver();
    setIsExploded(true);
    if (timerId) clearInterval(timerId);
    broadcastState();
  };

  const checkAllDefused = () => {
    if (wireMod().solved && btnMod().solved && symMod().solved) {
      sound.playVictory();
      setIsDefused(true);
      if (timerId) clearInterval(timerId);
      confetti({ particleCount: 60, spread: 80 });
      broadcastState();
    }
  };

  // ワイヤー切断
  const cutWire = (idx: number) => {
    if (isExploded() || isDefused() || wireMod().solved) return;
    const current = { ...wireMod(), wires: wireMod().wires.map((w, i) => (i === idx ? { ...w, cut: true } : w)) };
    sound.playPop(520);

    if (current.wires[idx].correct) {
      current.solved = true;
      sound.playMatch(5);
    } else {
      addStrike();
    }
    setWireMod(current);
    checkAllDefused();
    broadcastState();
  };

  // ビッグボタン長押し/プッシュ
  const pressButton = () => {
    if (isExploded() || isDefused() || btnMod().solved) return;
    sound.playPop(620);
    const current = { ...btnMod(), pressed: true, solved: true };
    setBtnMod(current);
    checkAllDefused();
    broadcastState();
  };

  // 記号シーケンス入力
  const pressSymbol = (char: string) => {
    if (isExploded() || isDefused() || symMod().solved) return;
    sound.playPop(480);
    const syms = symMod().symbols.map((s) => (s.char === char ? { ...s, pressed: true } : s));

    // 正しい順番かチェック
    const pressedCount = syms.filter((s) => s.pressed).length;
    const target = syms.find((s) => s.char === char)!;

    if (target.order === pressedCount) {
      if (pressedCount === 4) {
        setSymMod({ symbols: syms, solved: true });
        sound.playMatch(6);
        checkAllDefused();
      } else {
        setSymMod({ ...symMod(), symbols: syms });
      }
    } else {
      // 順番間違い
      addStrike();
      setSymMod({
        symbols: symMod().symbols.map((s) => ({ ...s, pressed: false })),
        solved: false,
      });
    }
    broadcastState();
  };

  onSettled(() => {
    onCleanup(() => {
      if (timerId) clearInterval(timerId);
      if (p2p) p2p.close();
    });
  });

  return (
    <GameShell
      id="bomb-defusal"
      title="Bomb Defusal Protocol"
      score={timeLeft()}
      isGameOver={isExploded()}
      isVictory={isDefused()}
      onRestart={() => {
        setTimeLeft(180);
        setStrikes(0);
        setIsExploded(false);
        setIsDefused(false);
        setRole(null);
      }}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-2 font-mono">
            <span class="text-rose-500 font-bold">STRIKES: {'❌'.repeat(strikes())} ({strikes()}/3)</span>
          </div>

          <div class="flex items-center gap-2 font-mono">
            <span>⏱️ <strong class="text-amber-500 text-sm font-bold">{Math.floor(timeLeft() / 60)}:{(timeLeft() % 60).toString().padStart(2, '0')}</strong></span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-2xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-2 gap-3">
        {/* ロール選択 / P2P接続画面 */}
        <Show when={!role()}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl flex flex-col items-center max-w-md text-center">
            <span class="text-4xl mb-2">💣</span>
            <h2 class="text-lg font-black text-slate-900 dark:text-white mb-1">
              爆弾解除プロトコル
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">
              2人で異なる画面を見て、会話だけで解除を目指す非対称協力ゲーム
            </p>

            <div class="grid grid-cols-2 gap-3 w-full mb-4">
              <button
                onClick={createHost}
                class="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex flex-col items-center gap-1.5"
              >
                <span class="text-xl">🛠️</span>
                <span>解除担当 (ホスト)</span>
                <span class="text-[10px] opacity-80">爆弾画面を操作</span>
              </button>

              <button
                onClick={() => setP2pStatus('guest')}
                class="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex flex-col items-center gap-1.5"
              >
                <span class="text-xl">📖</span>
                <span>マニュアル担当</span>
                <span class="text-[10px] opacity-80">解読書を読んで指示</span>
              </button>
            </div>

            <div class="flex items-center gap-2 text-xs text-slate-400 my-1">
              <span>または</span>
            </div>

            <div class="flex gap-2 w-full mt-2">
              <button
                onClick={() => startSolo('defuser')}
                class="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                練習（解除画面）
              </button>
              <button
                onClick={() => startSolo('expert')}
                class="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                練習（マニュアル）
              </button>
            </div>
          </div>
        </Show>

        {/* P2P ホスト待機 */}
        <Show when={p2pStatus() === 'host' && role() === 'defuser'}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl max-w-md text-center text-xs">
            <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
              1. 招待コードを相手に共有してください
            </h3>
            <textarea
              readonly
              aria-label="ホスト招待コード"
              value={offerCode()}
              class="w-full h-20 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-mono break-all mb-2"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(offerCode());
                sound.playPop(520);
              }}
              class="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl mb-4"
            >
              コードをコピー
            </button>

            <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
              2. 相手からの応答コードを貼り付け
            </h3>
            <input
              type="text"
              placeholder="相手から届いた応答コードを貼り付け..."
              aria-label="相手から届いた応答コード入力"
              value={inputCode()}
              onInput={(e) => setInputCode(e.currentTarget.value)}
              class="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs mb-2"
            />
            <button
              onClick={completeConnection}
              class="w-full py-2 bg-emerald-600 text-white font-bold rounded-xl"
            >
              接続してゲーム開始！
            </button>
          </div>
        </Show>

        {/* P2P ゲスト入力 */}
        <Show when={p2pStatus() === 'guest' && !answerCode()}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl max-w-md text-center text-xs">
            <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
              ホストの招待コードを貼り付けてください
            </h3>
            <textarea
              placeholder="招待コードを貼り付け..."
              aria-label="ホストの招待コード貼り付け"
              value={inputCode()}
              onInput={(e) => setInputCode(e.currentTarget.value)}
              class="w-full h-24 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-mono break-all mb-3"
            />
            <button
              onClick={joinGuest}
              class="w-full py-2 bg-emerald-600 text-white font-bold rounded-xl"
            >
              応答コードを生成する
            </button>
          </div>
        </Show>

        <Show when={p2pStatus() === 'guest' && answerCode()}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl max-w-md text-center text-xs">
            <h3 class="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
              この応答コードをホストに送ってください
            </h3>
            <textarea
              readonly
              aria-label="生成された応答コード"
              value={answerCode()}
              class="w-full h-24 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-[10px] font-mono break-all mb-3"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(answerCode());
                sound.playPop(520);
              }}
              class="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl"
            >
              応答コードをコピー
            </button>
          </div>
        </Show>

        {/* 【解除担当画面】 */}
        <Show when={role() === 'defuser' && (p2pStatus() === 'connected' || p2pStatus() === 'idle')}>
          <div class="w-full bg-slate-900 border-4 border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
              <span class="text-rose-500 font-mono font-black text-sm">BOMB SERIAL: #BLOSSOM-404</span>
              <span class="text-slate-400">役職: 解除オペレーター</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* モジュール1: 4本ワイヤー */}
              <div class="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex flex-col items-center">
                <span class="text-[11px] font-bold text-slate-400 mb-2">
                  モジュール1: {wireMod().solved ? '✅ 解除済' : 'ワイヤー'}
                </span>
                <div class="flex flex-col gap-2 w-full px-2">
                  <For each={wireMod().wires}>
                    {(w, idx) => (
                      <button
                        onClick={() => cutWire(idx())}
                        disabled={w.cut || wireMod().solved}
                        class={`h-5 w-full rounded-md border flex items-center justify-center text-[10px] font-bold transition-all ${
                          w.cut
                            ? 'opacity-30 border-dashed line-through text-slate-500'
                            : w.color === 'red'
                            ? 'bg-rose-600 text-white border-rose-500 hover:brightness-110 active:scale-98'
                            : w.color === 'blue'
                            ? 'bg-sky-600 text-white border-sky-500 hover:brightness-110 active:scale-98'
                            : w.color === 'yellow'
                            ? 'bg-amber-400 text-slate-950 border-amber-300 hover:brightness-110 active:scale-98'
                            : 'bg-white text-slate-900 border-slate-200'
                        }`}
                      >
                        {w.cut ? '✂️ 切断済' : `${w.color.toUpperCase()}`}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* モジュール2: ビッグボタン */}
              <div class="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex flex-col items-center justify-between">
                <span class="text-[11px] font-bold text-slate-400 mb-2">
                  モジュール2: {btnMod().solved ? '✅ 解除済' : '起爆スイッチ'}
                </span>
                <button
                  onClick={pressButton}
                  disabled={btnMod().solved}
                  class={`w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-sm shadow-xl transition-all active:scale-95 ${
                    btnMod().solved
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-sky-600 border-sky-400 hover:bg-sky-500 text-white'
                  }`}
                >
                  {btnMod().solved ? 'OK' : btnMod().label}
                </button>
                <span class="text-[10px] text-slate-500 mt-2">青色 / ABORT</span>
              </div>

              {/* モジュール3: 記号シーケンス */}
              <div class="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex flex-col items-center">
                <span class="text-[11px] font-bold text-slate-400 mb-2">
                  モジュール3: {symMod().solved ? '✅ 解除済' : '古代記号'}
                </span>
                <div class="grid grid-cols-2 gap-2 w-full">
                  <For each={symMod().symbols}>
                    {(s) => (
                      <button
                        onClick={() => pressSymbol(s.char)}
                        disabled={s.pressed || symMod().solved}
                        class={`h-10 rounded-xl border text-base font-bold flex items-center justify-center transition-all ${
                          s.pressed
                            ? 'bg-emerald-600 border-emerald-400 text-white opacity-80'
                            : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 active:scale-95'
                        }`}
                      >
                        {s.char}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* 【マニュアル担当画面】 */}
        <Show when={role() === 'expert'}>
          <div class="w-full bg-amber-50 dark:bg-slate-900 border-4 border-amber-300 dark:border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col gap-3 text-slate-800 dark:text-slate-100 text-xs overflow-y-auto max-h-[calc(100dvh-170px)]">
            <div class="border-b border-amber-200 dark:border-slate-700 pb-2 flex items-center justify-between">
              <span class="font-black text-amber-900 dark:text-amber-300 text-sm">
                📖 極秘 爆弾解体オペレーションマニュアル
              </span>
              <span class="text-[10px] text-slate-500">役職: 指示エキスパート</span>
            </div>

            {/* ワイヤーマニュアル */}
            <div class="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-slate-700">
              <h4 class="font-bold text-xs text-rose-500 mb-1">■ 1. ワイヤーモジュールの解体手順</h4>
              <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                ワイヤーが4本存在する場合、以下のルールを上から順に確認してください：<br />
                ① 赤いワイヤーが2本以上あり、かつシリアル末尾が偶数の場合 ➔ 最後の赤いワイヤーを切断<br />
                ② 最後のワイヤーが黄色で、赤いワイヤーが0本の場合 ➔ 1本目のワイヤーを切断<br />
                ③ <strong>青いワイヤーがちょうど1本ある場合 ➔ 3本目のワイヤーを切断</strong><br />
                ④ 上記のいずれにも該当しない場合 ➔ 2本目のワイヤーを切断
              </p>
            </div>

            {/* ボタンマニュアル */}
            <div class="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-slate-700">
              <h4 class="font-bold text-xs text-sky-500 mb-1">■ 2. ビッグボタンモジュールの解体手順</h4>
              <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                ① ボタンが青色で、ラベルが「ABORT」の場合 ➔ <strong>即座にボタンを1回プッシュして離す</strong><br />
                ② ボタンが赤色で、ラベルが「HOLD」の場合 ➔ ボタンを長押しして離す<br />
                ③ バッテリーが2個以上あり、ラベルが「DETONATE」の場合 ➔ ボタンを即座にプッシュ
              </p>
            </div>

            {/* 記号マニュアル */}
            <div class="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-slate-700">
              <h4 class="font-bold text-xs text-emerald-500 mb-1">■ 3. 古代記号モジュールの解体手順</h4>
              <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                表示されている4つの記号を、以下の<strong>指定順序の通りに左から順に押下</strong>させてください：<br />
                <span class="font-black text-sm text-indigo-600 dark:text-indigo-400">
                  1番目: [ Ψ ] ➔ 2番目: [ ★ ] ➔ 3番目: [ ¶ ] ➔ 4番目: [ Ω ]
                </span><br />
                ※順番を1つでも間違えるとストライクが1つ加算されます。
              </p>
            </div>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
