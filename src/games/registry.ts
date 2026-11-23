import { Component } from 'solid-js';
import { Floris2048Game } from './floris-2048/Floris2048Game.tsx';
import { MemoryGardenGame } from './memory-garden/MemoryGardenGame.tsx';
import { ReversiGame } from './reversi/ReversiGame.tsx';
import { GomokuGame } from './gomoku/GomokuGame.tsx';
import { MiniShogiGame } from './shogi/MiniShogiGame.tsx';
import { StandardShogiGame } from './shogi/StandardShogiGame.tsx';
import { ChessGame } from './chess/ChessGame.tsx';
import { PetalSolitaireGame } from './solitaire/PetalSolitaireGame.tsx';
import { BouquetBlockGame } from './block-puzzle/BouquetBlockGame.tsx';
import { PetalDashGame } from './petal-dash/PetalDashGame.tsx';
import { BlossomDropGame } from './blossom-drop/BlossomDropGame.tsx';
import { BlossomLifeGame } from './life-game/BlossomLifeGame.tsx';
import { ItoToshiGame } from './ito-toshi/ItoToshiGame.tsx';
import { WireMazeGame } from './wire-maze/WireMazeGame.tsx';
import { LightsOutGame } from './lights-out/LightsOutGame.tsx';
import { SkyLauncherGame } from './sky-launcher/SkyLauncherGame.tsx';
import { RoomEscapeGame } from './room-escape/RoomEscapeGame.tsx';
import { AiJailbreakGame } from './ai-jailbreak/AiJailbreakGame.tsx';
import { AiDetectiveGame } from './ai-detective/AiDetectiveGame.tsx';
import { WordAlchemyGame } from './word-alchemy/WordAlchemyGame.tsx';
import { AiCourtroomGame } from './ai-courtroom/AiCourtroomGame.tsx';
import { SemanticWordGame } from './semantic-word/SemanticWordGame.tsx';
import {
  LifeGameIcon,
  ReversiIcon,
  ShogiIcon,
  ChessIcon,
  GomokuIcon,
  PlanetDropIcon,
  Puzzle2048Icon,
  MemoryCardsIcon,
  SolitaireCardIcon,
  BlockPuzzleIcon,
  DashRunnerIcon,
  ItoToshiIcon,
  WireMazeIcon,
  LightsOutIcon,
  CatapultIcon,
  EscapeRoomIcon,
  AiJailbreakIcon,
  AiDetectiveIcon,
  WordAlchemyIcon,
  AiCourtroomIcon,
  SemanticWordIcon,
} from '../components/Icons.tsx';

export type GameCategory = 'all' | 'puzzle' | 'board' | 'card' | 'action' | 'casual' | 'ai';

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
    id: 'standard-shogi',
    title: 'Standard Shogi (9×9)',
    titleJp: '本将棋 (9×9)',
    category: 'board',
    description: '伝統の9×9マス盤で本格対局。持ち駒の再利用・成駒選択・3段階AI対戦に対応。',
    badge: 'NEW',
    icon: ShogiIcon,
    color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-900/60',
    component: StandardShogiGame,
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
    title: 'Planet Drop',
    titleJp: '惑星マージパズル',
    category: 'puzzle',
    description: '同じ天体を落として合体させ、巨大な太陽を目指す2D物理演算パズル。ホールド機能搭載。',
    badge: '注目',
    icon: PlanetDropIcon,
    color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40',
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
  {
    id: 'ito-toshi',
    title: 'Ito-toshi',
    titleJp: '糸通し',
    category: 'casual',
    description: '長押しで上昇、離して下降。迫り来る針の穴をくぐり抜けて限界の飛距離を目指すFlash風名作。',
    badge: '名作',
    icon: ItoToshiIcon,
    color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40',
    component: ItoToshiGame,
    isAvailable: true,
  },
  {
    id: 'wire-maze',
    title: 'Wire Maze',
    titleJp: '電撃イライラ棒',
    category: 'action',
    description: '壁やトラップに触れたら即爆発！慎重かつスピーディにゴールを目指す緊張のマウスアクション。',
    badge: '名作',
    icon: WireMazeIcon,
    color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40',
    component: WireMazeGame,
    isAvailable: true,
  },
  {
    id: 'lights-out',
    title: 'Lights Out',
    titleJp: 'ライツアウト',
    category: 'puzzle',
    description: '押したマスと上下左右が反転。すべての明かりを消灯させるFlash時代の古典的電脳パズル。',
    badge: 'パズル',
    icon: LightsOutIcon,
    color: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200/60 dark:border-yellow-900/40',
    component: LightsOutGame,
    isAvailable: true,
  },
  {
    id: 'sky-catapult',
    title: 'Sky Launcher',
    titleJp: 'ぶっ飛ばしゲーム',
    category: 'casual',
    description: '角度とパワーを決めて発射！地上のトランポリンやブーストを駆使して最長飛距離を狙うフライトゲーム。',
    badge: '爽快',
    icon: CatapultIcon,
    color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40',
    component: SkyLauncherGame,
    isAvailable: true,
  },
  {
    id: 'room-escape',
    title: 'Room Escape',
    titleJp: 'ミニ脱出ゲーム',
    category: 'puzzle',
    description: '怪しい場所をクリックして手がかりやアイテムを発見。暗号を解いて密室から脱出する定番ゲーム。',
    badge: '脱出',
    icon: EscapeRoomIcon,
    color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40',
    component: RoomEscapeGame,
    isAvailable: true,
  },
  {
    id: 'ai-jailbreak',
    title: 'AI Jailbreak',
    titleJp: '防衛AI欺瞞パズル',
    category: 'ai',
    description: '言葉の説得・論理的矛盾・架空の緊急事態を駆使して防衛AIのプロトコルを解除させるプロンプト脱獄ゲーム。',
    badge: 'ローカルAI',
    icon: AiJailbreakIcon,
    color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40',
    component: AiJailbreakGame,
    isAvailable: true,
  },
  {
    id: 'ai-detective',
    title: 'Reverse 20Q',
    titleJp: '逆20の質問 (AI探偵を欺け)',
    category: 'ai',
    description: 'ある物になりきり、AI探偵からの15問の鋭い質問を欺き続ける逆アキネイターゲーム。',
    badge: 'ローカルAI',
    icon: AiDetectiveIcon,
    color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40',
    component: AiDetectiveGame,
    isAvailable: true,
  },
  {
    id: 'word-alchemy',
    title: 'Word Alchemy',
    titleJp: '言霊錬金脱出',
    category: 'ai',
    description: '手持ちの言葉や元素を合成して新たな言霊を創り出し、AIの物理・魔導判定で障壁を破壊して脱出するパズル。',
    badge: 'ローカルAI',
    icon: WordAlchemyIcon,
    color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40',
    component: WordAlchemyGame,
    isAvailable: true,
  },
  {
    id: 'ai-courtroom',
    title: 'AI Courtroom',
    titleJp: 'AI心理法廷 (無罪を勝ち取れ)',
    category: 'ai',
    description: '検察AIの疑惑追及に対し、論理的なアリバイや反証を展開して有罪率を下げ、無罪判決を目指す法廷バトル。',
    badge: 'ローカルAI',
    icon: AiCourtroomIcon,
    color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40',
    component: AiCourtroomGame,
    isAvailable: true,
  },
  {
    id: 'semantic-word',
    title: 'Semantic Thermometer',
    titleJp: 'ことばの温度計',
    category: 'ai',
    description: '秘密のお題との「意味の距離・温度（-20℃〜100℃）」を手がかりに、連想を膨らませて正解を目指す推測パズル。',
    badge: 'ローカルAI',
    icon: SemanticWordIcon,
    color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40',
    component: SemanticWordGame,
    isAvailable: true,
  },
];
