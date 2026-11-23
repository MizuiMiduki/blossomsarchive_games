import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

export interface SweetsType {
  level: number;
  name: string;
  shortName: string;
  radius: number;
  score: number;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
}

export const SWEETS_TIERS: SweetsType[] = [
  { level: 0, name: '金平糖', shortName: '金平糖', radius: 15, score: 2, color: '#f472b6', gradientStart: '#fce7f3', gradientEnd: '#ec4899', textColor: '#ffffff' },
  { level: 1, name: 'マカロン', shortName: 'マカロン', radius: 20, score: 4, color: '#34d399', gradientStart: '#d1fae5', gradientEnd: '#10b981', textColor: '#ffffff' },
  { level: 2, name: 'クッキー', shortName: 'クッキー', radius: 26, score: 8, color: '#fbbf24', gradientStart: '#fef3c7', gradientEnd: '#d97706', textColor: '#78350f' },
  { level: 3, name: 'プリン', shortName: 'プリン', radius: 33, score: 16, color: '#facc15', gradientStart: '#fef9c3', gradientEnd: '#ca8a04', textColor: '#713f12' },
  { level: 4, name: 'シュークリーム', shortName: 'シュー', radius: 41, score: 32, color: '#fb923c', gradientStart: '#ffedd5', gradientEnd: '#ea580c', textColor: '#ffffff' },
  { level: 5, name: 'ドーナツ', shortName: 'ドーナツ', radius: 49, score: 64, color: '#f43f5e', gradientStart: '#ffe4e6', gradientEnd: '#e11d48', textColor: '#ffffff' },
  { level: 6, name: 'タルト', shortName: 'タルト', radius: 58, score: 128, color: '#818cf8', gradientStart: '#e0e7ff', gradientEnd: '#4f46e5', textColor: '#ffffff' },
  { level: 7, name: 'ショートケーキ', shortName: 'ショート', radius: 68, score: 256, color: '#fda4af', gradientStart: '#ffffff', gradientEnd: '#f43f5e', textColor: '#9f1239' },
  { level: 8, name: 'パフェ', shortName: 'パフェ', radius: 78, score: 512, color: '#c084fc', gradientStart: '#f3e8ff', gradientEnd: '#7e22ce', textColor: '#ffffff' },
  { level: 9, name: 'ホールケーキ', shortName: 'ホール', radius: 89, score: 1024, color: '#e11d48', gradientStart: '#ffe4e6', gradientEnd: '#be123c', textColor: '#ffffff' },
  { level: 10, name: 'ロイヤルタワー', shortName: 'タワー', radius: 100, score: 2048, color: '#f59e0b', gradientStart: '#fef08a', gradientEnd: '#b45309', textColor: '#ffffff' },
];

export const PLANET_TIERS = SWEETS_TIERS;

interface Circle {
  id: number;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spawnTime: number;
  scaleAnim: number; // 合体時のポップアニメーション用スケール (1.0 -> 1.25 -> 1.0)
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'star' | 'heart';
}

let circleIdCounter = 1;

export const BlossomDropGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [currentLevel, setCurrentLevel] = createSignal(0);
  const [nextLevel, setNextLevel] = createSignal(1);
  const [heldLevel, setHeldLevel] = createSignal<number | null>(null);
  const [canHold, setCanHold] = createSignal(true);
  const [isGameOver, setIsGameOver] = createSignal(false);

  let canvasRef: HTMLCanvasElement | undefined;
  let animationId: number | null = null;

  // 物理ワールド
  let circles: Circle[] = [];
  let particles: Particle[] = [];
  let dropX = 160;
  let canDrop = true;
  let isPointerDown = false;
  const gravity = 0.38;
  const friction = 0.985;
  const bounce = 0.28;
  const deadLineY = 70;

  const rollInitialTier = () => Math.floor(Math.random() * 3); // 0~2 (金平糖, マカロン, クッキー)
  const rollNextTier = () => Math.floor(Math.random() * 4); // 0~3 (プリンまで)

  const spawnMergeParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.0,
        color: Math.random() < 0.6 ? color : '#fef08a',
        size: 3 + Math.random() * 4,
        life: 1.0,
        maxLife: 20 + Math.random() * 15,
        shape: Math.random() < 0.4 ? 'star' : 'circle',
      });
    }
  };

  const restart = () => {
    circles = [];
    particles = [];
    dropX = 160;
    canDrop = true;
    isPointerDown = false;
    setScore(0);
    setCurrentLevel(rollInitialTier());
    setNextLevel(rollNextTier());
    setHeldLevel(null);
    setCanHold(true);
    setIsGameOver(false);
    loop();
  };

  const handleHold = () => {
    if (!canHold() || isGameOver() || !canDrop) return;
    const cur = currentLevel();
    const held = heldLevel();

    if (held === null) {
      setHeldLevel(cur);
      setCurrentLevel(nextLevel());
      setNextLevel(rollNextTier());
    } else {
      setHeldLevel(cur);
      setCurrentLevel(held);
    }
    setCanHold(false);
    sound.playPop(620);
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (isGameOver()) return;
    isPointerDown = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    handlePointerMove(e.clientX);
  };

  const handlePointerMove = (clientX: number) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvasRef.width;
    const cur = SWEETS_TIERS[currentLevel()];
    dropX = Math.max(cur.radius + 6, Math.min(canvasRef.width - cur.radius - 6, x));
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    handlePointerMove(e.clientX);
    handleDrop();
  };

  const handlePointerCancel = (e: PointerEvent) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleDrop = () => {
    if (!canDrop || isGameOver() || !canvasRef) return;
    canDrop = false;

    const tier = SWEETS_TIERS[currentLevel()];
    circles.push({
      id: circleIdCounter++,
      level: currentLevel(),
      x: dropX,
      y: 40,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 1.5,
      radius: tier.radius,
      spawnTime: Date.now(),
      scaleAnim: 1.0,
    });

    sound.playPop(380);

    // 次のスイーツを手元へ移動
    setCurrentLevel(nextLevel());
    setNextLevel(rollNextTier());

    setTimeout(() => {
      canDrop = true;
      setCanHold(true);
    }, 450);
  };

  // 愛嬌たっぷりの顔を描画するヘルパー
  const drawCuteFace = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    level: number,
    scaleAnim: number
  ) => {
    const eyeSize = Math.max(2, r * 0.11);
    const eyeSpread = r * 0.35;
    const eyeY = cy - r * 0.05;

    // ほっぺた（ピンクのふんわりチーク）
    ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - eyeSpread - eyeSize * 0.8, eyeY + r * 0.22, eyeSize * 1.5, eyeSize * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + eyeSpread + eyeSize * 0.8, eyeY + r * 0.22, eyeSize * 1.5, eyeSize * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 瞳のスタイル
    if (scaleAnim > 1.05) {
      // 合体直後は星目 (★ ★)
      ctx.fillStyle = '#fef08a';
      for (const ex of [cx - eyeSpread, cx + eyeSpread]) {
        drawStar(ctx, ex, eyeY, eyeSize * 1.6);
      }
    } else if (level === 1 || level === 5) {
      // マカロン・ドーナツ: ウィンク顔 (^_~)
      // 左目: パッチリ黒目
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(cx - eyeSpread, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - eyeSpread - eyeSize * 0.35, eyeY - eyeSize * 0.35, eyeSize * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // 右目: ウィンク (⌒)
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = Math.max(1.8, eyeSize * 0.4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx + eyeSpread, eyeY + eyeSize * 0.3, eyeSize * 1.1, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (level === 8 || level === 10) {
      // パフェ・タワーケーキ: キラキラ瞳
      for (const ex of [cx - eyeSpread, cx + eyeSpread]) {
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeSize * 1.15, 0, Math.PI * 2);
        ctx.fill();
        // ハイライト2つ
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - eyeSize * 0.4, eyeY - eyeSize * 0.4, eyeSize * 0.55, 0, Math.PI * 2);
        ctx.arc(ex + eyeSize * 0.35, eyeY + eyeSize * 0.35, eyeSize * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // 通常のつぶらなパッチリ瞳
      for (const ex of [cx - eyeSpread, cx + eyeSpread]) {
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        // 白ハイライト
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - eyeSize * 0.35, eyeY - eyeSize * 0.35, eyeSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 口のスタイル
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = Math.max(1.5, eyeSize * 0.35);
    ctx.lineCap = 'round';

    if (level === 3 || level === 7) {
      // プリン・ショートケーキ: 幸せな開いたお口 (D)
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(cx, eyeY + r * 0.22, eyeSize * 0.9, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (level === 5) {
      // ドーナツ: ペロッと舌出し
      ctx.beginPath();
      ctx.arc(cx, eyeY + r * 0.2, eyeSize * 0.7, 0, Math.PI);
      ctx.stroke();
      // 舌
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(cx + eyeSize * 0.2, eyeY + r * 0.28, eyeSize * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // にっこり微笑み (∪)
      ctx.beginPath();
      ctx.arc(cx, eyeY + r * 0.16, eyeSize * 0.75, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const ai = a + Math.PI / 5;
      const x1 = cx + Math.cos(a) * r;
      const y1 = cy + Math.sin(a) * r;
      const x2 = cx + Math.cos(ai) * (r * 0.45);
      const y2 = cy + Math.sin(ai) * (r * 0.45);
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
  };

  // スイーツごとのリッチな固有アート描画
  const renderSweets = (
    ctx: CanvasRenderingContext2D,
    c: { x: number; y: number; radius: number; level: number; scaleAnim?: number }
  ) => {
    const s = SWEETS_TIERS[c.level];
    const scale = c.scaleAnim || 1.0;
    const r = c.radius * scale;

    ctx.save();
    ctx.translate(c.x, c.y);

    // 高級スイーツのやわらかな影（アンビエントシャドウ）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.88, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // タワーケーキやパフェのオーラ発光
    if (c.level === 10) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
    } else if (c.level >= 8) {
      ctx.shadowColor = 'rgba(244, 63, 94, 0.35)';
      ctx.shadowBlur = 10;
    }

    // 球体ベースグラデーション（ふっくら立体感）
    const grad = ctx.createRadialGradient(-r * 0.32, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, s.gradientStart);
    grad.addColorStop(0.85, s.color);
    grad.addColorStop(1, s.gradientEnd);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0; // シャドウリセット

    // クリップ領域（スイーツの内部デコレーション）
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // --- スイーツごとの固有テクスチャ・トッピング ---
    if (c.level === 0) {
      // 金平糖: 角砂糖の星の突起
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const px = Math.cos(angle) * (r * 0.72);
        const py = Math.sin(angle) * (r * 0.72);
        ctx.beginPath();
        ctx.arc(px, py, r * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (c.level === 1) {
      // マカロン: 中央の波打つ濃厚バニラクリーム層
      ctx.fillStyle = '#fef9c3'; // ガナッシュクリーム
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      // 上下のピエ（焼きひだ）
      ctx.fillStyle = 'rgba(5, 150, 105, 0.25)';
      ctx.fillRect(-r, -r * 0.22, r * 2, r * 0.08);
      ctx.fillRect(-r, r * 0.14, r * 2, r * 0.08);
    } else if (c.level === 2) {
      // クッキー: 焼き目とチョコチップ
      ctx.fillStyle = '#451a03'; // ダークチョコチップ
      const chips = [
        [-0.45, -0.4], [0.38, -0.42], [-0.15, 0.42], [0.42, 0.3], [-0.48, 0.12], [0.1, -0.05]
      ];
      for (const [ox, oy] of chips) {
        ctx.beginPath();
        ctx.ellipse(r * ox, r * oy, r * 0.16, r * 0.13, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (c.level === 3) {
      // プリン: とろ〜り濃厚カラメルソース＆ホイップ
      ctx.fillStyle = '#713f12'; // ビターカラメル
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.48, r * 0.88, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // 垂れるカラメル
      ctx.beginPath();
      ctx.arc(-r * 0.4, -r * 0.16, r * 0.2, 0, Math.PI);
      ctx.arc(r * 0.32, -r * 0.12, r * 0.22, 0, Math.PI);
      ctx.fill();
      // ホイップクリーム
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -r * 0.58, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // チェリー（さくらんぼ）
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(r * 0.08, -r * 0.72, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 4) {
      // シュークリーム: あふれるカスタード＆粉砂糖
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.92, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // 粉砂糖（パウダースノー）
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.45, r * 0.18, 0, Math.PI * 2);
      ctx.arc(r * 0.3, -r * 0.5, r * 0.2, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.6, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 5) {
      // ドーナツ: 苺チョコアイシング & カラフルチョコスプレー
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      // スプリンクル
      const sprinkles = [
        { ox: -0.45, oy: -0.5, col: '#fef08a' },
        { ox: 0.35, oy: -0.45, col: '#38bdf8' },
        { ox: -0.22, oy: -0.7, col: '#ffffff' },
        { ox: 0.5, oy: -0.15, col: '#a3e635' },
        { ox: -0.55, oy: -0.12, col: '#fb923c' },
        { ox: 0.12, oy: -0.35, col: '#ffffff' }
      ];
      for (const sp of sprinkles) {
        ctx.fillStyle = sp.col;
        ctx.fillRect(r * sp.ox, r * sp.oy, r * 0.15, r * 0.08);
      }
    } else if (c.level === 6) {
      // タルト: 濃厚ブルーベリー＆タルト縁
      ctx.fillStyle = '#312e81';
      for (let i = 0; i < 7; i++) {
        const ang = (i * Math.PI * 2) / 7;
        const bx = Math.cos(ang) * (r * 0.52);
        const by = Math.sin(ang) * (r * 0.52);
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(bx - r * 0.04, by - r * 0.04, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#312e81';
      }
    } else if (c.level === 7) {
      // ショートケーキ: スポンジ層と苺
      ctx.fillStyle = '#fef08a'; // スポンジ
      ctx.fillRect(-r, r * 0.28, r * 2, r * 0.25);
      // 完熟大粒いちご
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(0, -r * 0.48, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      // いちごのつぶつぶ
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-r * 0.08, -r * 0.48, r * 0.04, r * 0.04);
      ctx.fillRect(r * 0.08, -r * 0.44, r * 0.04, r * 0.04);
      // ヘタ
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.74, r * 0.16, r * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 8) {
      // パフェ: ベリー層 & ウエハースロール
      ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.fillRect(-r, r * 0.2, r * 2, r * 0.26);
      // ウエハーススティック
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, r * 0.45);
      ctx.lineTo(r * 0.55, -r * 0.65);
      ctx.stroke();
      // チェリー
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.48, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 9) {
      // ホールケーキ: ホイップとイチゴの王冠
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const hx = Math.cos(ang) * (r * 0.68);
        const hy = Math.sin(ang) * (r * 0.68);
        ctx.beginPath();
        ctx.arc(hx, hy, r * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(hx, hy, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      }
    } else if (c.level === 10) {
      // ロイヤルタワー: 3段ケーキと黄金のティアラクラウン
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-r * 0.8, -r * 0.05, r * 1.6, r * 0.18);
      ctx.fillRect(-r * 0.55, -r * 0.35, r * 1.1, r * 0.18);
      // 黄金ティアラ
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.6);
      ctx.lineTo(-r * 0.2, -r * 0.8);
      ctx.lineTo(0, -r * 0.65);
      ctx.lineTo(r * 0.2, -r * 0.8);
      ctx.lineTo(r * 0.3, -r * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore(); // クリップ解除

    // ドーナツの中央の穴（本物のドーナツらしく穴をあける）
    if (c.level === 5) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#020617'; // 背景色
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 球体のツヤハイライト（ぷるんとしたスペキュラ光）
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.26, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.55, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
    ctx.restore();

    // 愛らしいキャラクターの顔を描画（ダサい文字の代わりに可愛い表情！）
    drawCuteFace(ctx, 0, 0, r, c.level, scale);

    // 外枠のエレガントなストローク
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    // 1. 物理演算
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      c.vy += gravity;
      c.vx *= friction;
      c.vy *= friction;
      c.x += c.vx;
      c.y += c.vy;

      // ポップアニメーションの減衰
      if (c.scaleAnim > 1.0) {
        c.scaleAnim = Math.max(1.0, c.scaleAnim - 0.035);
      }

      // 壁・底との衝突
      if (c.x - c.radius < 0) {
        c.x = c.radius;
        c.vx = -c.vx * bounce;
      } else if (c.x + c.radius > canvasRef.width) {
        c.x = canvasRef.width - c.radius;
        c.vx = -c.vx * bounce;
      }

      if (c.y + c.radius > canvasRef.height) {
        c.y = canvasRef.height - c.radius;
        c.vy = -c.vy * bounce;
      }
    }

    // 2. 円同士の衝突＆マージ判定
    const toRemove = new Set<number>();
    const toAdd: Circle[] = [];

    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const c1 = circles[i];
        const c2 = circles[j];
        if (toRemove.has(c1.id) || toRemove.has(c2.id)) continue;

        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = c1.radius + c2.radius;

        if (dist < minDist) {
          // 同じ種類ならマージ！
          if (c1.level === c2.level && c1.level < SWEETS_TIERS.length - 1) {
            toRemove.add(c1.id);
            toRemove.add(c2.id);

            const newLevel = c1.level + 1;
            const newTier = SWEETS_TIERS[newLevel];
            const mx = (c1.x + c2.x) / 2;
            const my = (c1.y + c2.y) / 2;

            toAdd.push({
              id: circleIdCounter++,
              level: newLevel,
              x: mx,
              y: my,
              vx: (c1.vx + c2.vx) * 0.5,
              vy: -2.5,
              radius: newTier.radius,
              spawnTime: Date.now(),
              scaleAnim: 1.3, // ポップアニメーション
            });

            // マージパーティクルとサウンド
            spawnMergeParticles(mx, my, newTier.color);
            setScore((s) => s + newTier.score);
            sound.playMatch(newLevel + 1);

            if (navigator.vibrate) {
              try {
                navigator.vibrate(newLevel >= 6 ? [40, 30, 60] : 35);
              } catch (_) {}
            }
          } else {
            // 通常の弾性反発衝突
            const overlap = minDist - dist;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            c1.x -= nx * overlap * 0.5;
            c1.y -= ny * overlap * 0.5;
            c2.x += nx * overlap * 0.5;
            c2.y += ny * overlap * 0.5;

            const kx = c1.vx - c2.vx;
            const ky = c1.vy - c2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            c1.vx -= p * nx * 0.8;
            c1.vy -= p * ny * 0.8;
            c2.vx += p * nx * 0.8;
            c2.vy += p * ny * 0.8;
          }
        }
      }
    }

    if (toRemove.size > 0) {
      circles = circles.filter((c) => !toRemove.has(c.id));
      circles.push(...toAdd);
    }

    // 3. パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // わずかな重力
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // 4. ゲームオーバー判定 (静止状態でデッドラインを超過)
    for (const c of circles) {
      if (Date.now() - c.spawnTime > 1500 && c.y - c.radius < deadLineY && Math.abs(c.vy) < 0.3) {
        sound.playGameOver();
        setIsGameOver(true);
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
    }

    // --- 5. 描画 ---
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

    // デッドライン点線
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, deadLineY);
    ctx.lineTo(canvasRef.width, deadLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 落下予定ガイド線 & 手元のスイーツプレビュー
    if (canDrop) {
      const cur = SWEETS_TIERS[currentLevel()];
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dropX, 42);
      ctx.lineTo(dropX, canvasRef.height);
      ctx.stroke();
      ctx.setLineDash([]);

      renderSweets(ctx, {
        x: dropX,
        y: 36,
        radius: cur.radius,
        level: currentLevel(),
      });
    }

    // 落下済みスイーツの描画
    for (const c of circles) {
      renderSweets(ctx, c);
    }

    // パーティクルの描画
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.shape === 'star') {
        drawStar(ctx, p.x, p.y, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    animationId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    restart();

    // キーボード操作対応
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver()) return;
      if (e.code === 'KeyC' || e.key === 'Shift') {
        e.preventDefault();
        handleHold();
      } else if (e.code === 'Space' || e.code === 'ArrowDown') {
        e.preventDefault();
        handleDrop();
      } else if (e.code === 'ArrowLeft') {
        dropX = Math.max(20, dropX - 15);
      } else if (e.code === 'ArrowRight') {
        if (canvasRef) {
          dropX = Math.min(canvasRef.width - 20, dropX + 15);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    });
  });

  const instructions = [
    '画面をドラッグ（またはマウス移動）して落とす位置を調整し、指を離すと可愛いスイーツが落下します。',
    '同じ種類のスイーツがぶつかるとマージし、より大きくて豪華なスイーツへと進化します。',
    '【HOLD機能】「HOLD」ボタンまたは Shift / C キーで現在狙っているスイーツを一時キープ可能（1手につき1回）。',
    '進化順: 金平糖 → マカロン → クッキー → プリン → シュークリーム → ドーナツ → タルト → ショートケーキ → パフェ → ホールケーキ → ロイヤルタワー',
  ];

  return (
    <GameShell
      id="blossom-drop"
      title="Sweets Drop"
      score={score()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        /* 進化ツリー順一覧プレビュー */
        <div class="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto py-1 px-2 max-w-full text-[10px] select-none text-slate-500">
          <span class="font-bold text-[9px] text-slate-400 shrink-0">進化順:</span>
          {SWEETS_TIERS.map((t, idx) => (
            <div class="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <span
                class="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full inline-block shadow-xs border border-white/40"
                style={{ 'background-color': t.color }}
                title={`${idx + 1}. ${t.name}`}
              />
              <span class="text-[9px] sm:text-[10px] font-medium hidden sm:inline">{t.name}</span>
              {idx < SWEETS_TIERS.length - 1 && <span class="text-[8px] text-slate-300 dark:text-slate-600">→</span>}
            </div>
          ))}
        </div>
      }
    >
      <div class="w-full max-w-[420px] max-h-full flex flex-col items-center justify-center min-h-0 flex-1">
        {/* 上部ステータスバー: HOLD & NEXT */}
        <div class="flex items-center justify-between gap-2 w-full mb-1.5 shrink-0 px-1">
          {/* HOLDボタン */}
          <button
            onClick={handleHold}
            disabled={!canHold() || isGameOver()}
            class={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs transition-all shadow-xs select-none ${
              canHold() && !isGameOver()
                ? 'bg-white/95 dark:bg-slate-900/95 border-pink-200 dark:border-pink-900/60 hover:border-pink-400 active:scale-95 cursor-pointer text-pink-700 dark:text-pink-300'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed text-slate-400'
            }`}
            title="ホールド (Shiftキー / Cキー / クリック)"
          >
            <span class="font-extrabold text-[11px] bg-pink-100 dark:bg-pink-950/80 px-1.5 py-0.5 rounded-md text-pink-600 dark:text-pink-400">HOLD</span>
            <Show
              when={heldLevel() !== null}
              fallback={<span class="text-slate-400 dark:text-slate-500 italic text-[11px]">(空)</span>}
            >
              <div class="flex items-center gap-1.5">
                <span
                  class="w-4 h-4 rounded-full inline-block shadow-xs border border-white/30"
                  style={{ 'background-color': SWEETS_TIERS[heldLevel()!].color }}
                />
                <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {SWEETS_TIERS[heldLevel()!].name}
                </span>
              </div>
            </Show>
          </button>

          {/* NEXT表示 */}
          <div class="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <span class="text-slate-400 font-bold text-[11px]">NEXT:</span>
            <span
              class="w-4 h-4 rounded-full inline-block shadow-xs border border-white/30"
              style={{ 'background-color': SWEETS_TIERS[nextLevel()].color }}
            />
            <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">
              {SWEETS_TIERS[nextLevel()].name}
            </span>
          </div>
        </div>

        {/* 落下ボックス (Canvas) */}
        <div
          class="w-full aspect-[3/4] max-h-[calc(100dvh-130px)] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-4 border-pink-700/40 dark:border-pink-900/50 relative cursor-crosshair select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => handlePointerMove(e.clientX)}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <canvas
            ref={canvasRef}
            width={320}
            height={430}
            class="w-full h-full block"
          />
        </div>
      </div>
    </GameShell>
  );
};