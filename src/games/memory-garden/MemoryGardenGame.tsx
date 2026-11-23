import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface Card {
  id: number;
  emoji: string;
  name: string;
}

const CARD_SYMBOLS = [
  { emoji: '🌟', name: '星' },
  { emoji: '🍀', name: 'クローバー' },
  { emoji: '💎', name: 'ダイヤ' },
  { emoji: '🚀', name: 'ロケット' },
  { emoji: '🍒', name: 'チェリー' },
  { emoji: '👑', name: '王冠' },
  { emoji: '🔥', name: '炎' },
  { emoji: '🎵', name: '音符' },
  { emoji: '🌸', name: '桜' },
  { emoji: '🌙', name: '三日月' },
];

export const MemoryGardenGame: Component = () => {
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [cards, setCards] = createSignal<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = createSignal<number[]>([]);
  const [matchedCardIds, setMatchedCardIds] = createSignal<Set<number>>(new Set());
  const [moves, setMoves] = createSignal(0);
  const [seconds, setSeconds] = createSignal(0);
  const [isVictory, setIsVictory] = createSignal(false);
  const [isLocked, setIsLocked] = createSignal(false);

  let timer: number | null = null;

  const getPairCount = () => {
    switch (difficulty()) {
      case 'easy':
        return 6; // 3x4 = 12
      case 'normal':
        return 8; // 4x4 = 16
      case 'hard':
        return 10; // 4x5 = 20
    }
  };

  const restart = () => {
    if (timer) clearInterval(timer);
    const count = getPairCount();
    const selectedSymbols = CARD_SYMBOLS.slice(0, count);
    const deck: Card[] = [];

    selectedSymbols.forEach((f, idx) => {
      deck.push({ id: idx * 2, emoji: f.emoji, name: f.name });
      deck.push({ id: idx * 2 + 1, emoji: f.emoji, name: f.name });
    });

    // シャッフル
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setFlippedIndices([]);
    setMatchedCardIds(new Set<number>());
    setMoves(0);
    setSeconds(0);
    setIsVictory(false);
    setIsLocked(false);

    timer = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  };

  const handleCardClick = (index: number) => {
    if (isLocked()) return;
    const currentCards = cards();
    if (index < 0 || index >= currentCards.length) return;
    const card = currentCards[index];

    // 既に表向きまたは揃っているカードはクリック無効
    if (flippedIndices().includes(index) || matchedCardIds().has(card.id)) return;

    sound.playPop(520);
    const flipped = [...flippedIndices(), index];
    setFlippedIndices(flipped);

    if (flipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = flipped;
      const firstCard = currentCards[firstIdx];
      const secondCard = currentCards[secondIdx];

      if (firstCard.emoji === secondCard.emoji) {
        // マッチ！
        sound.playMatch(5);
        const nextMatched = new Set(matchedCardIds());
        nextMatched.add(firstCard.id);
        nextMatched.add(secondCard.id);
        setMatchedCardIds(nextMatched);
        setFlippedIndices([]);

        // 全カードマッチ判定
        if (nextMatched.size >= currentCards.length) {
          if (timer) clearInterval(timer);
          setIsVictory(true);
        }
      } else {
        // 不一致
        setIsLocked(true);
        setTimeout(() => {
          setFlippedIndices([]);
          setIsLocked(false);
        }, 800);
      }
    }
  };

  // スコア計算
  const calculateScore = () => {
    const pairCount = getPairCount();
    const base = pairCount * 1000;
    const penalty = moves() * 50 + seconds() * 15;
    return Math.max(100, base - penalty);
  };

  onSettled(() => {
    restart();
    return () => {
      if (timer) clearInterval(timer);
    };
  });

  const instructions = [
    'カードをタップしてめくり、同じ絵柄のペアを見つけましょう。',
    '一度にめくれるのは2枚までです。揃うとカードが開いたままになります。',
    '少ない手数＆素早いクリアで高スコアと新記録を目指しましょう！',
  ];

  return (
    <GameShell
      id="memory-garden"
      title="Memory Match (神経衰弱)"
      score={calculateScore()}
      isGameOver={false}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-rose-100 dark:border-slate-800">
          {(['easy', 'normal', 'hard'] as const).map((diff) => (
            <button
              onClick={() => {
                if (difficulty() !== diff) {
                  sound.playPop(450);
                  setDifficulty(diff);
                  restart();
                }
              }}
              class={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                difficulty() === diff
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
              }`}
            >
              {diff === 'easy' ? '🌱 初級 12枚' : diff === 'normal' ? '🌸 中級 16枚' : '👑 上級 20枚'}
            </button>
          ))}
        </div>
      }
    >
      {/* 状況表示 */}
      <div class="flex items-center gap-6 mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <div>
          手数: <span class="text-rose-500 font-bold">{moves()}</span>
        </div>
        <div>
          タイム: <span class="text-slate-800 dark:text-slate-100 font-mono">{seconds()}s</span>
        </div>
      </div>

      {/* カードグリッド */}
      <div
        class={`grid gap-2.5 p-3 bg-rose-200/40 dark:bg-slate-900/40 rounded-3xl border border-rose-200/60 dark:border-slate-800 max-w-sm w-full ${
          difficulty() === 'easy'
            ? 'grid-cols-3'
            : difficulty() === 'normal'
            ? 'grid-cols-4'
            : 'grid-cols-4'
        }`}
      >
        <For each={cards()}>
          {(card, index) => {
            const isFlipped = () => flippedIndices().includes(index());
            const isMatched = () => matchedCardIds().has(card.id);
            const isOpen = () => isFlipped() || isMatched();

            return (
              <button
                onClick={() => handleCardClick(index())}
                class={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform select-none shadow-xs border ${
                  isOpen()
                    ? 'bg-white dark:bg-slate-800 border-rose-300 dark:border-slate-600 scale-100 rotate-0 shadow-sm'
                    : 'bg-gradient-to-tr from-rose-400 via-pink-400 to-rose-500 border-rose-300 hover:scale-102 active:scale-95 shadow-xs cursor-pointer'
                } ${isMatched() ? 'ring-2 ring-emerald-400 opacity-90' : ''}`}
              >
                <Show
                  when={isOpen()}
                  fallback={
                    <span class="text-white/80 text-xl font-bold flex flex-col items-center">
                      <span>✦</span>
                    </span>
                  }
                >
                  <span class="text-3xl sm:text-4xl filter drop-shadow-xs animate-in zoom-in-75 duration-150">
                    {card.emoji}
                  </span>
                  <span class="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1">
                    {card.name}
                  </span>
                </Show>
              </button>
            );
          }}
        </For>
      </div>
    </GameShell>
  );
};
