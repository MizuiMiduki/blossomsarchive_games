import { Component, createSignal, onSettled, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RotorObstacle {
  cx: number;
  cy: number;
  length: number;
  angle: number;
  speed: number;
}

interface StageData {
  start: { x: number; y: number };
  goal: { x: number; y: number; r: number };
  walls: WallRect[];
  rotors: RotorObstacle[];
}

const STAGES: StageData[] = [
  // Stage 1: 直角カーブ & 基本コース
  {
    start: { x: 50, y: 180 },
    goal: { x: 430, y: 180, r: 24 },
    walls: [
      // 上下外壁
      { x: 0, y: 0, w: 480, h: 20 },
      { x: 0, y: 340, w: 480, h: 20 },
      // コース内壁
      { x: 120, y: 20, w: 20, h: 220 },
      { x: 220, y: 120, w: 20, h: 220 },
      { x: 320, y: 20, w: 20, h: 220 },
    ],
    rotors: [],
  },
  // Stage 2: 回転バー登場
  {
    start: { x: 40, y: 60 },
    goal: { x: 430, y: 300, r: 24 },
    walls: [
      { x: 0, y: 0, w: 480, h: 20 },
      { x: 0, y: 340, w: 480, h: 20 },
      { x: 160, y: 140, w: 160, h: 80 },
      { x: 80, y: 180, w: 30, h: 160 },
      { x: 370, y: 20, w: 30, h: 160 },
    ],
    rotors: [
      { cx: 240, cy: 80, length: 45, angle: 0, speed: 0.035 },
      { cx: 240, cy: 280, length: 45, angle: Math.PI / 2, speed: -0.035 },
    ],
  },
  // Stage 3: 電撃クレイジー迷路
  {
    start: { x: 40, y: 40 },
    goal: { x: 440, y: 320, r: 22 },
    walls: [
      { x: 0, y: 0, w: 480, h: 15 },
      { x: 0, y: 345, w: 480, h: 15 },
      { x: 90, y: 15, w: 20, h: 260 },
      { x: 180, y: 85, w: 20, h: 260 },
      { x: 270, y: 15, w: 20, h: 260 },
      { x: 360, y: 85, w: 20, h: 260 },
    ],
    rotors: [
      { cx: 135, cy: 300, length: 32, angle: 0, speed: 0.05 },
      { cx: 225, cy: 60, length: 32, angle: 0, speed: -0.05 },
      { cx: 315, cy: 300, length: 32, angle: 0, speed: 0.055 },
    ],
  },
];

export const WireMazeGame: Component = () => {
  const [currentStageIdx, setCurrentStageIdx] = createSignal(0);
  const [gameState, setGameState] = createSignal<'ready' | 'playing' | 'spark' | 'cleared'>('ready');
  const [timeScore, setTimeScore] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

  let canvasRef: HTMLCanvasElement | undefined;
  let animId: number | null = null;
  let probeX = 50;
  let probeY = 180;
  let probeRadius = 7;
  let startTime = 0;
  let stageTimer = 0;
  let rotorsState: RotorObstacle[] = [];
  let sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  const stage = () => STAGES[currentStageIdx()];

  const initStage = (idx: number) => {
    setCurrentStageIdx(idx);
    const s = STAGES[idx];
    probeX = s.start.x;
    probeY = s.start.y;
    rotorsState = s.rotors.map((r) => ({ ...r }));
    sparks = [];
    setGameState('ready');
    setIsGameOver(false);
    setIsVictory(false);
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvasRef.width;
    const y = ((clientY - rect.top) / rect.height) * canvasRef.height;

    // スタート地点付近を押したときに開始
    const s = stage();
    const distToStart = Math.hypot(x - s.start.x, y - s.start.y);

    if (distToStart < 35) {
      probeX = s.start.x;
      probeY = s.start.y;
      startTime = Date.now();
      setGameState('playing');
      sound.playPop(520);
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (gameState() !== 'playing' || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvasRef.width;
    const y = ((clientY - rect.top) / rect.height) * canvasRef.height;

    // 急激なワープを制限 (壁抜け防止)
    const dx = x - probeX;
    const dy = y - probeY;
    const dist = Math.hypot(dx, dy);
    if (dist > 30) {
      triggerSpark(probeX, probeY);
      return;
    }

    probeX = x;
    probeY = y;
  };

  const triggerSpark = (x: number, y: number) => {
    setGameState('spark');
    sound.playGameOver();

    // 火花パーティクル生成
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 15,
      });
    }

    setTimeout(() => {
      initStage(currentStageIdx());
    }, 900);
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.width;
    const h = canvasRef.height;
    const current = stage();

    // 画面クリア
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    // 回転障害物の更新
    if (gameState() === 'playing') {
      stageTimer = Math.floor((Date.now() - startTime) / 100);
      setTimeScore((currentStageIdx() + 1) * 1000 - stageTimer * 10);

      for (const rotor of rotorsState) {
        rotor.angle += rotor.speed;
      }

      // 1. 壁との衝突判定
      for (const wall of current.walls) {
        if (
          probeX + probeRadius > wall.x &&
          probeX - probeRadius < wall.x + wall.w &&
          probeY + probeRadius > wall.y &&
          probeY - probeRadius < wall.y + wall.h
        ) {
          triggerSpark(probeX, probeY);
          break;
        }
      }

      // 2. 回転障害物との衝突判定
      for (const rotor of rotorsState) {
        const ex = rotor.cx + Math.cos(rotor.angle) * rotor.length;
        const ey = rotor.cy + Math.sin(rotor.angle) * rotor.length;
        const dist = distToSegment(probeX, probeY, rotor.cx, rotor.cy, ex, ey);
        if (dist < probeRadius + 4) {
          triggerSpark(probeX, probeY);
          break;
        }
      }

      // 3. ゴール判定
      const distToGoal = Math.hypot(probeX - current.goal.x, probeY - current.goal.y);
      if (distToGoal < current.goal.r) {
        sound.playVictory();
        if (currentStageIdx() < STAGES.length - 1) {
          initStage(currentStageIdx() + 1);
        } else {
          setGameState('cleared');
          setIsVictory(true);
        }
      }
    }

    // 壁の描画 (電撃フェンス)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    for (const wall of current.walls) {
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

      // 電撃ワイヤーのハイライト
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wall.x, wall.y);
      ctx.lineTo(wall.x + wall.w, wall.y);
      ctx.stroke();
    }

    // 回転障害物の描画
    for (const rotor of rotorsState) {
      const ex = rotor.cx + Math.cos(rotor.angle) * rotor.length;
      const ey = rotor.cy + Math.sin(rotor.angle) * rotor.length;

      // 軸
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(rotor.cx, rotor.cy, 5, 0, Math.PI * 2);
      ctx.fill();

      // バー
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rotor.cx, rotor.cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // 先端のスパーク
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // スタート地点
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(current.start.x, current.start.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', current.start.x, current.start.y);

    // ゴール地点
    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(current.goal.x, current.goal.y, current.goal.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('GOAL', current.goal.x, current.goal.y);

    // プローブ（操作球）の描画
    ctx.fillStyle = gameState() === 'spark' ? '#ef4444' : '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(probeX, probeY, probeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // スパークパーティクル
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= 1;

      ctx.fillStyle = Math.random() < 0.5 ? '#fde047' : '#ef4444';
      ctx.fillRect(sp.x, sp.y, 2.5, 2.5);

      if (sp.life <= 0) sparks.splice(i, 1);
    }

    animId = requestAnimationFrame(loop);
  };

  // 線分と点との距離計算
  function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  const restart = () => {
    sound.playPop(500);
    initStage(0);
  };

  onSettled(() => {
    initStage(0);
    animId = requestAnimationFrame(loop);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  });

  const instructions = [
    '【電撃イライラ棒】壁やトラップに触れずにSTARTからGOALへ運ぶマウスアクションです。',
    '【START】の青い丸をタップ/ドラッグしたまま、コースを慎重に進んでください。',
    '壁や赤い回転バーにわずかでも接触すると即爆発！全3ステージ制覇を目指そう！',
  ];

  return (
    <GameShell
      id="wire-maze"
      title="Wire Maze (イライラ棒)"
      score={Math.max(0, timeScore())}
      isGameOver={isGameOver()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-md px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-500 font-semibold">ステージ:</span>
            <span class="font-bold text-slate-800 dark:text-slate-100">
              {currentStageIdx() + 1} / {STAGES.length}
            </span>
          </div>
          <div class="text-[11px] font-semibold text-slate-500">
            {gameState() === 'ready'
              ? 'STARTを押しながら進んでください'
              : gameState() === 'playing'
              ? '集中して進め！'
              : '感電！'}
          </div>
        </div>
      }
    >
      <div
        class="w-full max-w-[480px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative select-none touch-none bg-slate-950 cursor-crosshair"
        onPointerDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onPointerMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onPointerUp={() => {
          if (gameState() === 'playing') {
            triggerSpark(probeX, probeY);
          }
        }}
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          class="w-full h-full block"
        />

        {/* スタート案内 */}
        <Show when={gameState() === 'ready'}>
          <div class="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white/90 text-[11px] font-semibold border border-white/10 shadow-lg whitespace-nowrap animate-pulse">
            START丸を押したままドラッグして進んでください
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
