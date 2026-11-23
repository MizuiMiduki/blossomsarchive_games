import { Component, createSignal, onSettled, For, Show, onCleanup } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { runLocalAI } from '../../utils/local-ai.ts';
import confetti from 'canvas-confetti';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  detailContent?: string;
}

interface RoomTheme {
  id: string;
  name: string;
  wallColor: string;
  floorColor: string;
  paintingFrame: string;
  paintingInner: string;
  doorColor: string;
  deskColor: string;
  story: string;
}

const ROOM_THEMES: RoomTheme[] = [
  {
    id: 'victorian',
    name: '洋館の隠し書斎',
    wallColor: '#1e293b',
    floorColor: '#0f172a',
    paintingFrame: '#b45309',
    paintingInner: '#0284c7',
    doorColor: '#334155',
    deskColor: '#78350f',
    story: 'アンティーク調の落ち着いた書斎。重厚な扉に鍵がかかっている。',
  },
  {
    id: 'laboratory',
    name: '秘密の研究室',
    wallColor: '#0f172a',
    floorColor: '#1e1b4b',
    paintingFrame: '#0284c7',
    paintingInner: '#06b6d4',
    doorColor: '#475569',
    deskColor: '#334155',
    story: '怪しげな実験器具が置かれた部屋。電子ロックの金庫が鈍く光る。',
  },
  {
    id: 'observatory',
    name: '星読みの天文台',
    wallColor: '#172554',
    floorColor: '#0f172a',
    paintingFrame: '#eab308',
    paintingInner: '#3b82f6',
    doorColor: '#1e293b',
    deskColor: '#1e3a5f',
    story: '夜空と天体を観測するための部屋。星々の手がかりが隠されている。',
  },
  {
    id: 'teahouse',
    name: '和風の秘密部屋',
    wallColor: '#292524',
    floorColor: '#1c1917',
    paintingFrame: '#78350f',
    paintingInner: '#15803d',
    doorColor: '#44403c',
    deskColor: '#57534e',
    story: '木と畳の香りが漂う和室。仕掛けが施された机と金庫がある。',
  },
];

export const RoomEscapeGame: Component = () => {
  // 部屋の進行ステート
  const [theme, setTheme] = createSignal<RoomTheme>(ROOM_THEMES[0]);
  const [targetCode, setTargetCode] = createSignal('7492');
  const [memoHintText, setMemoHintText] = createSignal('「金庫の暗号は時計の針が指す時刻：7492」');
  const [isGenerating, setIsGenerating] = createSignal(false);

  const [deskDrawerOpened, setDeskDrawerOpened] = createSignal(false);
  const [paintingTilted, setPaintingTilted] = createSignal(false);
  const [safeOpened, setSafeOpened] = createSignal(false);
  const [doorUnlocked, setDoorUnlocked] = createSignal(false);
  const [isEscaped, setIsEscaped] = createSignal(false);

  // 金庫のダイヤル入力
  const [safeCode, setSafeCode] = createSignal(['0', '0', '0', '0']);
  const [showSafeModal, setShowSafeModal] = createSignal(false);

  // メモ閲覧モーダル（文字見切れ防止・全文ビューワー）
  const [viewingMemo, setViewingMemo] = createSignal<InventoryItem | null>(null);

  // メッセージ案内
  const [message, setMessage] = createSignal('部屋を調べて脱出の手がかりを探そう。');

  // インベントリ
  const [inventory, setInventory] = createSignal<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = createSignal<string | null>(null);

  // タイマー & スコア
  const [startTime, setStartTime] = createSignal(Date.now());
  const [elapsedSec, setElapsedSec] = createSignal(0);
  let timerId: number | null = null;

  // ランダム4桁コード生成
  const generateRandomCode = () => {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  };

  // ローカルAIを活用した新ステージ自動生成
  const generateNewStage = async () => {
    setIsGenerating(true);
    sound.playPop(520);

    const randomTheme = ROOM_THEMES[Math.floor(Math.random() * ROOM_THEMES.length)];
    setTheme(randomTheme);

    const newCode = generateRandomCode();
    setTargetCode(newCode);

    // ローカルAIに部屋の謎解きメモを生成してもらう
    const sysPrompt = `あなたは脱出ゲームの謎解き設計者です。
テーマ: 「${randomTheme.name}」
金庫の正解暗証番号: 「${newCode}」（4桁の数字）
プレイヤーが見つける「謎のメモ」に書かれている謎解きヒント文章を日本語で作成してください。
形式: プレイヤーが読めば「${newCode}」が導き出せる、少し詩的で知的なメモ（例: 計算、時刻、星座、四季、数え歌など）。
回答フォーマット: メモの文章のみを簡潔に出力してください。`;

    const generatedHint = await runLocalAI(
      sysPrompt,
      `金庫の正解コード: ${newCode}`,
      () => {
        // フォールバック: バリエーション豊かなプロシージャル生成
        const c1 = parseInt(newCode[0], 10);
        const c2 = parseInt(newCode[1], 10);
        const c3 = parseInt(newCode[2], 10);
        const c4 = parseInt(newCode[3], 10);

        const patterns = [
          `【古びた時計のメモ】\n「長針と短針が交差する時刻。\n扉を開く数字の鍵は：${newCode}」`,
          `【研究者の計算メモ】\n「第1の数: ${c1}\n第2の数: ${c2}\n第3の数: ${c3}\n第4の数: ${c4}\n4つの数字を並べよ。」`,
          `【星図の断片】\n「北天の星座が指し示す4つの星。\nその座標は【${newCode}】である。」`,
          `【隠された手記】\n「机の主が遺した暗号コード：\n『${newCode}』を金庫に入力せよ。」`,
        ];
        return patterns[Math.floor(Math.random() * patterns.length)];
      }
    );

    setMemoHintText(generatedHint.trim());

    // ステートのリセット
    setDeskDrawerOpened(false);
    setPaintingTilted(false);
    setSafeOpened(false);
    setDoorUnlocked(false);
    setIsEscaped(false);
    setSafeCode(['0', '0', '0', '0']);
    setShowSafeModal(false);
    setViewingMemo(null);
    setInventory([]);
    setSelectedItemId(null);
    setMessage(`【${randomTheme.name}】に閉じ込められた！部屋の手がかりを探そう。`);
    setStartTime(Date.now());
    setElapsedSec(0);
    setIsGenerating(false);
  };

  const hasItem = (id: string) => inventory().some((item) => item.id === id);

  const addItem = (item: InventoryItem) => {
    sound.playMatch(4);
    setInventory((inv) => [...inv, item]);
    setMessage(`【${item.name}】を手に入れた！（持ち物欄をタップで詳しく調べられます）`);
  };

  const removeItem = (id: string) => {
    setInventory((inv) => inv.filter((item) => item.id !== id));
    if (selectedItemId() === id) setSelectedItemId(null);
  };

  // 1. 絵画のクリック
  const handlePaintingClick = () => {
    sound.playPop(480);
    if (!paintingTilted()) {
      setPaintingTilted(true);
      setMessage('絵画を傾けたら、裏から【謎のメモ】がハラリと落ちてきた！');
      if (!hasItem('memo')) {
        const item: InventoryItem = {
          id: 'memo',
          name: '謎のメモ',
          description: '裏にびっしりと暗号が書かれた紙切れ。',
          icon: '📄',
          detailContent: memoHintText(),
        };
        addItem(item);
        // メモを即座に開いて確認しやすくする
        setViewingMemo(item);
      }
    } else {
      setMessage('傾いた額縁。裏側にはもう何もないようだ。');
    }
  };

  // 2. 机の引き出しのクリック
  const handleDeskClick = () => {
    sound.playPop(420);
    if (!deskDrawerOpened()) {
      if (selectedItemId() === 'small_key') {
        sound.playMatch(5);
        removeItem('small_key');
        setDeskDrawerOpened(true);
        setMessage('カチャリ！小さな鍵で引き出しが開いた！中にドライバーが入っている。');
        addItem({
          id: 'screwdriver',
          name: 'マイナスドライバー',
          description: 'ネジを外すことができる頑丈な工具。',
          icon: '🪛',
        });
      } else {
        setMessage('机の引き出しには頑丈な鍵がかかっている。「小さな鍵」が必要なようだ。');
      }
    } else {
      setMessage('開いた引き出し。中は空っぽだ。');
    }
  };

  // 3. 植木のクリック (小さな鍵の発見)
  const handlePlantClick = () => {
    sound.playPop(450);
    if (!hasItem('small_key') && !deskDrawerOpened()) {
      addItem({
        id: 'small_key',
        name: '小さな鍵',
        description: '机の引き出しに使えそうな真鍮製の鍵。',
        icon: '🗝️',
      });
      setMessage('観葉植物の土の奥から【小さな鍵】を発見した！');
    } else {
      setMessage('青々とした観葉植物。特に変わったところはない。');
    }
  };

  // 4. 金庫のクリック
  const handleSafeClick = () => {
    sound.playPop(500);
    if (safeOpened()) {
      setMessage('金庫はすでに解錠されている。中は空だ。');
      return;
    }
    setShowSafeModal(true);
  };

  // 金庫のダイヤル番号変更
  const rotateDigit = (index: number) => {
    sound.playPop(520);
    const next = [...safeCode()];
    const current = parseInt(next[index], 10);
    next[index] = String((current + 1) % 10);
    setSafeCode(next);

    // 正解判定
    if (next.join('') === targetCode()) {
      sound.playVictory();
      setSafeOpened(true);
      setShowSafeModal(false);
      addItem({
        id: 'door_key',
        name: '銀のマスターキー',
        description: '部屋の扉を開けることができる重厚なマスターキー。',
        icon: '🔑',
      });
      setMessage('ガチャン！金庫が開いた！【銀のマスターキー】を手に入れた！');
    }
  };

  // 5. 扉のクリック
  const handleDoorClick = () => {
    if (isEscaped()) return;

    if (doorUnlocked()) {
      sound.playVictory();
      setIsEscaped(true);
      setMessage('扉を開けて部屋から脱出した！見事クリア！');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      return;
    }

    if (selectedItemId() === 'door_key') {
      sound.playVictory();
      removeItem('door_key');
      setDoorUnlocked(true);
      setMessage('カチリ！マスターキーで鍵が開いた！クリックして外へ脱出しよう！');
    } else {
      sound.playPop(350);
      setMessage('施錠された頑丈な扉。「マスターキー」があれば開けられそうだ。');
    }
  };

  const score = () => {
    if (!isEscaped()) return 0;
    return Math.max(500, 5000 - elapsedSec() * 20);
  };

  onSettled(() => {
    generateNewStage();
    timerId = window.setInterval(() => {
      if (!isEscaped()) {
        setElapsedSec(Math.floor((Date.now() - startTime()) / 1000));
      }
    }, 1000);
  });

  onCleanup(() => {
    if (timerId) clearInterval(timerId);
  });

  const instructions = [
    '【AI自動生成 脱出ゲーム】部屋のテーマや謎解き暗号が毎回自動生成される1ルーム脱出パズルです。',
    '怪しい場所（絵画、植木、机、金庫、扉）をクリックして調査・アイテム収集！',
    'アイテム欄の【謎のメモ】をタップすると、メモの暗号全文を大きく開いて読むことができます。',
    '手に入れたアイテムを選択して使い、金庫の暗号を解き明かして部屋から脱出しましょう！',
  ];

  return (
    <GameShell
      id="room-escape"
      title="Room Escape (AI脱出ゲーム)"
      score={score()}
      isGameOver={false}
      isVictory={isEscaped()}
      onRestart={generateNewStage}
      onNextStage={generateNewStage}
      nextStageLabel="次の部屋を自動生成して挑戦 →"
      victoryTitle="脱出大成功！"
      victoryMessage={`${elapsedSec()}秒で見事に部屋の謎を解き明かして脱出しました！`}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-xl px-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-bold">テーマ:</span>
            <span class="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[11px]">
              {theme().name}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <button
              onClick={generateNewStage}
              disabled={isGenerating()}
              class="px-2.5 py-1 rounded-lg border border-indigo-400/40 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isGenerating() ? '⏳ 生成中...' : '🔄 新しい部屋を生成'}</span>
            </button>
            <div class="font-mono text-slate-300">
              ⏱️ <span class="font-bold text-white">{elapsedSec()}</span> 秒
            </div>
          </div>
        </div>
      }
    >
      <div class="flex flex-col items-center justify-between gap-2 w-full max-w-2xl h-full select-none p-1 sm:p-2">
        {/* メッセージ案内バー (見切れ防止・複数行折り返し) */}
        <div class="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2 shadow-md flex items-center gap-2">
          <span class="text-base shrink-0">💡</span>
          <div class="text-xs text-slate-200 font-medium leading-relaxed break-words whitespace-pre-wrap flex-1">
            {message()}
          </div>
        </div>

        {/* 部屋のビジュアル (SVGルームイラスト) */}
        <div class="w-full aspect-[4/3] max-h-[calc(100dvh-200px)] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative bg-slate-950">
          <svg viewBox="0 0 480 360" class="w-full h-full block">
            {/* 部屋の壁・床 */}
            <polygon points="0,0 480,0 480,270 0,270" fill={theme().wallColor} />
            <polygon points="0,270 480,270 480,360 0,360" fill={theme().floorColor} />
            <line x1="0" y1="270" x2="480" y2="270" stroke="#475569" stroke-width="3" />

            {/* 1. 脱出扉 */}
            <g onClick={handleDoorClick} class="cursor-pointer group">
              <rect
                x="200"
                y="50"
                width="80"
                height="220"
                fill={doorUnlocked() ? '#38bdf8' : theme().doorColor}
                stroke="#64748b"
                stroke-width="3"
                rx="4"
              />
              <circle
                cx="215"
                cy="165"
                r="5"
                fill={doorUnlocked() ? '#fbbf24' : '#94a3b8'}
              />
              <text x="240" y="40" fill="#cbd5e1" font-size="11" text-anchor="middle" font-weight="bold">
                {doorUnlocked() ? 'EXIT (クリックで脱出！)' : 'DOOR'}
              </text>
            </g>

            {/* 2. 壁の絵画 */}
            <g
              onClick={handlePaintingClick}
              class="cursor-pointer"
              transform={paintingTilted() ? 'rotate(14, 95, 90)' : ''}
              style="transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);"
            >
              <rect x="60" y="60" width="70" height="55" fill={theme().paintingFrame} stroke="#451a03" stroke-width="4" rx="3" />
              <rect x="68" y="68" width="54" height="39" fill={theme().paintingInner} />
              <circle cx="85" cy="85" r="10" fill="#fde047" />
              <polygon points="80,105 110,80 120,105" fill="#047857" />
              <text x="95" y="52" fill="#cbd5e1" font-size="9" text-anchor="middle">絵画</text>
            </g>

            {/* 3. 机 & 引き出し */}
            <g onClick={handleDeskClick} class="cursor-pointer">
              <rect x="330" y="160" width="110" height="90" fill={theme().deskColor} stroke="#1e293b" stroke-width="3" rx="3" />
              {/* 引き出し */}
              <rect
                x="345"
                y="180"
                width="80"
                height="32"
                fill={deskDrawerOpened() ? '#1e293b' : '#334155'}
                stroke="#0f172a"
                stroke-width="2"
                rx="2"
              />
              <circle cx="385" cy="196" r="4" fill="#fbbf24" />
              <text x="385" y="152" fill="#cbd5e1" font-size="9" text-anchor="middle">机</text>
            </g>

            {/* 4. 金庫 (机の下) */}
            <g onClick={handleSafeClick} class="cursor-pointer">
              <rect
                x="345"
                y="220"
                width="80"
                height="45"
                fill={safeOpened() ? '#334155' : '#020617'}
                stroke="#64748b"
                stroke-width="2"
                rx="3"
              />
              <circle cx="385" cy="242" r="8" fill="#475569" stroke="#94a3b8" />
              <text x="385" y="245" fill="#f8fafc" font-size="7" text-anchor="middle">SAFE</text>
            </g>

            {/* 5. 観葉植物 */}
            <g onClick={handlePlantClick} class="cursor-pointer">
              <polygon points="65,230 95,230 90,265 70,265" fill="#ea580c" stroke="#9a3412" stroke-width="2" />
              <ellipse cx="80" cy="210" rx="20" ry="14" fill="#16a34a" />
              <ellipse cx="65" cy="215" rx="15" ry="10" fill="#22c55e" />
              <ellipse cx="95" cy="215" rx="15" ry="10" fill="#22c55e" />
              <text x="80" y="200" fill="#cbd5e1" font-size="9" text-anchor="middle">観葉植物</text>
            </g>
          </svg>
        </div>

        {/* 持ち物 (インベントリバー) */}
        <div class="w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-2 text-xs shadow-md">
          <div class="flex items-center justify-between mb-1.5 px-1">
            <span class="font-bold text-slate-300 text-[11px]">持ち物（タップで選択・詳細確認）:</span>
            <span class="text-slate-500 text-[10px]">{inventory().length} 個所持</span>
          </div>

          <div class="flex items-center gap-2 min-h-[46px] overflow-x-auto no-scrollbar">
            <For each={inventory()}>
              {(item) => {
                const isSelected = () => selectedItemId() === item.id;
                return (
                  <button
                    onClick={() => {
                      sound.playPop(400);
                      setSelectedItemId((prev) => (prev === item.id ? null : item.id));
                      setMessage(`【${item.name}】${item.description}`);
                      // メモなどの詳細コンテンツがある場合はビューワーを開く
                      if (item.detailContent) {
                        setViewingMemo(item);
                      }
                    }}
                    class={`px-3 py-2 rounded-xl flex items-center gap-1.5 border transition-all text-xs whitespace-nowrap cursor-pointer active:scale-95 ${
                      isSelected()
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80'
                    }`}
                  >
                    <span class="text-base">{item.icon}</span>
                    <span class="font-semibold">{item.name}</span>
                    <Show when={item.detailContent}>
                      <span class="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full ml-1">
                        読む
                      </span>
                    </Show>
                  </button>
                );
              }}
            </For>
            <Show when={inventory().length === 0}>
              <span class="text-slate-500 text-[11px] px-2 italic">アイテムを持っていません</span>
            </Show>
          </div>
        </div>

        {/* メモ詳細ビューワーモーダル (文字見切れゼロ) */}
        <Show when={viewingMemo()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div class="bg-amber-50 dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-800/80 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-slate-800 dark:text-slate-100 flex flex-col gap-4 animate-in zoom-in-95">
              <div class="flex items-center justify-between border-b border-amber-200 dark:border-slate-800 pb-2">
                <div class="flex items-center gap-2 font-bold text-sm">
                  <span class="text-xl">{viewingMemo()?.icon}</span>
                  <span>{viewingMemo()?.name}</span>
                </div>
                <button
                  onClick={() => setViewingMemo(null)}
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer px-2"
                >
                  ✕
                </button>
              </div>

              {/* メモの本文内容 */}
              <div class="p-4 bg-white/80 dark:bg-slate-950/80 rounded-2xl border border-amber-200 dark:border-slate-800 shadow-inner font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-900 dark:text-amber-100">
                {viewingMemo()?.detailContent}
              </div>

              <p class="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                金庫のダイヤルと照らし合わせて暗号を推理しましょう。
              </p>

              <button
                onClick={() => setViewingMemo(null)}
                class="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </Show>

        {/* 金庫ダイヤル入力モーダル */}
        <Show when={showSafeModal()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
              <div class="text-3xl mb-2">🔐</div>
              <h3 class="text-base font-black text-slate-900 dark:text-white mb-1">
                金庫の暗証番号
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">
                4桁のダイヤルをクリックして合わせてください。
              </p>

              {/* 4つのダイヤル */}
              <div class="flex justify-center gap-2 mb-6">
                <For each={safeCode()}>
                  {(digit, idx) => (
                    <button
                      onClick={() => rotateDigit(idx())}
                      class="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 font-mono font-black text-2xl text-slate-900 dark:text-white hover:border-amber-500 active:scale-95 transition-all shadow-inner cursor-pointer"
                    >
                      {digit}
                    </button>
                  )}
                </For>
              </div>

              <div class="flex gap-2">
                <Show when={hasItem('memo')}>
                  <button
                    onClick={() => {
                      const memo = inventory().find((i) => i.id === 'memo');
                      if (memo) setViewingMemo(memo);
                    }}
                    class="flex-1 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
                  >
                    📄 メモを確認
                  </button>
                </Show>
                <button
                  onClick={() => setShowSafeModal(false)}
                  class="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
