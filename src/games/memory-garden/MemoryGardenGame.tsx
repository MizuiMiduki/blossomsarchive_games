import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface Card {
  id: number;
  emoji: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const FLOWERS = [
  { emoji: '🌷', name: 'チューリップ' },
  { emoji: '🌻', name: 'ひまわり' },
  { emoji: '🌹', name: 'バラ' },
  { emoji: '🌺', name: 'ハイビスカス' },
  { emoji: '🌸', name: '桜' },
  { emoji: '🌼', name: 'デイジー' },
  { emoji: '🪷', name: 'ハス' },
  { emoji: '💐', name: '花束' },
  { emoji: '🍀', name: 'クローバー' },
  { emoji: '🌾', name: 'ススキ' },
];

export const MemoryGardenGame: Component = () => {
  const [difficulty, setDifficulty] = createSignal<'easy' | 'normal' | 'hard'>('normal');
  const [cards, setCards] = createSignal<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = createSignal<number[]>([]);
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
    const selectedFlowers = FLOWERS.slice(0, count);
    const deck: Card[] = [];

    selectedFlowers.forEach((f, idx) => {
      deck.push({ id: idx * 2, emoji: f.emoji, name: f.name, isFlipped: false, isMatched: false });
      deck.push({ id: idx * 2 + 1, emoji: f.emoji, name: f.name, isFlipped: false, isMatched: false });
    });

    // シャッフル
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setFlippedIndices([]);
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
    const currentCards = [...cards()];
    const card = currentCards[index];

    if (card.isFlipped || card.isMatched) return;

    sound.playPop(520);
    card.isFlipped = true;
    setCards(currentCards);

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
        firstCard.isMatched = true;
        secondCard.isMatched = true;
        setCards(currentCards);
        setFlippedIndices([]);

        // 全カードマッチ判定
        const allMatched = currentCards.every((c) => c.isMatched);
        if (allMatched) {
          if (timer) clearInterval(timer);
          setIsVictory(true);
        }
      } else {
        // 不一致
        setIsLocked(true);
        setTimeout(() => {
          firstCard.isFlipped = false;
          secondCard.isFlipped = false;
          setCards([...currentCards]);
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
    'カードをタップしてめくり、同じ花のペアを見つけましょう。',
    '一度にめくれるのは2枚までです。揃うとカードが開いたままになります。',
    '少ない手数＆素早いクリアで高スコアと新記録を目指しましょう！',
  ];

  return (
    <GameShell
      id="memory-garden"
      title="Memory Garden"
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
              class={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                difficulty() === diff
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-rose-500'
              }`}
            >
              {diff === 'easy' ? '初級 12枚' : diff === 'normal' ? '中級 16枚' : '上級 20枚'}
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
          {(card, index) => (
            <button
              onClick={() => handleCardClick(index())}
              class={`aspect-square rounded-2xl flex items-center justify-center text-3xl sm:text-4xl transition-all duration-300 transform select-none shadow-xs border ${
                card.isFlipped || card.isMatched
                  ? 'bg-white dark:bg-slate-800 border-rose-200 dark:border-slate-700 rotate-0 scale-100'
                  : 'bg-gradient-to-tr from-rose-400 to-pink-500 border-rose-300 text-transparent hover:scale-102 active:scale-95'
              } ${card.isMatched ? 'opacity-85 ring-2 ring-emerald-400' : ''}`}
            >
              <Show
                when={card.isFlipped || card.isMatched}
                fallback={<span class="text-white/60 text-xl font-black">🌸</span>}
              >
                <span class="animate-in zoom-in-75 duration-150">{card.emoji}</span>
              </Show>
            </button>
          )}
        </For>
      </div>
    </GameShell>
  );
};
