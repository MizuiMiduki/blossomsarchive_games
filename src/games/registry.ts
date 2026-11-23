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
    title: 'Blossom Life',
    titleJp: '百花繚乱 ライフゲーム',
    category: 'casual',
    description: '生命の誕生と開花、世代交代をシミュレートするモダナイズド・ライフゲーム。多彩なプリセット搭載。',
    badge: 'NEW',
    icon: '🌱',
    color: 'from-emerald-400 to-teal-500',
    component: BlossomLifeGame,
    isAvailable: true,
  },
  {
    id: 'petal-reversi',
    title: 'Petal Reversi',
    titleJp: '花弁リバーシ (オセロ)',
    category: 'board',
    description: '紅椿🌺と白桜🌸で挟み合う本格オセロ。初級〜上級のNPC AI対戦とヒント機能付き。',
    badge: '人気',
    icon: '🌺',
    color: 'from-emerald-500 to-teal-600',
    component: ReversiGame,
    isAvailable: true,
  },
  {
    id: 'mini-shogi',
    title: 'Mini Shogi',
    titleJp: '5×5 ミニ将棋 (NPC対戦)',
    category: 'board',
    description: '王・金・銀・角・飛の5×5盤で繰り広げるスピーディな将棋。持ち駒や成りも完全対応。',
    badge: 'NEW',
    icon: '☗',
    color: 'from-amber-600 to-orange-700',
    component: MiniShogiGame,
    isAvailable: true,
  },
  {
    id: 'blossom-chess',
    title: 'Blossom Chess',
    titleJp: 'チェス (NPC対戦)',
    category: 'board',
    description: 'クラシックな盤面で手軽に知恵比べ。知性的な思考エンジン搭載のチェス。',
    badge: 'NEW',
    icon: '♟️',
    color: 'from-indigo-500 to-purple-600',
    component: ChessGame,
    isAvailable: true,
  },
  {
    id: 'gomoku-garden',
    title: 'Gomoku Garden',
    titleJp: '五目並べ (NPC対戦)',
    category: 'board',
    description: '碁盤の上に5つの石を連続で並べる定番頭脳ゲーム。初心者から上級者まで。',
    badge: 'NEW',
    icon: '⚪',
    color: 'from-stone-500 to-slate-700',
    component: GomokuGame,
    isAvailable: true,
  },
  {
    id: 'blossom-drop',
    title: 'Blossom Drop',
    titleJp: '花果マージパズル',
    category: 'puzzle',
    description: '同じフルーツ・花を落としてくっつけ、大輪の桜花を目指す2D物理パズル。',
    badge: '注目',
    icon: '🍉',
    color: 'from-rose-500 to-pink-600',
    component: BlossomDropGame,
    isAvailable: true,
  },
  {
    id: 'floris-2048',
    title: 'Floris 2048',
    titleJp: 'フラワー2048',
    category: 'puzzle',
    description: 'つぼみ🌱から育てて、大輪の奇跡の花束💐を目指す爽快スライドパズル。',
    badge: '定番',
    icon: '🌸',
    color: 'from-rose-400 to-pink-500',
    component: Floris2048Game,
    isAvailable: true,
  },
  {
    id: 'memory-garden',
    title: 'Memory Garden',
    titleJp: 'メモリーガーデン (神経衰弱)',
    category: 'casual',
    description: '美しい花のカードをめくってペアを揃える、記憶力とスピードのゲーム。',
    badge: '定番',
    icon: '🌷',
    color: 'from-amber-400 to-rose-400',
    component: MemoryGardenGame,
    isAvailable: true,
  },
  {
    id: 'petal-solitaire',
    title: 'Petal Solitaire',
    titleJp: '花咲くソリティア',
    category: 'card',
    description: '美しい花びらトランプでじっくり楽しむクラシック・クロンダイク。ワンタップ移動対応。',
    badge: 'NEW',
    icon: '🃏',
    color: 'from-emerald-400 to-teal-500',
    component: PetalSolitaireGame,
    isAvailable: true,
  },
  {
    id: 'bouquet-block',
    title: 'Bouquet Block 10x10',
    titleJp: 'ブーケブロック',
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
    title: 'Petal Dash',
    titleJp: 'ペタルダッシュ',
    category: 'action',
    description: '風に乗る花びらをタップでふわりと操り、障害物をかわして飛ぶエンドレスラン。',
    badge: 'NEW',
    icon: '🍃',
    color: 'from-cyan-400 to-sky-500',
    component: PetalDashGame,
    isAvailable: true,
  },
];
