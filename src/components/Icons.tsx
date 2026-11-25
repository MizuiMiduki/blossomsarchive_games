import { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';

interface IconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  class?: string;
  size?: number | string;
}

export const PlayIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    class={props.class}
    {...props}
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const PauseIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    class={props.class}
    {...props}
  >
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const RotateCcwIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const VolumeIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

export const VolumeXIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" y1="9" x2="16" y2="15" />
    <line x1="16" y1="9" x2="22" y2="15" />
  </svg>
);

export const MoonIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const SunIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

export const HeartIcon: Component<IconProps & { filled?: boolean }> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill={props.filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

export const AwardIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

export const SearchIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const ArrowLeftIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export const InfoIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export const MaximizeIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const UndoIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

export const SparklesIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export const GamepadIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <line x1="6" x2="10" y1="12" y2="12" />
    <line x1="8" x2="8" y1="10" y2="14" />
    <line x1="15" x2="15.01" y1="13" y2="13" stroke-width="3" />
    <line x1="18" x2="18.01" y1="11" y2="11" stroke-width="3" />
    <rect width="20" height="12" x="2" y="6" rx="6" />
  </svg>
);

export const SyncIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

export const CheckIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const TrophyIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

// --- 各ゲーム用の洗練されたSVGベクターアイコン ---

export const LifeGameIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="currentColor"
    class={props.class}
    {...props}
  >
    <rect x="3" y="3" width="5" height="5" rx="1.5" />
    <rect x="10" y="3" width="5" height="5" rx="1.5" opacity="0.3" />
    <rect x="17" y="3" width="5" height="5" rx="1.5" />
    <rect x="3" y="10" width="5" height="5" rx="1.5" opacity="0.3" />
    <rect x="10" y="10" width="5" height="5" rx="1.5" />
    <rect x="17" y="10" width="5" height="5" rx="1.5" opacity="0.3" />
    <rect x="3" y="17" width="5" height="5" rx="1.5" />
    <rect x="10" y="17" width="5" height="5" rx="1.5" opacity="0.3" />
    <rect x="17" y="17" width="5" height="5" rx="1.5" />
  </svg>
);

export const ReversiIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    class={props.class}
    {...props}
  >
    <circle cx="9" cy="12" r="7" fill="currentColor" opacity="0.9" />
    <circle cx="15" cy="12" r="7" stroke="currentColor" stroke-width="2" fill="none" />
  </svg>
);

export const ShogiIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    class={props.class}
    {...props}
  >
    {/* 伝統的な将棋駒の五角形（底辺が肩幅より広い末広がりの本将棋形状） */}
    <path
      d="M12 2.5 L18.5 7.5 L20 21.5 L4 21.5 L5.5 7.5 Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linejoin="round"
    />
    <text
      x="12"
      y="16.5"
      text-anchor="middle"
      font-size="9"
      font-weight="900"
      fill="currentColor"
      font-family="'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif"
    >
      王
    </text>
  </svg>
);

export const ChessIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M19 21H5" />
    <path d="M7 21v-2c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v2" />
    <path d="M8 18l1-5h6l1 5" />
    <path d="M9 13V9a3 3 0 0 1 6 0v4" />
    <circle cx="12" cy="5" r="2" />
  </svg>
);

export const GomokuIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    class={props.class}
    {...props}
  >
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5" opacity="0.4" />
    <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="1.5" opacity="0.4" />
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <circle cx="6" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8" />
    <circle cx="18" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8" />
  </svg>
);

export const SweetsDropIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    {/* カップケーキ / スイーツベース */}
    <path d="M5 10 C5 7 19 7 19 10 L17.5 20 C17.5 21 16.5 21.5 15.5 21.5 L8.5 21.5 C7.5 21.5 6.5 21 6.5 20 Z" />
    {/* ホイップクリームの波 */}
    <path d="M5 10 C6.5 12 9.5 12 12 10 C14.5 12 17.5 12 19 10" />
    {/* トッピングのチェリー */}
    <circle cx="12" cy="5" r="2.2" fill="currentColor" />
    <path d="M13 3 C14.5 1.5 16.5 2 17 2.5" />
  </svg>
);

export const PlanetDropIcon: Component<IconProps> = SweetsDropIcon;
export const FruitDropIcon: Component<IconProps> = SweetsDropIcon;

export const Puzzle2048Icon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    class={props.class}
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" stroke-width="1.8" />
    <text
      x="12"
      y="16"
      text-anchor="middle"
      font-size="9"
      font-weight="900"
      fill="currentColor"
      letter-spacing="-0.5"
    >
      2048
    </text>
  </svg>
);

export const MemoryCardsIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <rect x="3" y="5" width="11" height="15" rx="2" />
    <rect x="10" y="4" width="11" height="15" rx="2" fill="currentColor" fill-opacity="0.15" />
  </svg>
);

export const SolitaireCardIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    class={props.class}
    {...props}
  >
    <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" stroke-width="1.8" />
    <path
      d="M12 7.5 C10.5 9.5 8 11.5 8 13.5 C8 15 9.5 16 11 15 C11.5 15.5 11 17 10.5 18 L13.5 18 C13 17 12.5 15.5 13 15 C14.5 16 16 15 16 13.5 C16 11.5 13.5 9.5 12 7.5 Z"
      fill="currentColor"
    />
  </svg>
);

export const BlockPuzzleIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.2" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.2" />
  </svg>
);

export const DashRunnerIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fill-opacity="0.2" />
  </svg>
);

export const ItoToshiIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    {/* 針 */}
    <path d="M19 5 L21 3 L19 2 L17 4 L6 15 L4 20 L9 18 Z" fill="currentColor" fill-opacity="0.2" />
    <circle cx="18" cy="4" r="1" fill="currentColor" />
    {/* 糸のしなやかな波 */}
    <path d="M3 21 C 6 17, 10 22, 14 18 C 16 16, 17 9, 18 4" stroke-width="1.8" />
  </svg>
);

export const WireMazeIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    {/* コースワイヤー */}
    <path d="M3 6 L10 6 L10 18 L16 18 L16 10 L21 10" />
    {/* イライラ棒のプローブ球 */}
    <circle cx="16" cy="14" r="3" fill="currentColor" />
    {/* 電撃スパーク */}
    <path d="M19 15 L22 13 L20 18" stroke-width="1.5" />
  </svg>
);

export const LightsOutIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="6" cy="12" r="1.5" fill="currentColor" fill-opacity="0.3" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" fill-opacity="0.3" />
    <circle cx="12" cy="6" r="1.5" fill="currentColor" fill-opacity="0.3" />
    <circle cx="12" cy="18" r="1.5" fill="currentColor" fill-opacity="0.3" />
  </svg>
);

export const CatapultIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    {/* 飛行軌跡 */}
    <path d="M3 19 C 5 7, 13 4, 19 8" stroke-dasharray="2 2" />
    {/* 飛翔する球 */}
    <circle cx="19" cy="8" r="3" fill="currentColor" />
    {/* 砲台 */}
    <path d="M2 21 L8 21" stroke-width="2" />
    <path d="M3 20 L7 14" stroke-width="2.5" />
  </svg>
);

export const EscapeRoomIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M4 21 V4 C4 3 5 2 6 2 H14 C15 2 16 3 16 4 V21" />
    {/* 開いた扉 */}
    <polygon points="6 3 16 5 16 19 6 21" fill="currentColor" fill-opacity="0.2" />
    {/* 鍵穴 */}
    <circle cx="13" cy="12" r="1" fill="currentColor" />
    <path d="M20 16 L20 21" />
    <path d="M17 18 L22 18" />
  </svg>
);

export const AiJailbreakIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <circle cx="12" cy="10" r="2" />
    <path d="m10 13 4 4" />
    <path d="m14 13-4 4" />
  </svg>
);

export const AiDetectiveIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
    <circle cx="11" cy="11" r="2" fill="currentColor" opacity="0.3" />
    <path d="M11 7v1" />
    <path d="M11 14v1" />
    <path d="M7 11h1" />
    <path d="M14 11h1" />
  </svg>
);

export const WordAlchemyIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M10 2v5.5L4.5 17.5A3 3 0 0 0 7.1 22h9.8a3 3 0 0 0 2.6-4.5L14 7.5V2" />
    <path d="M8.5 2h7" />
    <path d="M7 15h10" />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </svg>
);

export const AiCourtroomIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h18" />
  </svg>
);

export const SemanticWordIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    <circle cx="11.5" cy="17.5" r="2" fill="currentColor" />
    <path d="M18 7h2" />
    <path d="M18 11h2" />
    <path d="M18 15h2" />
  </svg>
);

export const ShareIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export const ArSlicerIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M14.5 4l-4 4 6 6 4-4a2.83 2.83 0 0 0 0-4l-2-2a2.83 2.83 0 0 0-4 0z" />
    <path d="M10.5 8l-6 6a2 2 0 0 0 0 2.83l1.17 1.17a2 2 0 0 0 2.83 0l6-6" />
    <line x1="2" y1="2" x2="6" y2="6" />
    <line x1="18" y1="18" x2="22" y2="22" />
  </svg>
);

export const ArHunterIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="3" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="3" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="21" y2="12" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ArCatcherIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M8 13c1 2 3 2.5 4 2.5s3-.5 4-2.5" />
    <circle cx="9" cy="9.5" r="1.2" fill="currentColor" />
    <circle cx="15" cy="9.5" r="1.2" fill="currentColor" />
    <path d="M4 4l3 3" />
    <path d="M20 4l-3 3" />
  </svg>
);

export const ArBubbleIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="10" cy="13" r="7" />
    <circle cx="17.5" cy="7.5" r="4.5" />
    <circle cx="6" cy="6" r="2.5" />
    <path d="M8 10a4 4 0 0 1 4-4" />
  </svg>
);

export const ArTossIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18" />
    <path d="M3 12h18" />
    <circle cx="12" cy="12" r="5" stroke-dasharray="2 2" />
    <path d="M17 7l4-4" />
  </svg>
);

export const ArColorHuntIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
    <circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.3" />
    <path d="M19 5l2-2" />
  </svg>
);

export const ArAquariumIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M6 12c3-4 8-4 12 0-4 4-9 4-12 0z" />
    <circle cx="15" cy="11" r="1" fill="currentColor" />
    <path d="M6 12L2 9v6l4-3z" />
    <circle cx="18" cy="6" r="1.5" />
    <circle cx="21" cy="4" r="1" />
  </svg>
);

export const AiInterviewIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 7h8" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
    <circle cx="16" cy="16" r="3" />
    <path d="M16 14.5v1.5l1 1" />
  </svg>
);

export const AiWordWolfIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M12 3l4 7h5l-4 4 1.5 6L12 17l-6.5 3 1.5-6-4-4h5l4-7z" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export const MinesweeperIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="6" fill="currentColor" fill-opacity="0.2" />
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
    <path d="M4.93 4.93l2.83 2.83" />
    <path d="M16.24 16.24l2.83 2.83" />
    <path d="M4.93 19.07l2.83-2.83" />
    <path d="M16.24 7.76l2.83-2.83" />
  </svg>
);

export const SudokuIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    class={props.class}
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);

export const SokobanIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" fill-opacity="0.15" />
    <path d="M3 12h4m10 0h4" />
    <path d="M12 3v4m0 10v4" />
  </svg>
);

export const RhythmBeatsIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" fill="currentColor" fill-opacity="0.2" />
    <circle cx="18" cy="16" r="3" fill="currentColor" fill-opacity="0.2" />
  </svg>
);

export const SpeedTypingIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01" />
    <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
    <path d="M8 16h8" />
  </svg>
);

export const BombDefusalIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="11" cy="13" r="8" fill="currentColor" fill-opacity="0.15" />
    <path d="M14.5 4.5l2-2" />
    <path d="M19 2l2 2" />
    <path d="M16.5 9.5l3.5-3.5" />
    <circle cx="11" cy="13" r="3" />
  </svg>
);

export const DiskClashIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="8" cy="8" r="5" fill="currentColor" fill-opacity="0.2" />
    <circle cx="16" cy="16" r="5" fill="currentColor" fill-opacity="0.2" />
    <path d="M11.5 11.5l1 1" />
    <path d="M14 9l-4 4" />
  </svg>
);

export const PuzzleClashIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <rect x="2" y="3" width="9" height="18" rx="2" />
    <rect x="13" y="3" width="9" height="18" rx="2" />
    <path d="M5 16h3" />
    <path d="M16 12h3" />
  </svg>
);

export const SketchGuessIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    <path d="M3 21h18" />
  </svg>
);

export const WordWolfRoomIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 28}
    height={props.size || 28}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const GlobeIcon: Component<IconProps> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
