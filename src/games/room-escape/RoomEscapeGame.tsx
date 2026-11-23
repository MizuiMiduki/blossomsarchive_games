import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const RoomEscapeGame: Component = () => {
  // 部屋の進行ステート
  const [deskDrawerOpened, setDeskDrawerOpened] = createSignal(false);
  const [paintingTilted, setPaintingTilted] = createSignal(false);
  const [safeOpened, setSafeOpened] = createSignal(false);
  const [doorUnlocked, setDoorUnlocked] = createSignal(false);
  const [isEscaped, setIsEscaped] = createSignal(false);

  // 金庫のダイヤル入力
  const [safeCode, setSafeCode] = createSignal(['0', '0', '0', '0']);
  const [showSafeModal, setShowSafeModal] = createSignal(false);

  // メッセージ案内
  const [message, setMessage] = createSignal('部屋を調べて脱出の手がかりを探そう。');

  // インベントリ
  const [inventory, setInventory] = createSignal<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = createSignal<string | null>(null);

  // タイマー & スコア
  const [startTime, setStartTime] = createSignal(Date.now());
  const [elapsedSec, setElapsedSec] = createSignal(0);

  const initGame = () => {
    setDeskDrawerOpened(false);
    setPaintingTilted(false);
    setSafeOpened(false);
    setDoorUnlocked(false);
    setIsEscaped(false);
    setSafeCode(['0', '0', '0', '0']);
    setShowSafeModal(false);
    setInventory([]);
    setSelectedItemId(null);
    setMessage('部屋を調べて脱出の手がかりを探そう。');
    setStartTime(Date.now());
    setElapsedSec(0);
  };

  const hasItem = (id: string) => inventory().some((item) => item.id === id);

  const addItem = (item: InventoryItem) => {
    sound.playMatch(4);
    setInventory((inv) => [...inv, item]);
    setMessage(`【${item.name}】を手に入れた！`);
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
      setMessage('絵画を傾けたら、裏からメモが落ちてきた！');
      if (!hasItem('memo')) {
        addItem({
          id: 'memo',
          name: '謎のメモ',
          description: '「金庫の暗号は時計の針が指す時刻：7492」と書かれている。',
          icon: '📄',
        });
      }
    } else {
      setMessage('傾いた絵画。裏にはもう何もない。');
    }
  };

  // 2. 机の引き出しのクリック
  const handleDeskClick = () => {
    sound.playPop(420);
    if (!deskDrawerOpened()) {
      // 鍵が必要かチェック
      if (selectedItemId() === 'small_key') {
        sound.playMatch(5);
        removeItem('small_key');
        setDeskDrawerOpened(true);
        setMessage('小さな鍵で引き出しが開いた！中にドライバーが入っている。');
        addItem({
          id: 'screwdriver',
          name: 'マイナスドライバー',
          description: 'ネジを外すことができる頑丈なドライバー。',
          icon: '🪛',
        });
      } else {
        setMessage('引き出しには鍵がかかっている。「小さな鍵」が必要なようだ。');
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
        description: '机の引き出しに使えそうな真鍮の鍵。',
        icon: '🗝️',
      });
      setMessage('植木の土の中から【小さな鍵】を見つけた！');
    } else {
      setMessage('青々とした観葉植物。特に変わったところはない。');
    }
  };

  // 4. 金庫のクリック
  const handleSafeClick = () => {
    sound.playPop(500);
    if (safeOpened()) {
      setMessage('金庫はすでに開いている。中は空だ。');
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

    // 正解判定: 7 4 9 2
    if (next.join('') === '7492') {
      sound.playVictory();
      setSafeOpened(true);
      setShowSafeModal(false);
      addItem({
        id: 'door_key',
        name: '銀のマスターキー',
        description: '部屋の扉を開けることができる重厚な鍵。',
        icon: '🔑',
      });
      setMessage('カチリ！金庫が開いた！【銀のマスターキー】を手に入れた！');
    }
  };

  // 5. 扉のクリック
  const handleDoorClick = () => {
    if (isEscaped()) return;

    if (doorUnlocked()) {
      // 脱出成功！
      sound.playVictory();
      setIsEscaped(true);
      setMessage('扉を開けて部屋から脱出した！おめでとう！');
      return;
    }

    if (selectedItemId() === 'door_key') {
      sound.playVictory();
      removeItem('door_key');
      setDoorUnlocked(true);
      setMessage('マスターキーで鍵が開いた！クリックして外へ出よう！');
    } else {
      sound.playPop(350);
      setMessage('頑丈な扉。鍵がかかっていて開かない。');
    }
  };

  const score = () => {
    if (!isEscaped()) return 0;
    return Math.max(500, 5000 - elapsedSec() * 20);
  };

  onSettled(() => {
    initGame();
    const interval = window.setInterval(() => {
      if (!isEscaped()) {
        setElapsedSec(Math.floor((Date.now() - startTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  });

  const instructions = [
    '【ミニ脱出ゲーム】Flash黄金期を代表する1ルーム型ポイント＆クリック脱出ゲームです。',
    '怪しい場所（絵画、植木、机、金庫、扉）をクリックして調査・アイテム収集！',
    'アイテム欄からアイテムを選択して使用し、金庫の謎を解いて鍵を手に入れ、部屋から脱出しよう！',
  ];

  return (
    <GameShell
      id="room-escape"
      title="Room Escape (ミニ脱出ゲーム)"
      score={score()}
      isGameOver={false}
      isVictory={isEscaped()}
      onRestart={initGame}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-lg px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div>
            <span class="text-slate-400">脱出タイム:</span>{' '}
            <span class="font-mono font-bold text-slate-800 dark:text-slate-100">{elapsedSec()} 秒</span>
          </div>
          <div class="text-[11px] text-slate-500 font-semibold truncate max-w-[280px]">
            {message()}
          </div>
        </div>
      }
    >
      <div class="flex flex-col items-center justify-center gap-2 w-full max-w-2xl max-h-full select-none px-2">
        {/* 部屋のビジュアル (SVGルームイラスト) */}
        <div class="w-full aspect-[4/3] max-h-[calc(100dvh-170px)] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative bg-slate-900">
          <svg viewBox="0 0 480 360" class="w-full h-full block">
            {/* 部屋の壁・床 */}
            <polygon points="0,0 480,0 480,270 0,270" fill="#1e293b" />
            <polygon points="0,270 480,270 480,360 0,360" fill="#0f172a" />
            <line x1="0" y1="270" x2="480" y2="270" stroke="#334155" stroke-width="3" />

            {/* 1. 脱出扉 */}
            <g onClick={handleDoorClick} class="cursor-pointer group">
              <rect
                x="200"
                y="50"
                width="80"
                height="220"
                fill={doorUnlocked() ? '#38bdf8' : '#334155'}
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
              <text x="240" y="40" fill="#94a3b8" font-size="11" text-anchor="middle" font-weight="bold">
                {doorUnlocked() ? 'EXIT (クリックで脱出)' : 'DOOR'}
              </text>
            </g>

            {/* 2. 壁の絵画 */}
            <g
              onClick={handlePaintingClick}
              class="cursor-pointer"
              transform={paintingTilted() ? 'rotate(12, 100, 100)' : ''}
              style="transition: transform 0.3s ease;"
            >
              <rect x="60" y="60" width="70" height="55" fill="#f59e0b" stroke="#78350f" stroke-width="4" rx="2" />
              <rect x="68" y="68" width="54" height="39" fill="#0284c7" />
              <circle cx="85" cy="85" r="10" fill="#fde047" />
            </g>

            {/* 3. 机 & 引き出し */}
            <g onClick={handleDeskClick} class="cursor-pointer">
              <rect x="330" y="160" width="110" height="90" fill="#78350f" stroke="#451a03" stroke-width="3" rx="3" />
              {/* 引き出し */}
              <rect
                x="345"
                y="180"
                width="80"
                height="32"
                fill={deskDrawerOpened() ? '#451a03' : '#92400e'}
                stroke="#451a03"
                stroke-width="2"
              />
              <circle cx="385" cy="196" r="4" fill="#fbbf24" />
            </g>

            {/* 4. 金庫 (机の下) */}
            <g onClick={handleSafeClick} class="cursor-pointer">
              <rect
                x="345"
                y="220"
                width="80"
                height="45"
                fill={safeOpened() ? '#1e293b' : '#020617'}
                stroke="#64748b"
                stroke-width="2"
                rx="2"
              />
              <circle cx="385" cy="242" r="8" fill="#475569" stroke="#94a3b8" />
              <text x="385" y="245" fill="#f8fafc" font-size="7" text-anchor="middle">SAFE</text>
            </g>

            {/* 5. 観葉植物 */}
            <g onClick={handlePlantClick} class="cursor-pointer">
              {/* 鉢 */}
              <polygon points="65,230 95,230 90,265 70,265" fill="#ea580c" stroke="#9a3412" stroke-width="2" />
              {/* 葉 */}
              <ellipse cx="80" cy="210" rx="20" ry="14" fill="#16a34a" />
              <ellipse cx="65" cy="215" rx="15" ry="10" fill="#22c55e" />
              <ellipse cx="95" cy="215" rx="15" ry="10" fill="#22c55e" />
            </g>
          </svg>
        </div>

        {/* 持ち物 (インベントリバー) */}
        <div class="w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-2 text-xs shadow-md">
          <div class="flex items-center justify-between mb-1.5 px-1">
            <span class="font-bold text-slate-300 text-[11px]">持ち物 (クリックで選択して使用):</span>
            <span class="text-slate-500 text-[10px]">{inventory().length} 個</span>
          </div>

          <div class="flex items-center gap-2 min-h-[46px] overflow-x-auto">
            <For each={inventory()}>
              {(item) => {
                const isSelected = () => selectedItemId() === item.id;
                return (
                  <button
                    onClick={() => {
                      sound.playPop(400);
                      setSelectedItemId((prev) => (prev === item.id ? null : item.id));
                      setMessage(`【${item.name}】${item.description}`);
                    }}
                    class={`px-3 py-2 rounded-xl flex items-center gap-1.5 border transition-all text-xs whitespace-nowrap ${
                      isSelected()
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80'
                    }`}
                  >
                    <span class="text-base">{item.icon}</span>
                    <span class="font-semibold">{item.name}</span>
                  </button>
                );
              }}
            </For>
            <Show when={inventory().length === 0}>
              <span class="text-slate-500 text-[11px] px-2">持っているアイテムはありません</span>
            </Show>
          </div>
        </div>

        {/* 金庫ダイヤル入力モーダル */}
        <Show when={showSafeModal()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
              <h3 class="text-base font-black text-slate-900 dark:text-white mb-2">
                金庫の暗証番号
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">
                4桁のダイヤルを合わせてロックを解除してください。
              </p>

              {/* 4つのダイヤル */}
              <div class="flex justify-center gap-2 mb-6">
                <For each={safeCode()}>
                  {(digit, idx) => (
                    <button
                      onClick={() => rotateDigit(idx())}
                      class="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 font-mono font-black text-2xl text-slate-900 dark:text-white hover:border-amber-500 active:scale-95 transition-all shadow-inner"
                    >
                      {digit}
                    </button>
                  )}
                </For>
              </div>

              <button
                onClick={() => setShowSafeModal(false)}
                class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
              >
                閉じる
              </button>
            </div>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
