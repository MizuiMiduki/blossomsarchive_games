import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
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
      { x: 0, y: 0, w: 480, h: 20 },
      { x: 0, y: 340, w: 480, h: 20 },
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

type ControlMode = 'relative' | 'offset' | 'dpad' | 'direct';

export const WireMazeGame: Component = () => {
  const [currentStageIdx, setCurrentStageIdx] = createSignal(0);
  const [gameState, setGameState] = createSignal<'ready' | 'playing' | 'paused' | 'spark' | 'cleared'>('ready');
  const [timeScore, setTimeScore] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [controlMode, setControlMode] = createSignal<ControlMode>('relative');

  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let animId: number | null = null;
  let isRunning = true;

  let probeX = 50;
  let probeY = 180;
  const probeRadius = 6.5;

  let startTime = 0;
  let elapsedTime = 0;
  let stageTimer = 0;
  let rotorsState: RotorObstacle[] = [];
  let sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

  // タッチ操作用内部トラッキング
  let isPointerActive = false;
  let lastClientX = 0;
  let lastClientY = 0;
  let touchAnchorCanvasX: number | null = null;
  let touchAnchorCanvasY: number | null = null;

  // 十字キー / D-Pad 状態
  const dpadState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  const stage = () => STAGES[currentStageIdx()];

  const initStage = (idx: number) => {
    setCurrentStageIdx(idx);
    const s = STAGES[idx];
    probeX = s.start.x;
    probeY = s.start.y;
    rotorsState = s.rotors.map((r) => ({ ...r }));
    sparks = [];
    isPointerActive = false;
    touchAnchorCanvasX = null;
    touchAnchorCanvasY = null;
    startTime = 0;
    elapsedTime = 0;
    setGameState('ready');
    setIsGameOver(false);
    setIsVictory(false);
  };

  // 線分と点との距離計算
  function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // 特定座標での衝突判定
  const checkCollisionAt = (px: number, py: number): boolean => {
    const current = stage();
    // 1. 壁
    for (const wall of current.walls) {
      if (
        px + probeRadius > wall.x &&
        px - probeRadius < wall.x + wall.w &&
        py + probeRadius > wall.y &&
        py - probeRadius < wall.y + wall.h
      ) {
        return true;
      }
    }
    // 2. 回転バー
    for (const rotor of rotorsState) {
      const ex = rotor.cx + Math.cos(rotor.angle) * rotor.length;
      const ey = rotor.cy + Math.sin(rotor.angle) * rotor.length;
      const dist = distToSegment(px, py, rotor.cx, rotor.cy, ex, ey);
      if (dist < probeRadius + 4) {
        return true;
      }
    }
    return false;
  };

  // サブステップ補間移動（壁すり抜け防止 ＆ 精密衝突）
  const moveProbeTo = (targetX: number, targetY: number) => {
    if (gameState() !== 'playing') return;

    // キャンバス内クランプ
    const clampedX = Math.max(probeRadius + 1, Math.min(480 - probeRadius - 1, targetX));
    const clampedY = Math.max(probeRadius + 1, Math.min(360 - probeRadius - 1, targetY));

    const dx = clampedX - probeX;
    const dy = clampedY - probeY;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.1) return;

    // 4px刻みでサブステップ検証
    const steps = Math.max(1, Math.ceil(dist / 3.5));
    for (let i = 1; i <= steps; i++) {
      const stepX = probeX + (dx * i) / steps;
      const stepY = probeY + (dy * i) / steps;

      if (checkCollisionAt(stepX, stepY)) {
        probeX = stepX;
        probeY = stepY;
        triggerSpark(stepX, stepY);
        return;
      }
    }

    probeX = clampedX;
    probeY = clampedY;
  };

  const triggerSpark = (x: number, y: number) => {
    setGameState('spark');
    sound.playGameOver();
    if (navigator.vibrate) {
      try {
        navigator.vibrate([80, 50, 100]);
      } catch (_) {
        // ignore
      }
    }

    // 火花パーティクル生成
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
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
    }, 850);
  };

  // ポインター押下ハンドラー
  const handlePointerDown = (e: PointerEvent) => {
    if (gameState() === 'spark' || gameState() === 'cleared' || !canvasRef) return;

    isPointerActive = true;
    lastClientX = e.clientX;
    lastClientY = e.clientY;

    const rect = canvasRef.getBoundingClientRect();
    const touchCanvasX = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    const touchCanvasY = ((e.clientY - rect.top) / rect.height) * canvasRef.height;

    touchAnchorCanvasX = touchCanvasX;
    touchAnchorCanvasY = touchCanvasY;

    if (containerRef && e.pointerId) {
      try {
        containerRef.setPointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }
    }

    const curState = gameState();
    const s = stage();

    if (curState === 'ready') {
      // ready状態では、スタート地点をタップするか、相対モードなら画面タップで自動スタート
      const distToStart = Math.hypot(touchCanvasX - s.start.x, touchCanvasY - s.start.y);

      if (controlMode() === 'relative' || controlMode() === 'dpad') {
        // 相対・十字キーモードは画面のどこを触ってもスタート位置から開始できる
        probeX = s.start.x;
        probeY = s.start.y;
        startTime = Date.now() - elapsedTime;
        setGameState('playing');
        sound.playPop(520);
      } else if (distToStart < 45) {
        // 直接・オフセットモードはスタート周辺をタップで開始
        probeX = s.start.x;
        probeY = s.start.y;
        startTime = Date.now() - elapsedTime;
        setGameState('playing');
        sound.playPop(520);
      }
    } else if (curState === 'paused') {
      // ポーズからの復帰
      startTime = Date.now() - elapsedTime;
      setGameState('playing');
      sound.playPop(480);
    }
  };

  // ポインター移動ハンドラー
  const handlePointerMove = (e: PointerEvent) => {
    if (!isPointerActive || !canvasRef) return;

    const rect = canvasRef.getBoundingClientRect();
    const scaleX = canvasRef.width / rect.width;
    const scaleY = canvasRef.height / rect.height;

    const deltaX = (e.clientX - lastClientX) * scaleX;
    const deltaY = (e.clientY - lastClientY) * scaleY;

    lastClientX = e.clientX;
    lastClientY = e.clientY;

    const touchCanvasX = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    const touchCanvasY = ((e.clientY - rect.top) / rect.height) * canvasRef.height;
    touchAnchorCanvasX = touchCanvasX;
    touchAnchorCanvasY = touchCanvasY;

    if (gameState() !== 'playing') return;

    const mode = controlMode();
    if (mode === 'relative') {
      // 相対移動（指の移動分だけ追従。画面のどこを触っても自機が指で隠れない！）
      moveProbeTo(probeX + deltaX, probeY + deltaY);
    } else if (mode === 'offset') {
      // 指の少し上（Canvasで約48px上）にプローブを配置
      moveProbeTo(touchCanvasX, touchCanvasY - 48);
    } else if (mode === 'direct') {
      // ダイレクト追従
      moveProbeTo(touchCanvasX, touchCanvasY);
    }
  };

  // ポインター解除ハンドラー (指離し)
  const handlePointerUp = (e?: PointerEvent) => {
    isPointerActive = false;
    touchAnchorCanvasX = null;
    touchAnchorCanvasY = null;

    if (containerRef && e && e.pointerId) {
      try {
        containerRef.releasePointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }
    }

    // スマホ操作の快適性向上:
    // 指を離しても即死せず、プレイ中なら「一時停止（待機）」になり、指を置き直して継続可能！
    // (※ direct モードでかつ PC の場合は従来の即死感電に設定も可能だが、スマホの誤爆防止を最優先)
    if (gameState() === 'playing') {
      elapsedTime = Date.now() - startTime;
      setGameState('paused');
    }
  };

  // キーボード操作ハンドラー
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') dpadState.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') dpadState.down = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') dpadState.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') dpadState.right = true;

    if (dpadState.up || dpadState.down || dpadState.left || dpadState.right) {
      if (gameState() === 'ready' || gameState() === 'paused') {
        startTime = Date.now() - elapsedTime;
        setGameState('playing');
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') dpadState.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') dpadState.down = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') dpadState.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') dpadState.right = false;
  };

  const loop = () => {
    if (!isRunning) return;
    animId = requestAnimationFrame(loop);

    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.width;
    const h = canvasRef.height;
    const current = stage();
    const curState = gameState();

    // D-Pad / キーボード入力による移動処理
    if (curState === 'playing') {
      const speed = 2.2;
      let dx = 0;
      let dy = 0;
      if (dpadState.up) dy -= speed;
      if (dpadState.down) dy += speed;
      if (dpadState.left) dx -= speed;
      if (dpadState.right) dx += speed;

      if (dx !== 0 || dy !== 0) {
        moveProbeTo(probeX + dx, probeY + dy);
      }
    }

    // 画面クリア
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    // 回転障害物の更新
    if (curState === 'playing') {
      stageTimer = Math.floor((Date.now() - startTime) / 100);
      setTimeScore((currentStageIdx() + 1) * 1000 - stageTimer * 10);

      for (const rotor of rotorsState) {
        rotor.angle += rotor.speed;
      }

      // 静止時の回転バー衝突チェック
      for (const rotor of rotorsState) {
        const ex = rotor.cx + Math.cos(rotor.angle) * rotor.length;
        const ey = rotor.cy + Math.sin(rotor.angle) * rotor.length;
        const dist = distToSegment(probeX, probeY, rotor.cx, rotor.cy, ex, ey);
        if (dist < probeRadius + 4) {
          triggerSpark(probeX, probeY);
          break;
        }
      }

      // ゴール判定
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
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    for (const wall of current.walls) {
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

      // 電撃ワイヤーのネオン光
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
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
      ctx.arc(rotor.cx, rotor.cy, 6, 0, Math.PI * 2);
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
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // スタート地点
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(current.start.x, current.start.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', current.start.x, current.start.y);

    // ゴール地点
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(current.goal.x, current.goal.y, current.goal.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('GOAL', current.goal.x, current.goal.y);

    // 操作中の指と自機をつなぐリーシュ線（オフセット時）
    if (controlMode() === 'offset' && isPointerActive && touchAnchorCanvasX !== null && touchAnchorCanvasY !== null) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(touchAnchorCanvasX, touchAnchorCanvasY);
      ctx.lineTo(probeX, probeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // タッチアンカー点
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(touchAnchorCanvasX, touchAnchorCanvasY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // プローブ（操作球）の描画
    if (curState === 'spark') {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
    } else if (curState === 'paused') {
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 6;
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
    }

    ctx.beginPath();
    ctx.arc(probeX, probeY, probeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 自機周囲の安全確認リング（隙間判定アシスト）
    ctx.strokeStyle = curState === 'paused' ? 'rgba(253, 224, 71, 0.4)' : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(probeX, probeY, probeRadius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // スパークパーティクル
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life -= 1;

      ctx.fillStyle = Math.random() < 0.5 ? '#fde047' : '#ef4444';
      ctx.fillRect(sp.x, sp.y, 3, 3);

      if (sp.life <= 0) sparks.splice(i, 1);
    }
  };

  const restart = () => {
    sound.playPop(500);
    initStage(0);
  };

  onSettled(() => {
    isRunning = true;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    initStage(0);
    if (!animId) {
      animId = requestAnimationFrame(loop);
    }
  });

  onCleanup(() => {
    isRunning = false;
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  const instructions = [
    '【電撃イライラ棒】壁や回転バーに触れずにSTARTからGOALへ運ぶゲームです。',
    '【スマホ操作】：画面のどこでもスワイプすると指の動きに合わせて球が移動します。指で自機が隠れません！',
    '画面から指を離すと一時停止し、再度ドラッグでその場から安全に再開できます。',
    '画面下の操作ボタンで「指オフセット」や「バーチャル十字キー」にも切り替え可能です。',
    '全3ステージ完全制覇を目指そう！',
  ];

  return (
    <GameShell
      id="wire-maze"
      title="Wire Maze (イライラ棒)"
      score={Math.max(0, timeScore())}
      isGameOver={isGameOver()}
      isVictory={isVictory()}
      onRestart={restart}
      onNextStage={() => initStage(0)}
      nextStageLabel="全ステージ制覇！最初から遊ぶ"
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-md px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-500 font-semibold">ステージ:</span>
            <span class="font-bold text-rose-500 font-mono text-sm">
              {currentStageIdx() + 1} / {STAGES.length}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                gameState() === 'playing'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : gameState() === 'paused'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : gameState() === 'spark'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}
            >
              {gameState() === 'ready'
                ? '画面タッチで開始'
                : gameState() === 'playing'
                ? '前進中！'
                : gameState() === 'paused'
                ? '一時停止中'
                : gameState() === 'spark'
                ? '感電爆破！'
                : 'クリア！'}
            </span>
          </div>
        </div>
      }
    >
      <div class="flex flex-col items-center gap-3 w-full max-w-2xl">
        {/* ゲームキャンバス領域 */}
        <div
          ref={(el) => {
            containerRef = el;
          }}
          class="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative select-none touch-none bg-slate-950 cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas
            ref={(el) => {
              canvasRef = el;
            }}
            width={480}
            height={360}
            class="w-full h-full block"
          />

          {/* ガイドオーバーレイ */}
          <Show when={gameState() === 'ready'}>
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/85 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[11px] font-bold border border-white/10 shadow-lg whitespace-nowrap animate-pulse flex items-center gap-1.5">
              <span>👆</span>
              <span>画面をタッチ＆ドラッグして前進！</span>
            </div>
          </Show>

          <Show when={gameState() === 'paused'}>
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-amber-950/85 backdrop-blur-md px-4 py-1.5 rounded-full text-amber-300 text-[11px] font-bold border border-amber-500/30 shadow-lg whitespace-nowrap animate-bounce flex items-center gap-1.5">
              <span>⏸️ 一時停止中 - タッチして再開</span>
            </div>
          </Show>
        </div>

        {/* スマホ用操作モード切り替えバー & D-Pad */}
        <div class="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 px-2">
          {/* 操作モード選択 */}
          <div class="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 text-xs">
            <button
              type="button"
              class={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                controlMode() === 'relative'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setControlMode('relative')}
            >
              スワイプ (推奨)
            </button>
            <button
              type="button"
              class={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                controlMode() === 'offset'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setControlMode('offset')}
            >
              指の少し上
            </button>
            <button
              type="button"
              class={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                controlMode() === 'dpad'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setControlMode('dpad')}
            >
              十字キー
            </button>
            <button
              type="button"
              class={`px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                controlMode() === 'direct'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setControlMode('direct')}
            >
              直感
            </button>
          </div>

          {/* D-Pad 十字キー（十字キーモード時または微調整用） */}
          <div class="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-2xl">
            <span class="text-[10px] text-slate-400 font-bold mr-1">微調整:</span>
            <div class="grid grid-cols-3 gap-1 w-28 h-18 py-1">
              <div />
              <button
                type="button"
                class="bg-slate-800 active:bg-rose-600 active:scale-95 text-white font-black text-xs rounded-lg flex items-center justify-center py-1 transition-all"
                onPointerDown={() => {
                  dpadState.up = true;
                  if (gameState() === 'ready' || gameState() === 'paused') {
                    startTime = Date.now() - elapsedTime;
                    setGameState('playing');
                  }
                }}
                onPointerUp={() => {
                  dpadState.up = false;
                }}
                onPointerCancel={() => {
                  dpadState.up = false;
                }}
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                class="bg-slate-800 active:bg-rose-600 active:scale-95 text-white font-black text-xs rounded-lg flex items-center justify-center py-1 transition-all"
                onPointerDown={() => {
                  dpadState.left = true;
                  if (gameState() === 'ready' || gameState() === 'paused') {
                    startTime = Date.now() - elapsedTime;
                    setGameState('playing');
                  }
                }}
                onPointerUp={() => {
                  dpadState.left = false;
                }}
                onPointerCancel={() => {
                  dpadState.left = false;
                }}
              >
                ◀
              </button>
              <button
                type="button"
                class="bg-slate-800 active:bg-rose-600 active:scale-95 text-white font-black text-xs rounded-lg flex items-center justify-center py-1 transition-all"
                onPointerDown={() => {
                  dpadState.down = true;
                  if (gameState() === 'ready' || gameState() === 'paused') {
                    startTime = Date.now() - elapsedTime;
                    setGameState('playing');
                  }
                }}
                onPointerUp={() => {
                  dpadState.down = false;
                }}
                onPointerCancel={() => {
                  dpadState.down = false;
                }}
              >
                ▼
              </button>
              <button
                type="button"
                class="bg-slate-800 active:bg-rose-600 active:scale-95 text-white font-black text-xs rounded-lg flex items-center justify-center py-1 transition-all"
                onPointerDown={() => {
                  dpadState.right = true;
                  if (gameState() === 'ready' || gameState() === 'paused') {
                    startTime = Date.now() - elapsedTime;
                    setGameState('playing');
                  }
                }}
                onPointerUp={() => {
                  dpadState.right = false;
                }}
                onPointerCancel={() => {
                  dpadState.right = false;
                }}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  );
};