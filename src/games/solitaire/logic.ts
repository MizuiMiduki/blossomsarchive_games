// クロンダイク・ソリティア ロジック

export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type CardColor = 'black' | 'red';

export interface Card {
  id: number;
  suit: Suit;
  rank: number; // 1 (A) ~ 13 (K)
  faceUp: boolean;
}

export const SUIT_ICONS: Record<Suit, { icon: string; color: CardColor }> = {
  spade: { icon: '♠', color: 'black' },
  heart: { icon: '♥', color: 'red' },
  diamond: { icon: '♦', color: 'red' },
  club: { icon: '♣', color: 'black' },
};

export const RANK_NAMES: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

export interface SolitaireState {
  stock: Card[];          // 山札
  waste: Card[];          // 捨て札
  foundations: Card[][];  // 組札 (4つ: 各スートA->K)
  tableau: Card[][];      // 場札 (7列)
}

let cardIdCounter = 1;

export function createDeck(): Card[] {
  const suits: Suit[] = ['spade', 'heart', 'diamond', 'club'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: cardIdCounter++, suit, rank, faceUp: false });
    }
  }
  // シャッフル
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function dealSolitaire(): SolitaireState {
  const deck = createDeck();
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);

  // 7列にカードを配る
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j <= i; j++) {
      const card = deck.pop()!;
      card.faceUp = j === i; // 一番上だけ表向き
      tableau[i].push(card);
    }
  }

  return {
    stock: deck,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  };
}
