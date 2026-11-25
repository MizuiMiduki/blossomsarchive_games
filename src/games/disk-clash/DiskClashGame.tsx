import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { ZeroTrustP2P } from '../../utils/p2p.ts';
import confetti from 'canvas-confetti';

interface Disk {
  id: number;
  team: 'p1' | 'p2';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isAlive: boolean;
}

export const DiskClashGame: Component = () => {
  const [p1Score, setP1Score] = createSignal(0);
  const [p2Score, setP2Score] = createSignal(0);
  const [turn, setTurn] = createSignal<'p1' | 'p2'>('p1');
  const [myTeam, setMyTeam] = createSignal<'p1' | 'p2'>('p1');
  const [playMode, setPlayMode] = createSignal<'cpu' | 'p2p'>('cpu');
  const [p2pStatus, setP2pStatus] = createSignal<'idle' | 'host' | 'guest' | 'connected'>('idle');
  const [offerCode, setOfferCode] = createSignal('');
  const [answerCode, setAnswerCode] = createSignal('');
  const [inputCode, setInputCode] = createSignal('');
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [winner, setWinner] = createSignal<string | null>(null);

  let canvasRef: HTMLCanvasElement | undefined;
  let animId: number | null = null;
  let p2p: ZeroTrustP2P | null = null;

  let disks: Disk[] = [];
  let isDragging = false;
  let selectedDiskId: number | null = null;
  let dragCurrentX = 0;
  let dragCurrentY = 0;
  let isSimulating = false;

  const instructions = [
    '【おはじきスマッシュバトル】自分のディスクを引っ張って放ち、相手のディスクを盤外に弾き飛ばす物理対戦ゲーム！',
    '【リモートP2P対戦】ホストとゲストでコードを共有すると、離れたPCやスマホ同士でリアルタイム対戦できます。',
    '【CPU対戦】一人ですぐに遊べるAI対戦モードも完備。',
    '相手のディスクを落とすたびに1点獲得！先に3点先取したプレイヤーが勝利となります。',
  ];

  const initDisks = () => {
    disks = [
      // P1 (赤・桜チーム)
      { id: 1, team: 'p1', x: 150, y: 380, vx: 0, vy: 0, radius: 20, color: '#f43f5e', isAlive: true },
      { id: 2, team: 'p1', x: 220, y: 400, vx: 0, vy: 0, radius: 20, color: '#f43f5e', isAlive: true },
      { id: 3, team: 'p1', x: 290, y: 380, vx: 0, vy: 0, radius: 20, color: '#f43f5e', isAlive: true },
      // P2 (青・空チーム)
      { id: 4, team: 'p2', x: 150, y: 100, vx: 0, vy: 0, radius: 20, color: '#0284c7', isAlive: true },
      { id: 5, team: 'p2', x: 220, y: 80, vx: 0, vy: 0, radius: 20, color: '#0284c7', isAlive: true },
      { id: 6, team: 'p2', x: 290, y: 100, vx: 0, vy: 0, radius: 20, color: '#0284c7', isAlive: true },
    ];
  };

  const initP2P = () => {
    if (p2p) p2p.close();
    p2p = new ZeroTrustP2P({
      onConnected: () => {
        sound.playVictory();
        setP2pStatus('connected');
        restartMatch();
      },
      onMessage: (data: unknown) => {
        const msg = data as { type: string; id: number; vx: number; vy: number };
        if (msg && msg.type === 'shot') {
          applyShot(msg.id, msg.vx, msg.vy);
        }
      },
      onDisconnected: () => {
        setP2pStatus('idle');
      },
      onError: (err) => console.error(err),
    });
  };

  const createHost = async () => {
    initP2P();
    setPlayMode('p2p');
    setMyTeam('p1');
    setP2pStatus('host');
    try {
      const offer = await p2p!.createHostOffer();
      setOfferCode(offer);
    } catch {}
  };

  const joinGuest = async () => {
    initP2P();
    setPlayMode('p2p');
    setMyTeam('p2');
    setP2pStatus('guest');
    try {
      const answer = await p2p!.joinGuest(inputCode().trim());
      setAnswerCode(answer);
    } catch {}
  };

  const completeConnection = async () => {
    try {
      await p2p!.completeHostConnection(inputCode().trim());
      setP2pStatus('connected');
      restartMatch();
    } catch {}
  };

  const restartMatch = () => {
    setP1Score(0);
    setP2Score(0);
    setTurn('p1');
    setIsGameOver(false);
    setWinner(null);
    initDisks();
  };

  const applyShot = (diskId: number, vx: number, vy: number) => {
    const d = disks.find((it) => it.id === diskId);
    if (!d || !d.isAlive) return;

    sound.playPop(520);
    d.vx = vx;
    d.vy = vy;
    isSimulating = true;
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (isGameOver() || isSimulating) return;
    if (playMode() === 'p2p' && turn() !== myTeam()) return;
    if (playMode() === 'cpu' && turn() === 'p2') return;

    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvasRef.height;

    const currentTurnTeam = turn();
    const myDisks = disks.filter((d) => d.team === currentTurnTeam && d.isAlive);

    for (const d of myDisks) {
      if (Math.hypot(px - d.x, py - d.y) <= d.radius + 10) {
        isDragging = true;
        selectedDiskId = d.id;
        dragCurrentX = px;
        dragCurrentY = py;
        break;
      }
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    dragCurrentX = ((e.clientX - rect.left) / rect.width) * canvasRef.width;
    dragCurrentY = ((e.clientY - rect.top) / rect.height) * canvasRef.height;
  };

  const handlePointerUp = () => {
    if (!isDragging || selectedDiskId === null) return;
    isDragging = false;

    const d = disks.find((it) => it.id === selectedDiskId);
    if (!d) return;

    // 引っ張った逆方向に飛ばす（スリングショット）
    const dx = d.x - dragCurrentX;
    const dy = d.y - dragCurrentY;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const power = Math.min(22, dist * 0.14);
      const ang = Math.atan2(dy, dx);
      const vx = Math.cos(ang) * power;
      const vy = Math.sin(ang) * power;

      applyShot(d.id, vx, vy);

      // P2P通信で相手に送信
      if (playMode() === 'p2p' && p2p) {
        p2p.send({ type: 'shot', id: d.id, vx, vy });
      }
    }

    selectedDiskId = null;
  };

  // CPU手番AI
  const triggerCpuMove = () => {
    setTimeout(() => {
      const aliveP2 = disks.filter((d) => d.team === 'p2' && d.isAlive);
      const aliveP1 = disks.filter((d) => d.team === 'p1' && d.isAlive);
      if (aliveP2.length === 0 || aliveP1.length === 0) return;

      const shooter = aliveP2[Math.floor(Math.random() * aliveP2.length)];
      const target = aliveP1[Math.floor(Math.random() * aliveP1.length)];

      const ang = Math.atan2(target.y - shooter.y, target.x - shooter.x) + (Math.random() - 0.5) * 0.2;
      const power = Math.random() * 5 + 12;

      applyShot(shooter.id, Math.cos(ang) * power, Math.sin(ang) * power);
    }, 700);
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.width;
    const height = canvasRef.height;
    const cx = width / 2;
    const cy = height / 2;
    const arenaRadius = Math.min(width, height) * 0.44;

    ctx.clearRect(0, 0, width, height);

    // アリーナ背景（円形土俵）
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // アリーナ外側
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, arenaRadius + 15, 0, Math.PI * 2);
    ctx.fill();

    // アリーナ面
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, arenaRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 中央サークル
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 物理シミュレーション更新
    let anyMoving = false;

    for (let i = 0; i < disks.length; i++) {
      const d1 = disks[i];
      if (!d1.isAlive) continue;

      d1.x += d1.vx;
      d1.y += d1.vy;
      d1.vx *= 0.965; // 摩擦減速
      d1.vy *= 0.965;

      if (Math.hypot(d1.vx, d1.vy) > 0.08) anyMoving = true;
      else {
        d1.vx = 0;
        d1.vy = 0;
      }

      // 場外落下判定
      const distFromCenter = Math.hypot(d1.x - cx, d1.y - cy);
      if (distFromCenter > arenaRadius + d1.radius * 0.8) {
        d1.isAlive = false;
        d1.vx = 0;
        d1.vy = 0;
        sound.playGameOver();

        if (d1.team === 'p1') {
          const next = p2Score() + 1;
          setP2Score(next);
          if (next >= 3) {
            setIsGameOver(true);
            setWinner(playMode() === 'p2p' ? '相手(P2)' : 'CPU');
            sound.playGameOver();
          }
        } else {
          const next = p1Score() + 1;
          setP1Score(next);
          if (next >= 3) {
            setIsGameOver(true);
            setWinner('あなた (P1)');
            sound.playVictory();
            confetti({ particleCount: 50, spread: 80 });
          }
        }
      }

      // ディスク同士の衝突判定
      for (let j = i + 1; j < disks.length; j++) {
        const d2 = disks[j];
        if (!d2.isAlive) continue;

        const cdx = d2.x - d1.x;
        const cdy = d2.y - d1.y;
        const cdist = Math.hypot(cdx, cdy);

        if (cdist < d1.radius + d2.radius) {
          sound.playPop(350);
          const nx = cdx / cdist;
          const ny = cdy / cdist;

          const kx = d1.vx - d2.vx;
          const ky = d1.vy - d2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2;

          d1.vx -= p * nx * 0.92;
          d1.vy -= p * ny * 0.92;
          d2.vx += p * nx * 0.92;
          d2.vy += p * ny * 0.92;

          // 重なり解消
          const overlap = (d1.radius + d2.radius - cdist) / 2;
          d1.x -= nx * overlap;
          d1.y -= ny * overlap;
          d2.x += nx * overlap;
          d2.y += ny * overlap;
        }
      }
    }

    // ターン切り替え判定
    if (isSimulating && !anyMoving) {
      isSimulating = false;
      const nextTurn = turn() === 'p1' ? 'p2' : 'p1';
      setTurn(nextTurn);

      if (playMode() === 'cpu' && nextTurn === 'p2' && !isGameOver()) {
        triggerCpuMove();
      }
    }

    // ディスク描画
    for (const d of disks) {
      if (!d.isAlive) continue;

      ctx.save();
      // 影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(d.x + 3, d.y + 4, d.radius, d.radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // ディスク本体
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 手番の強調リング
      if (turn() === d.team && !isSimulating) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // スリングショット予測線
    if (isDragging && selectedDiskId !== null) {
      const d = disks.find((it) => it.id === selectedDiskId);
      if (d) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(dragCurrentX, dragCurrentY);
        ctx.stroke();

        // 逆向き発射ガイド矢印
        const shootDx = d.x - dragCurrentX;
        const shootDy = d.y - dragCurrentY;
        ctx.strokeStyle = d.color;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + shootDx * 1.5, d.y + shootDy * 1.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    animId = requestAnimationFrame(loop);
  };

  onSettled(() => {
    initDisks();
    animId = requestAnimationFrame(loop);
    onCleanup(() => {
      if (animId) cancelAnimationFrame(animId);
      if (p2p) p2p.close();
    });
  });

  return (
    <GameShell
      id="disk-clash"
      title="Disk Clash"
      score={p1Score()}
      isGameOver={isGameOver()}
      isVictory={winner() === 'あなた (P1)'}
      onRestart={restartMatch}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-1.5">
            <button
              onClick={() => {
                setPlayMode('cpu');
                restartMatch();
              }}
              class={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all ${
                playMode() === 'cpu' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-slate-800'
              }`}
            >
              CPU対戦
            </button>
            <button
              onClick={createHost}
              class={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all ${
                playMode() === 'p2p' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-slate-800'
              }`}
            >
              リモートP2P
            </button>
          </div>

          <div class="flex items-center gap-2 font-mono font-bold text-xs">
            <span class="text-rose-500">P1: {p1Score()}</span>
            <span>vs</span>
            <span class="text-sky-500">P2: {p2Score()}</span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-md h-full flex flex-col items-center justify-center relative min-h-0 select-none p-2 gap-2">
        {/* P2P 招待パネル */}
        <Show when={playMode() === 'p2p' && p2pStatus() !== 'connected'}>
          <div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xl text-xs flex flex-col gap-2">
            <Show when={p2pStatus() === 'host'}>
              <span class="font-bold text-slate-800 dark:text-slate-100">1. 招待コードを相手に共有</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(offerCode());
                  sound.playPop(520);
                }}
                class="w-full py-1.5 bg-indigo-600 text-white font-bold rounded-xl"
              >
                招待コードをコピー
              </button>
              <input
                type="text"
                placeholder="相手の応答コードを貼り付け..."
                aria-label="相手の応答コード入力"
                value={inputCode()}
                onInput={(e) => setInputCode(e.currentTarget.value)}
                class="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
              />
              <button onClick={completeConnection} class="w-full py-1.5 bg-emerald-600 text-white font-bold rounded-xl">
                対戦開始
              </button>
            </Show>

            <Show when={p2pStatus() === 'guest' && !answerCode()}>
              <input
                type="text"
                placeholder="届いた招待コードを貼り付け..."
                aria-label="届いた招待コード入力"
                value={inputCode()}
                onInput={(e) => setInputCode(e.currentTarget.value)}
                class="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl"
              />
              <button onClick={joinGuest} class="w-full py-1.5 bg-emerald-600 text-white font-bold rounded-xl">
                応答コード生成
              </button>
            </Show>

            <Show when={p2pStatus() === 'guest' && answerCode()}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(answerCode());
                  sound.playPop(520);
                }}
                class="w-full py-1.5 bg-indigo-600 text-white font-bold rounded-xl"
              >
                応答コードをコピーしてホストに送信
              </button>
            </Show>
          </div>
        </Show>

        {/* メインゲームアリーナ */}
        <div
          class="w-full aspect-[3/4] max-h-[calc(100dvh-170px)] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} width={440} height={520} class="w-full h-full block" />

          {/* 手番バッジ */}
          <div class="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-[11px] font-bold shadow-md">
            {turn() === 'p1' ? '🔴 赤（あなた）の手番' : '🔵 青の手番'}
          </div>
        </div>
      </div>
    </GameShell>
  );
};
