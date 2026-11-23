import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';

interface GroundItem {
  x: number;
  type: 'spring' | 'boost' | 'obstacle';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const SkyLauncherGame: Component = () => {
  const [phase, setPhase] = createSignal<'aim_angle' | 'aim_power' | 'flying' | 'result'>('aim_angle');
  const [distance, setDistance] = createSignal(0);
  const [altitude, setAltitude] = createSignal(0);
  const [maxAltitude, setMaxAltitude] = createSignal(0);
  const [boostsLeft, setBoostsLeft] = createSignal(3);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [aimAngle, setAimAngle] = createSignal(45);
  const [aimPower, setAimPower] = createSignal(50);

  let canvasRef: HTMLCanvasElement | undefined;
  let animId: number | null = null;
  let isRunning = true;

  // 照準メーター内部状態
  let currentAngle = 45;
  let angleDir = 1.2;
  let currentPower = 30;
  let powerDir = 2.0;

  // 物理状態
  let posX = 0;
  let posY = 0;
  let velX = 0;
  let velY = 0;
  let maxAlt = 0;
  let bounceCount = 0;
  let groundItems: GroundItem[] = [];
  let particles: Particle[] = [];
  let flightTrail: { x: number; y: number; alpha: number }[] = [];

  const GRAVITY = 0.26;
  const AIR_DRAG = 0.993;

  const spawnParticles = (x: number, y: number, count: number, color: string, speed = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1.0,
        maxLife: 20 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  };

  const initFlight = () => {
    currentAngle = 45;
    angleDir = 1.2;
    currentPower = 20;
    powerDir = 2.2;
    setAimAngle(45);
    setAimPower(20);

    posX = 0;
    posY = 0;
    velX = 0;
    velY = 0;
    maxAlt = 0;
    bounceCount = 0;
    particles = [];
    flightTrail = [];

    setBoostsLeft(3);
    setDistance(0);
    setAltitude(0);
    setMaxAltitude(0);
    setIsGameOver(false);
    setPhase('aim_angle');

    // 地上アイテム配置 (スプリング・ブースト・障害物)
    groundItems = [];
    for (let x = 320; x < 12000; x += 160 + Math.random() * 240) {
      const rand = Math.random();
      const type = rand < 0.45 ? 'spring' : rand < 0.75 ? 'boost' : 'obstacle';
      groundItems.push({ x, type });
    }
  };

  const handleActionClick = () => {
    const curPhase = phase();

    if (curPhase === 'aim_angle') {
      sound.playPop(520);
      setAimAngle(Math.round(currentAngle));
      setPhase('aim_power');
    } else if (curPhase === 'aim_power') {
      sound.playMatch(5);
      const chosenPower = Math.round(currentPower);
      setAimPower(chosenPower);

      // 発射物理計算
      const rad = (currentAngle * Math.PI) / 180;
      const speed = (chosenPower / 100) * 23 + 5;
      velX = Math.cos(rad) * speed;
      velY = Math.sin(rad) * speed;

      // 発射マズルフラッシュと煙
      spawnParticles(120 + Math.cos(rad) * 45, 300 - Math.sin(rad) * 45, 25, '#f59e0b', 6);
      spawnParticles(120 + Math.cos(rad) * 45, 300 - Math.sin(rad) * 45, 15, '#f8fafc', 4);

      setPhase('flying');
    } else if (curPhase === 'flying' && boostsLeft() > 0) {
      // 空中ブースト
      sound.playPop(850);
      setBoostsLeft((b) => b - 1);
      velX += 6.5;
      velY = Math.max(velY + 5, 8.5);

      // ブースト噴射エフェクト
      spawnParticles(posX, posY, 20, '#38bdf8', 5);
      spawnParticles(posX, posY, 15, '#fbbf24', 4);
    }
  };

  const loop = () => {
    if (!isRunning) return;

    // 次のフレームを確実に予約
    animId = requestAnimationFrame(loop);

    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.width;
    const h = canvasRef.height;
    const curPhase = phase();

    // 1. 照準メーターのアニメーション
    if (curPhase === 'aim_angle') {
      currentAngle += angleDir;
      if (currentAngle >= 78) {
        currentAngle = 78;
        angleDir = -Math.abs(angleDir);
      } else if (currentAngle <= 15) {
        currentAngle = 15;
        angleDir = Math.abs(angleDir);
      }
      setAimAngle(Math.round(currentAngle));
    } else if (curPhase === 'aim_power') {
      currentPower += powerDir;
      if (currentPower >= 100) {
        currentPower = 100;
        powerDir = -Math.abs(powerDir);
      } else if (currentPower <= 10) {
        currentPower = 10;
        powerDir = Math.abs(powerDir);
      }
      setAimPower(Math.round(currentPower));

      // チャージ粒子
      const rad = (currentAngle * Math.PI) / 180;
      const muzzleX = 120 + Math.cos(rad) * 45;
      const muzzleY = h - 60 - Math.sin(rad) * 45;
      if (Math.random() < 0.6) {
        particles.push({
          x: muzzleX + (Math.random() - 0.5) * 40,
          y: muzzleY + (Math.random() - 0.5) * 40,
          vx: (muzzleX - (muzzleX + (Math.random() - 0.5) * 40)) * 0.1,
          vy: (muzzleY - (muzzleY + (Math.random() - 0.5) * 40)) * 0.1,
          life: 1.0,
          maxLife: 15,
          color: currentPower > 80 ? '#f43f5e' : '#f59e0b',
          size: 2 + (currentPower / 100) * 2,
        });
      }
    }

    // 2. 飛行中の物理演算
    if (curPhase === 'flying') {
      velY -= GRAVITY;
      velX *= AIR_DRAG;
      velY *= AIR_DRAG;

      posX += velX;
      posY += velY;

      if (posY > maxAlt) {
        maxAlt = Math.floor(posY);
        setMaxAltitude(maxAlt);
      }

      setDistance(Math.floor(posX));
      setAltitude(Math.max(0, Math.floor(posY)));

      // 飛行軌跡
      if (Math.random() < 0.6) {
        flightTrail.push({ x: posX, y: posY, alpha: 0.8 });
      }

      // 地面着地
      if (posY <= 0) {
        posY = 0;
        bounceCount++;

        // 地上アイテムとの判定
        let hitItem = false;
        for (const item of groundItems) {
          if (Math.abs(posX - item.x) < 38) {
            hitItem = true;
            if (item.type === 'spring') {
              sound.playPop(720);
              velY = 14 + Math.random() * 4;
              velX = Math.max(velX, 11);
              spawnParticles(item.x, 0, 20, '#f59e0b', 5);
            } else if (item.type === 'boost') {
              sound.playMatch(4);
              velX += 9;
              velY = Math.max(velY + 4, 7);
              spawnParticles(item.x, 0, 25, '#38bdf8', 6);
            } else {
              // 障害物: 激突減速
              velX *= 0.35;
              velY = 3;
              sound.playPop(250);
              spawnParticles(item.x, 0, 15, '#94a3b8', 3);
            }
            break;
          }
        }

        if (!hitItem) {
          velY = -velY * 0.52; // 地面バウンド
          velX *= 0.82;
          if (Math.abs(velY) > 1.5 || Math.abs(velX) > 2.0) {
            sound.playPop(340);
            spawnParticles(posX, 0, 8, '#e2e8f0', 2.5);
          }
        }

        // 停止判定
        if (Math.abs(velX) < 0.25 && Math.abs(velY) < 0.8) {
          velX = 0;
          velY = 0;
          setPhase('result');
          setIsGameOver(true);
          sound.playVictory();
        }
      }
    }

    // パーティクル更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // トレイル更新
    for (let i = flightTrail.length - 1; i >= 0; i--) {
      flightTrail[i].alpha -= 0.02;
      if (flightTrail[i].alpha <= 0) {
        flightTrail.splice(i, 1);
      }
    }

    // 3. 背景描画 (空・地上スクロール)
    const groundScreenY = h - 60;
    const cameraX = curPhase === 'aim_angle' || curPhase === 'aim_power' ? 0 : posX;
    const cameraY = curPhase === 'aim_angle' || curPhase === 'aim_power' ? 0 : Math.max(0, posY - 80);

    // 空のグラデーション
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (cameraY > 600) {
      skyGrad.addColorStop(0, '#020617'); // 宇宙
      skyGrad.addColorStop(1, '#0f172a');
    } else {
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 宇宙の星 (高高度時)
    if (cameraY > 300) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 20; i++) {
        const sx = ((i * 137) % w);
        const sy = ((i * 93 - cameraY * 0.05) % (h * 0.7));
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    }

    // 雲
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 350 - cameraX * 0.2) % (w + 400)) - 100;
      const cy = 40 + (i % 3) * 50 - cameraY * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.arc(cx + 25, cy - 10, 35, 0, Math.PI * 2);
      ctx.arc(cx + 50, cy, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    // 地面
    const groundDrawY = groundScreenY + cameraY;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundDrawY, w, Math.max(0, h - groundDrawY + 120));
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, groundDrawY, w, 6);

    // 地上アイテムの描画
    for (const item of groundItems) {
      const screenX = item.x - cameraX + 120;
      if (screenX < -50 || screenX > w + 50) continue;

      if (item.type === 'spring') {
        // トランポリン
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(screenX - 16, groundDrawY - 14, 32, 14);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(screenX - 14, groundDrawY - 14, 28, 4);
      } else if (item.type === 'boost') {
        // 加速パネル
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(screenX - 14, groundDrawY);
        ctx.lineTo(screenX + 18, groundDrawY - 10);
        ctx.lineTo(screenX - 14, groundDrawY - 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
      } else {
        // 障害物 (岩)
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(screenX, groundDrawY - 8, 12, Math.PI, 0);
        ctx.fill();
      }
    }

    // 飛行トレイルの描画
    for (const tr of flightTrail) {
      const tx = tr.x - cameraX + 120;
      const ty = groundScreenY - (tr.y - cameraY);
      if (tx >= -20 && tx <= w + 20) {
        ctx.fillStyle = `rgba(244, 63, 94, ${tr.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 弾 / キャラクターの描画
    const charScreenX = 120;
    const charScreenY = groundScreenY - (posY - cameraY);

    if (curPhase === 'flying' || curPhase === 'result') {
      ctx.save();
      ctx.translate(charScreenX, charScreenY);
      const moveAngle = Math.atan2(-velY, velX);
      ctx.rotate(curPhase === 'flying' ? moveAngle : 0);

      // ロケット本体
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // 先端
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(10, -5);
      ctx.lineTo(16, 0);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.fill();

      // 窓
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(2, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      // 飛行中ジェット炎
      if (curPhase === 'flying' && velX > 2) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-20 - Math.random() * 8, 0);
        ctx.lineTo(-12, 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // 照準画面での砲台 & 角度・パワー描画
    if (curPhase === 'aim_angle' || curPhase === 'aim_power') {
      const canonX = 120;
      const canonY = groundScreenY;
      const rad = (currentAngle * Math.PI) / 180;

      // 扇形の角度ガイドエリア (aim_angle 時)
      if (curPhase === 'aim_angle') {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.moveTo(canonX, canonY);
        ctx.arc(canonX, canonY, 90, -(78 * Math.PI) / 180, -(15 * Math.PI) / 180, false);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 砲台ベース (台座)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(canonX, canonY, 22, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 砲身の描画 (チャージ時はパワーに応じてリコイル/発光)
      const barrelLength = curPhase === 'aim_power' ? 44 - (currentPower / 100) * 6 : 44;
      const muzzleX = canonX + Math.cos(rad) * barrelLength;
      const muzzleY = canonY - Math.sin(rad) * barrelLength;

      ctx.save();
      ctx.strokeStyle = curPhase === 'aim_power' ? (currentPower > 80 ? '#fb7185' : '#f43f5e') : '#38bdf8';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(canonX, canonY);
      ctx.lineTo(muzzleX, muzzleY);
      ctx.stroke();

      // 砲身内部ハイライト
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(canonX + Math.cos(rad) * 6, canonY - Math.sin(rad) * 6);
      ctx.lineTo(muzzleX - Math.cos(rad) * 2, muzzleY + Math.sin(rad) * 2);
      ctx.stroke();
      ctx.restore();

      // 照準ガイド線 (予測弾道)
      ctx.save();
      ctx.strokeStyle = curPhase === 'aim_power' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY);
      const guideLen = 140;
      ctx.lineTo(muzzleX + Math.cos(rad) * guideLen, muzzleY - Math.sin(rad) * guideLen);
      ctx.stroke();
      ctx.restore();

      // Canvas 上のパワーチャージオーラ (aim_power 時)
      if (curPhase === 'aim_power') {
        const energyRadius = 6 + (currentPower / 100) * 14;
        const grad = ctx.createRadialGradient(muzzleX, muzzleY, 2, muzzleX, muzzleY, energyRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, currentPower > 80 ? '#f43f5e' : '#f59e0b');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, energyRadius, 0, Math.PI * 2);
        ctx.fill();

        // 砲口横のパワー数値 Canvas ラベル
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`POWER: ${Math.round(currentPower)}%`, muzzleX + 15, muzzleY - 10);
      } else {
        // 角度数値 Canvas ラベル
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`ANGLE: ${Math.round(currentAngle)}°`, canonX + 50, canonY - 50);
      }
    }

    // パーティクル描画 (世界座標 / スクリーン座標)
    for (const p of particles) {
      let px = p.x;
      let py = p.y;
      // 飛行中ならカメラオフセット適用
      if (curPhase === 'flying') {
        px = p.x - cameraX + 120;
        py = groundScreenY - (p.y - cameraY);
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  };

  const restart = () => {
    sound.playPop(500);
    initFlight();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      handleActionClick();
    }
  };

  onSettled(() => {
    isRunning = true;
    window.addEventListener('keydown', handleKeyDown);
    initFlight();
    if (!animId) {
      animId = requestAnimationFrame(loop);
    }
  });

  onCleanup(() => {
    isRunning = false;
    window.removeEventListener('keydown', handleKeyDown);
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  const instructions = [
    '【ぶっ飛ばし】Flash時代を代表する大人気フライト＆ジャンプゲームです。',
    '1. タップまたはスペースキーで【発射角度】を決定！',
    '2. もう一度タップして【パワーチャージ】して発射！',
    '3. 飛行中にタップすると【ロケットブースト】で追加加速（3回まで）！',
    '地上のトランポリンやブーストを駆使して最長飛距離（m）を目指そう！',
  ];

  return (
    <GameShell
      id="sky-catapult"
      title="Sky Launcher (ぶっ飛ばし)"
      score={distance()}
      isGameOver={isGameOver()}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-md px-3 py-1 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <div class="flex items-center gap-3">
            <div>
              <span class="text-slate-400">距離:</span>{' '}
              <span class="font-mono font-bold text-rose-500 text-sm">{distance()} m</span>
            </div>
            <div>
              <span class="text-slate-400">高度:</span>{' '}
              <span class="font-mono font-bold text-sky-400 text-sm">{altitude()} m</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">ブースト:</span>{' '}
            <span class="font-bold text-amber-500">{boostsLeft()} 回</span>
          </div>
        </div>
      }
    >
      <div
        class="w-full max-w-2xl max-h-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative select-none touch-none bg-slate-950 cursor-pointer group"
        onClick={handleActionClick}
      >
        <canvas
          ref={(el) => {
            canvasRef = el;
          }}
          width={480}
          height={360}
          class="w-full h-full block"
        />

        {/* 照準・チャージ UI インジケーター */}
        <Show when={phase() === 'aim_angle' || phase() === 'aim_power'}>
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/15 shadow-2xl pointer-events-none text-center min-w-[240px]">
            <div class="flex items-center justify-between w-full text-xs font-bold">
              <span class="text-white">
                {phase() === 'aim_angle' ? '【角度】をタップで決定' : '【パワー】をタップで発射！'}
              </span>
              <span
                class={`font-mono text-sm px-1.5 py-0.5 rounded ${
                  phase() === 'aim_angle'
                    ? 'text-sky-400 bg-sky-950/60'
                    : 'text-rose-400 bg-rose-950/60'
                }`}
              >
                {phase() === 'aim_angle' ? `${aimAngle()}°` : `${aimPower()}%`}
              </span>
            </div>

            <div class="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 p-0.5 shadow-inner">
              <div
                class={`h-full rounded-full ${
                  phase() === 'aim_angle'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                    : 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                }`}
                style={{
                  width: `${
                    phase() === 'aim_angle'
                      ? ((aimAngle() - 15) / (78 - 15)) * 100
                      : aimPower()
                  }%`,
                }}
              />
            </div>
            <span class="text-[10px] text-slate-400">
              画面タップ または スペースキーで決定
            </span>
          </div>
        </Show>

        {/* 飛行中ブーストボタン */}
        <Show when={phase() === 'flying' && boostsLeft() > 0}>
          <div class="absolute bottom-4 right-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-xl border border-white/30 active:scale-95 animate-pulse flex items-center gap-1.5">
            <span>🚀 タップでBOOST!</span>
            <span class="bg-black/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {boostsLeft()}
            </span>
          </div>
        </Show>

        {/* 飛行結果詳細オーバーレイ */}
        <Show when={phase() === 'result'}>
          <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
            <div class="bg-slate-900/95 border border-slate-700 p-6 rounded-3xl shadow-2xl max-w-xs w-full flex flex-col items-center gap-4">
              <div class="text-3xl">🛬</div>
              <h3 class="text-lg font-black text-white">フライト完了！</h3>
              <div class="w-full bg-slate-800/80 rounded-2xl p-3 flex flex-col gap-2 text-xs">
                <div class="flex justify-between items-center">
                  <span class="text-slate-400">最終飛距離</span>
                  <span class="text-rose-400 font-bold font-mono text-base">{distance()} m</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-400">最高到達高度</span>
                  <span class="text-sky-400 font-bold font-mono text-base">{maxAltitude()} m</span>
                </div>
              </div>
              <p class="text-[11px] text-slate-400">
                ヘッダーのリセットまたは画面タップで再挑戦！
              </p>
            </div>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};