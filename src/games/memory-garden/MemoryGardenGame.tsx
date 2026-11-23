import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface Card {
  id: number;
  rank: string;
  suit: string;
  color: 'red' | 'black';
}

const CARD_PAIRS = [
  { rank: 'A', suit: '♠', color: 'black' as const },
  { rank: 'K', suit: '♥', color: 'red' as const },
  { rank: 'Q', suit: '♦', color: 'red' as const },
  { rank: 'J', suit: '♣', color: 'black' as const },
  { rank: '10', suit: '♠', color: 'black' as const },
  { rank: '9', suit: '♥', color: 'red' as const },
  { rank: '8', suit: '♦', color: 'red' as const },
  { rank: '7', suit: '♣', color: 'black' as const },
  { rank: '6', suit: '♠', color: 'black' as const },
  { rank: '5', suit: '♥', color: 'red' as const },
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
    const selectedPairs = CARD_PAIRS.slice(0, count);
    const deck: Card[] = [];

    selectedPairs.forEach((f, idx) => {
      deck.push({ id: idx * 2, rank: f.rank, suit: f.suit, color: f.color });
      deck.push({ id: idx * 2 + 1, rank: f.rank, suit: f.suit, color: f.color });
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

      if (firstCard.rank === secondCard.rank && firstCard.suit === secondCard.suit) {
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
        <div class="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          {(['easy', 'normal', 'hard'] as const).map((diff) => (
            <button
              onClick={() => {
                if (difficulty() !== diff) {
                  sound.playPop(450);
                  setDifficulty(diff);
                  restart();
                }
              }}
              class={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                difficulty() === diff
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {diff === 'easy' ? '初級 (12枚)' : diff === 'normal' ? '中級 (16枚)' : '上級 (20枚)'}
            </button>
          ))}
        </div>
      }
    >
      {/* 状況表示 */}
      <div class="flex items-center gap-6 mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <div>
          手数: <span class="text-slate-900 dark:text-white font-bold">{moves()}</span>
        </div>
        <div>
          タイム: <span class="text-slate-800 dark:text-slate-100 font-mono">{seconds()}s</span>
        </div>
      </div>

      {/* カードグリッド */}
      <div
        class={`grid gap-2.5 p-3.5 bg-slate-200/50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-sm w-full ${
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
                class={`aspect-[3/4] rounded-xl flex flex-col items-center justify-between p-1.5 transition-all duration-200 transform select-none shadow-2xs border ${
                  isOpen()
                    ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 scale-100 shadow-xs'
                    : 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 border-slate-700 dark:border-slate-600 hover:scale-102 active:scale-95 shadow-xs cursor-pointer'
                } ${isMatched() ? 'ring-2 ring-emerald-500 opacity-90' : ''}`}
              >
                <Show
                  when={isOpen()}
                  fallback={
                    <div class="w-full h-full rounded-lg border border-slate-700/60 dark:border-slate-600/60 flex items-center justify-center text-slate-500 text-sm">
                      ✦
                    </div>
                  }
                >
                  <div
                    class={`w-full h-full flex flex-col justify-between items-center ${
                      card.color === 'red' ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <div class="w-full flex justify-between items-center font-bold text-xs leading-none">
                      <span>{card.rank}</span>
                      <span class="text-[10px]">{card.suit}</span>
                    </div>
                    <span class="text-2xl sm:text-3xl leading-none">
                      {card.suit}
                    </span>
                    <div class="w-full flex justify-between items-center font-bold text-xs leading-none rotate-180">
                      <span>{card.rank}</span>
                      <span class="text-[10px]">{card.suit}</span>
                    </div>
                  </div>
                </Show>
              </button>
            );
          }}
        </For>
      </div>
    </GameShell>
  );
};
