import { Component } from 'solid-js';
import { Floris2048Game } from './floris-2048/Floris2048Game.tsx';
import { MemoryGardenGame } from './memory-garden/MemoryGardenGame.tsx';
import { ReversiGame } from './reversi/ReversiGame.tsx';
import { GomokuGame } from './gomoku/GomokuGame.tsx';
import { MiniShogiGame } from './shogi/MiniShogiGame.tsx';
import { ChessGame } from './chess/ChessGame.tsx';
import { PetalSolitaireGame } from './solitaire/PetalSolitaireGame.tsx';
import { BouquetBlockGame } from './block-puzzle/BouquetBlockGame.tsx';
import { PetalDashGame } from './petal-dash/PetalDashGame.tsx';
import { BlossomDropGame } from './blossom-drop/BlossomDropGame.tsx';
import { BlossomLifeGame } from './life-game/BlossomLifeGame.tsx';

export type GameCategory = 'all' | 'puzzle' | 'board' | 'card' | 'action' | 'casual';

export interface GameDefinition {
  id: string;
  title: string;
  titleJp: string;
  category: GameCategory;
  description: string;
  badge?: string;
  icon: string;
  color: string;
  component: Component;
  isAvailable: boolean;
}

export const GAMES: GameDefinition[] = [
  {
    id: 'blossom-life',
    title: "Conway's Life Game",
    titleJp: 'ライフゲーム',
    category: 'casual',
    description: 'セルの誕生・生存・過密による死滅を観察する数学シミュレーション。多彩なプリセットを搭載。',
    badge: 'NEW',
    icon: '🧬',
    color: 'from-teal-400 to-cyan-500',
    component: BlossomLifeGame,
    isAvailable: true,
  },
  {
    id: 'petal-reversi',
    title: 'Reversi',
    titleJp: 'リバーシ (オセロ)',
    category: 'board',
    description: '相手の石を挟んでひっくり返す定番ボードゲーム。初級〜上級のNPC AI対戦＆P2P通信対戦に対応。',
    badge: '人気',
    icon: '⚫',
    color: 'from-emerald-500 to-teal-600',
    component: ReversiGame,
    isAvailable: true,
  },
  {
    id: 'mini-shogi',
    title: '5×5 Mini Shogi',
    titleJp: '5×5 ミニ将棋',
    category: 'board',
    description: '王・金・銀・角・飛・歩のミニ盤で繰り広げるスピーディな将棋。持ち駒や成りも完全対応。',
    badge: 'NEW',
    icon: '☗',
    color: 'from-amber-600 to-orange-700',
    component: MiniShogiGame,
    isAvailable: true,
  },
  {
    id: 'blossom-chess',
    title: 'Chess',
    titleJp: 'チェス',
    category: 'board',
    description: 'キング、クイーン、ルークなど伝統の駒で繰り広げるクラシックチェス。初級〜上級NPC対戦。',
    badge: 'NEW',
    icon: '♟️',
    color: 'from-indigo-500 to-purple-600',
    component: ChessGame,
    isAvailable: true,
  },
  {
    id: 'gomoku-garden',
    title: 'Gomoku',
    titleJp: '五目並べ',
    category: 'board',
    description: '白黒の碁石を縦横斜めのいずれかに5つ並べる定番頭脳ゲーム。初心者から上級者まで。',
    badge: 'NEW',
    icon: '⚪',
    color: 'from-stone-500 to-slate-700',
    component: GomokuGame,
    isAvailable: true,
  },
  {
    id: 'blossom-drop',
    title: 'Fruit Drop',
    titleJp: 'フルーツマージパズル',
    category: 'puzzle',
    description: '同じフルーツを落としてくっつけ、特大フルーツを目指す2D物理演算パズル。',
    badge: '注目',
    icon: '🍉',
    color: 'from-rose-500 to-pink-600',
    component: BlossomDropGame,
    isAvailable: true,
  },
  {
    id: 'floris-2048',
    title: '2048',
    titleJp: '2048',
    category: 'puzzle',
    description: '同じ数字のパネルをスライドして合体させ、2048タイルを目指す大人気スライドパズル。',
    badge: '定番',
    icon: '🔢',
    color: 'from-amber-400 to-orange-500',
    component: Floris2048Game,
    isAvailable: true,
  },
  {
    id: 'memory-garden',
    title: 'Memory Match',
    titleJp: '神経衰弱',
    category: 'casual',
    description: 'カードをめくってペアを揃える、記憶力とスピードの定番トランプパズル。',
    badge: '定番',
    icon: '🃏',
    color: 'from-violet-500 to-purple-600',
    component: MemoryGardenGame,
    isAvailable: true,
  },
  {
    id: 'petal-solitaire',
    title: 'Solitaire',
    titleJp: 'ソリティア (クロンダイク)',
    category: 'card',
    description: '手軽にワンタップ・ドラッグでじっくり楽しめるクラシック・ソリティア。',
    badge: 'NEW',
    icon: '♠️',
    color: 'from-emerald-400 to-teal-500',
    component: PetalSolitaireGame,
    isAvailable: true,
  },
  {
    id: 'bouquet-block',
    title: 'Block Puzzle 10x10',
    titleJp: 'ブロックパズル 10×10',
    category: 'puzzle',
    description: '10×10盤面にブロックを敷き詰めて縦横ラインを消していく思考型パズル。',
    badge: 'NEW',
    icon: '🧩',
    color: 'from-blue-400 to-indigo-500',
    component: BouquetBlockGame,
    isAvailable: true,
  },
  {
    id: 'petal-dash',
    title: 'Tap Dash',
    titleJp: 'タップダッシュ',
    category: 'action',
    description: '画面をタップして障害物をくぐり抜け、どこまでも進むエンドレスランアクション。',
    badge: 'NEW',
    icon: '🏃',
    color: 'from-cyan-400 to-sky-500',
    component: PetalDashGame,
    isAvailable: true,
  },
];
