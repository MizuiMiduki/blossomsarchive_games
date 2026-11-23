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
  { level: 0, name: '金平糖', shortName: '金平糖', radius: 14, score: 2, color: '#f472b6', gradientStart: '#fbcfe8', gradientEnd: '#ec4899', textColor: '#ffffff' },
  { level: 1, name: 'マカロン', shortName: 'マカロン', radius: 18, score: 4, color: '#34d399', gradientStart: '#a7f3d0', gradientEnd: '#059669', textColor: '#ffffff' },
  { level: 2, name: 'クッキー', shortName: 'クッキー', radius: 24, score: 8, color: '#fbbf24', gradientStart: '#fef08a', gradientEnd: '#d97706', textColor: '#78350f' },
  { level: 3, name: 'プリン', shortName: 'プリン', radius: 30, score: 16, color: '#facc15', gradientStart: '#fef9c3', gradientEnd: '#ca8a04', textColor: '#713f12' },
  { level: 4, name: 'シュークリーム', shortName: 'シュー', radius: 37, score: 32, color: '#fb923c', gradientStart: '#ffedd5', gradientEnd: '#ea580c', textColor: '#ffffff' },
  { level: 5, name: 'ドーナツ', shortName: 'ドーナツ', radius: 45, score: 64, color: '#f43f5e', gradientStart: '#fecdd3', gradientEnd: '#e11d48', textColor: '#ffffff' },
  { level: 6, name: 'タルト', shortName: 'タルト', radius: 54, score: 128, color: '#818cf8', gradientStart: '#c7d2fe', gradientEnd: '#4f46e5', textColor: '#ffffff' },
  { level: 7, name: 'ショートケーキ', shortName: 'ショート', radius: 63, score: 256, color: '#fda4af', gradientStart: '#ffffff', gradientEnd: '#f43f5e', textColor: '#9f1239' },
  { level: 8, name: 'パフェ', shortName: 'パフェ', radius: 73, score: 512, color: '#c084fc', gradientStart: '#f3e8ff', gradientEnd: '#7e22ce', textColor: '#ffffff' },
  { level: 9, name: 'ホールケーキ', shortName: 'ホール', radius: 83, score: 1024, color: '#e11d48', gradientStart: '#ffe4e6', gradientEnd: '#be123c', textColor: '#ffffff' },
  { level: 10, name: 'タワーケーキ', shortName: 'タワー', radius: 94, score: 2048, color: '#f59e0b', gradientStart: '#fef08a', gradientEnd: '#b45309', textColor: '#ffffff' },
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
  let dropX = 160;
  let canDrop = true;
  let isPointerDown = false;
  const gravity = 0.38;
  const friction = 0.985;
  const bounce = 0.28;
  const deadLineY = 70;

  const rollInitialTier = () => Math.floor(Math.random() * 3); // 0~2 (金平糖, マカロン, クッキー)
  const rollNextTier = () => Math.floor(Math.random() * 4); // 0~3 (プリンまで)

  const restart = () => {
    circles = [];
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
    });

    sound.playPop(380);

    // 次のスイーツを手元へ移動
    setCurrentLevel(nextLevel());
    setNextLevel(rollNextTier());

    setTimeout(() => {
      canDrop = true;
      setCanHold(true);
    }, 600);
  };

  // スイーツの描画ルーチン
  const renderSweets = (
    ctx: CanvasRenderingContext2D,
    c: { x: number; y: number; radius: number; level: number }
  ) => {
    const s = SWEETS_TIERS[c.level];
    ctx.save();

    // タワーケーキ（レベル10）のゴージャスな発光
    if (c.level === 10) {
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
    } else if (c.level >= 8) {
      ctx.shadowColor = 'rgba(244, 63, 94, 0.4)';
      ctx.shadowBlur = 10;
    }

    // 球体（スイーツ本体）ベースグラデーション
    const grad = ctx.createRadialGradient(
      c.x - c.radius * 0.3,
      c.y - c.radius * 0.3,
      c.radius * 0.1,
      c.x,
      c.y,
      c.radius
    );
    grad.addColorStop(0, s.gradientStart);
    grad.addColorStop(1, s.gradientEnd);

    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 縁取りストローク（ふんわり柔らかいパティスリー感）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // スイーツクリッピング内部のデコレーション
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.clip();

    if (c.level === 0) {
      // 金平糖: 角砂糖のトゲトゲ星の輝き
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const px = c.x + Math.cos(angle) * (c.radius * 0.75);
        const py = c.y + Math.sin(angle) * (c.radius * 0.75);
        ctx.beginPath();
        ctx.arc(px, py, c.radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(c.x - c.radius * 0.25, c.y - c.radius * 0.25, c.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
    } else if (c.level === 1) {
      // マカロン: 中央のクリーム層＆ピエの凹凸
      ctx.fillStyle = '#fef9c3'; // ホワイトバニラクリーム
      ctx.fillRect(c.x - c.radius, c.y - c.radius * 0.18, c.radius * 2, c.radius * 0.36);
      ctx.fillStyle = 'rgba(5, 150, 105, 0.3)';
      ctx.fillRect(c.x - c.radius, c.y - c.radius * 0.25, c.radius * 2, c.radius * 0.1);
      ctx.fillRect(c.x - c.radius, c.y + c.radius * 0.15, c.radius * 2, c.radius * 0.1);
    } else if (c.level === 2) {
      // クッキー: こんがりチョコチップ
      ctx.fillStyle = '#451a03'; // ダークチョコ
      const chips = [
        [-0.35, -0.3], [0.3, -0.35], [-0.1, 0.35], [0.35, 0.25], [-0.4, 0.1], [0.05, -0.05]
      ];
      for (const [ox, oy] of chips) {
        ctx.beginPath();
        ctx.ellipse(c.x + c.radius * ox, c.y + c.radius * oy, c.radius * 0.18, c.radius * 0.14, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (c.level === 3) {
      // プリン: 上部の濃厚カラメルソース
      ctx.fillStyle = '#713f12'; // カラメル
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - c.radius * 0.45, c.radius * 0.85, c.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // カラメルの滴り
      ctx.beginPath();
      ctx.arc(c.x - c.radius * 0.35, c.y - c.radius * 0.15, c.radius * 0.18, 0, Math.PI);
      ctx.arc(c.x + c.radius * 0.25, c.y - c.radius * 0.1, c.radius * 0.2, 0, Math.PI);
      ctx.fill();
      // ちょこんとのったホイップ
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x, c.y - c.radius * 0.55, c.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 4) {
      // シュークリーム: あふれるカスタードホイップ＆粉砂糖
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.radius * 0.88, c.radius * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // パウダースノー（粉糖）
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(c.x - c.radius * 0.3, c.y - c.radius * 0.45, c.radius * 0.15, 0, Math.PI * 2);
      ctx.arc(c.x + c.radius * 0.25, c.y - c.radius * 0.5, c.radius * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 5) {
      // ドーナツ: 苺チョコアイシング & カラフルチョコスプレー
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(c.x, c.y - c.radius * 0.15, c.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      // カラフルスプリンクル
      const sprinkles = [
        { ox: -0.4, oy: -0.45, col: '#fef08a' },
        { ox: 0.3, oy: -0.4, col: '#38bdf8' },
        { ox: -0.2, oy: -0.65, col: '#ffffff' },
        { ox: 0.45, oy: -0.15, col: '#a3e635' },
        { ox: -0.5, oy: -0.15, col: '#fb923c' },
        { ox: 0.1, oy: -0.3, col: '#ffffff' }
      ];
      for (const sp of sprinkles) {
        ctx.fillStyle = sp.col;
        ctx.fillRect(c.x + c.radius * sp.ox, c.y + c.radius * sp.oy, c.radius * 0.16, c.radius * 0.08);
      }
    } else if (c.level === 6) {
      // タルト: 幾何学タルト生地リム ＆ つややかなベリー
      ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#312e81';
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const bx = c.x + Math.cos(ang) * (c.radius * 0.45);
        const by = c.y + Math.sin(ang) * (c.radius * 0.45);
        ctx.beginPath();
        ctx.arc(bx, by, c.radius * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (c.level === 7) {
      // ショートケーキ: スポンジ層 ＆ 頂上の真っ赤な苺
      ctx.fillStyle = '#fde047'; // スポンジ
      ctx.fillRect(c.x - c.radius, c.y + c.radius * 0.2, c.radius * 2, c.radius * 0.25);
      // 苺
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(c.x, c.y - c.radius * 0.45, c.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a'; // 苺のヘタ
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - c.radius * 0.68, c.radius * 0.14, c.radius * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 8) {
      // パフェ: 豪華なパフェ層 ＆ ウエハースロール
      ctx.fillStyle = 'rgba(236, 72, 153, 0.45)'; // ベリーソース層
      ctx.fillRect(c.x - c.radius, c.y + c.radius * 0.1, c.radius * 2, c.radius * 0.25);
      // 斜めウエハーススティック
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = c.radius * 0.14;
      ctx.beginPath();
      ctx.moveTo(c.x - c.radius * 0.4, c.y + c.radius * 0.4);
      ctx.lineTo(c.x + c.radius * 0.5, c.y - c.radius * 0.6);
      ctx.stroke();
      // チェリー
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(c.x - c.radius * 0.1, c.y - c.radius * 0.45, c.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.level === 9) {
      // ホールケーキ: デコレーションホイップ ＆ イチゴの円環
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // ホイップ
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const hx = c.x + Math.cos(ang) * (c.radius * 0.62);
        const hy = c.y + Math.sin(ang) * (c.radius * 0.62);
        ctx.beginPath();
        ctx.arc(hx, hy, c.radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e11d48'; // 苺
        ctx.beginPath();
        ctx.arc(hx, hy, c.radius * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      }
    } else if (c.level === 10) {
      // タワーケーキ: 豪華段ケーキ ＆ 祝祭の王冠
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(c.x - c.radius * 0.75, c.y - c.radius * 0.1, c.radius * 1.5, c.radius * 0.18);
      ctx.fillRect(c.x - c.radius * 0.5, c.y - c.radius * 0.4, c.radius * 1.0, c.radius * 0.18);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x, c.y - c.radius * 0.65, c.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(c.x, c.y - c.radius * 0.65, c.radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ドーナツの真ん中の穴（背景色でくり抜き）
    if (c.level === 5) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // スイーツ名称テキスト（視認性の高い袋文字）
    const fontSize = Math.max(9, Math.round(c.radius * 0.35));
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = c.level === 5 ? c.y + c.radius * 0.46 : (c.level === 3 ? c.y + c.radius * 0.18 : c.y);

    // テキスト縁取り（袋文字で読みやすさを極限まで高める）
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 3.2;
    ctx.strokeText(s.shortName, c.x, textY);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.shortName, c.x, textY);

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
              vy: -2,
              radius: newTier.radius,
              spawnTime: Date.now(),
            });

            setScore((s) => s + newTier.score);
            sound.playMatch(newLevel + 1);
            continue;
          }

          // 物理反発
          const overlap = minDist - dist;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          c1.x -= nx * overlap * 0.5;
          c1.y -= ny * overlap * 0.5;
          c2.x += nx * overlap * 0.5;
          c2.y += ny * overlap * 0.5;

          // 速度交換
          const kx = c1.vx - c2.vx;
          const ky = c1.vy - c2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2;
          c1.vx -= p * nx * 0.6;
          c1.vy -= p * ny * 0.6;
          c2.vx += p * nx * 0.6;
          c2.vy += p * ny * 0.6;
        }
      }
    }

    if (toRemove.size > 0) {
      circles = circles.filter((c) => !toRemove.has(c.id));
      circles.push(...toAdd);
    }

    // 3. ゲームオーバー判定（スポーン後2秒以上経過し、静止していてデッドラインを超えているもの）
    const now = Date.now();
    for (const c of circles) {
      if (now - c.spawnTime > 2000 && Math.abs(c.vy) < 0.25 && c.y - c.radius < deadLineY) {
        setIsGameOver(true);
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
    }

    // --- 4. 描画 ---
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

    // 落下予定ガイド線 & 現在のスイーツプレビュー
    if (canDrop) {
      const cur = SWEETS_TIERS[currentLevel()];
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dropX, 40);
      ctx.lineTo(dropX, canvasRef.height);
      ctx.stroke();

      renderSweets(ctx, {
        x: dropX,
        y: 35,
        radius: cur.radius,
        level: currentLevel(),
      });
    }

    // 落下済みスイーツの描画
    for (const c of circles) {
      renderSweets(ctx, c);
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
    '画面をドラッグ（またはマウス移動）して落とす位置を調整し、指を離すとスイーツが落下します。',
    '同じ種類のスイーツがぶつかるとマージし、より大きくて豪華なスイーツへと進化します。',
    '【HOLD機能】「HOLD」ボタンまたは Shift / C キーで現在狙っているスイーツを一時キープ可能（1手につき1回）。ピンチの切り札に活用しましょう。',
    '進化順: 金平糖 → マカロン → クッキー → プリン → シュークリーム → ドーナツ → タルト → ショートケーキ → パフェ → ホールケーキ → タワーケーキ',
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
                class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full inline-block shadow-2xs border border-black/10"
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
            class={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs transition-all shadow-2xs select-none ${
              canHold() && !isGameOver()
                ? 'bg-white/95 dark:bg-slate-900/95 border-pink-200 dark:border-pink-900/60 hover:border-pink-400 active:scale-95 cursor-pointer text-pink-700 dark:text-pink-300'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed text-slate-400'
            }`}
            title="ホールド (Shiftキー / Cキー / クリック)"
          >
            <span class="font-bold">HOLD</span>
            <Show
              when={heldLevel() !== null}
              fallback={<span class="text-slate-400 dark:text-slate-500 italic text-[11px]">(空)</span>}
            >
              <div class="flex items-center gap-1.5">
                <span
                  class="w-3.5 h-3.5 rounded-full inline-block shadow-2xs border border-black/10 dark:border-white/20"
                  style={{ 'background-color': SWEETS_TIERS[heldLevel()!].color }}
                />
                <span class="font-bold text-slate-800 dark:text-slate-200">
                  {SWEETS_TIERS[heldLevel()!].name}
                </span>
              </div>
            </Show>
          </button>

          {/* NEXT表示 */}
          <div class="flex items-center gap-2 px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <span class="text-slate-500 font-medium">NEXT:</span>
            <span
              class="w-3.5 h-3.5 rounded-full inline-block shadow-2xs border border-black/10 dark:border-white/20"
              style={{ 'background-color': SWEETS_TIERS[nextLevel()].color }}
            />
            <span class="font-bold text-slate-700 dark:text-slate-300">
              {SWEETS_TIERS[nextLevel()].name}
            </span>
          </div>
        </div>

        {/* 落下ボックス (Canvas) */}
        <div
          class="w-full aspect-[3/4] max-h-[calc(100dvh-130px)] bg-slate-950 rounded-3xl overflow-hidden shadow-xl border-4 border-pink-700/40 dark:border-pink-900/50 relative cursor-crosshair select-none touch-none"
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
