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
import {
  LifeGameIcon,
  ReversiIcon,
  ShogiIcon,
  ChessIcon,
  GomokuIcon,
  FruitDropIcon,
  Puzzle2048Icon,
  MemoryCardsIcon,
  SolitaireCardIcon,
  BlockPuzzleIcon,
  DashRunnerIcon,
} from '../components/Icons.tsx';

export type GameCategory = 'all' | 'puzzle' | 'board' | 'card' | 'action' | 'casual';

export interface GameDefinition {
  id: string;
  title: string;
  titleJp: string;
  category: GameCategory;
  description: string;
  badge?: string;
  icon: Component<{ size?: number | string; class?: string }>;
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
    description: 'セルの誕生・生存・過密による死滅を観察する数学シミュレーション。画面をタップ・なぞってセルを自由に配置。',
    badge: 'NEW',
    icon: LifeGameIcon,
    color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/40',
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
    icon: ReversiIcon,
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
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
    icon: ShogiIcon,
    color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40',
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
    icon: ChessIcon,
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
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
    icon: GomokuIcon,
    color: 'bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800',
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
    icon: FruitDropIcon,
    color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40',
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
    icon: Puzzle2048Icon,
    color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40',
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
    icon: MemoryCardsIcon,
    color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40',
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
    icon: SolitaireCardIcon,
    color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40',
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
    icon: BlockPuzzleIcon,
    color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40',
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
    icon: DashRunnerIcon,
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    component: PetalDashGame,
    isAvailable: true,
  },
];
