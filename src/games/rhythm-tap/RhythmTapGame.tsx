import { Component, createSignal, onSettled, onCleanup, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

interface Note {
  id: number;
  lane: number; // 0, 1, 2, 3
  spawnTime: number;
  hitTime: number;
  isHit: boolean;
  isMissed: boolean;
}

interface JudgementEffect {
  text: string;
  color: string;
  time: number;
}

export const RhythmTapGame: Component = () => {
  const [score, setScore] = createSignal(0);
  const [combo, setCombo] = createSignal(0);
  const [maxCombo, setMaxCombo] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [judgement, setJudgement] = createSignal<JudgementEffect | null>(null);

  let canvasRef: HTMLCanvasElement | undefined;
  let animId: number | null = null;
  let audioTimerId: number | null = null;
  let notes: Note[] = [];
  let nextNoteId = 1;
  let startTime = 0;
  const songDuration = 60000; // 60秒
  const fallDuration = 1800; // ノーツが上から下まで落ちる時間(ms)

  const LANE_KEYS = ['D', 'F', 'J', 'K'];
  const LANE_COLORS = ['#f43f5e', '#38bdf8', '#fbbf24', '#a855f7'];

  const instructions = [
    '【Floral Beats 音ゲー】リズムに合わせて上から降ってくる桜の花びら（ノーツ）をタイミングよく叩きましょう！',
    '判定ラインと花びらが重なる瞬間にタップ！',
    'PCは「D」「F」「J」「K」キー、スマホは画面下の4つのレーンを直接タップします。',
    'PERFECTやGREATを連続で叩くとコンボが繋がり、スコアが急上昇します！',
  ];

  // 簡単なビート音生成（Web Audio API）
  let audioCtx: AudioContext | null = null;
  const playBeatSound = (freq: number, type: OscillatorType = 'sine', dur = 0.08) => {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch {}
  };

  const startSong = () => {
    sound.playPop(520);
    notes = [];
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setJudgement(null);
    startTime = performance.now();

    // ノーツ譜面生成（BPM 132、4つ打ち＋シンコペーション）
    const bpm = 132;
    const beatMs = (60 / bpm) * 1000;
    const totalBeats = Math.floor(songDuration / beatMs);

    for (let b = 4; b < totalBeats - 4; b++) {
      const hitTime = startTime + b * beatMs;
      const lane = Math.floor(Math.random() * 4);
      notes.push({
        id: nextNoteId++,
        lane,
        spawnTime: hitTime - fallDuration,
        hitTime,
        isHit: false,
        isMissed: false,
      });

      // 後半はダブルノーツ出現
      if (b > 25 && Math.random() < 0.28) {
        let secondLane = (lane + 1 + Math.floor(Math.random() * 2)) % 4;
        notes.push({
          id: nextNoteId++,
          lane: secondLane,
          spawnTime: hitTime - fallDuration,
          hitTime,
          isHit: false,
          isMissed: false,
        });
      }
    }

    // メトロノーム風BGMビート
    if (audioTimerId) clearInterval(audioTimerId);
    let beatCount = 0;
    audioTimerId = window.setInterval(() => {
      if (!isPlaying()) return;
      const isDownbeat = beatCount % 4 === 0;
      playBeatSound(isDownbeat ? 520 : 330, isDownbeat ? 'triangle' : 'sine', 0.06);
      beatCount++;
    }, beatMs);
  };

  const handleHitLane = (lane: number) => {
    if (!isPlaying() || isGameOver()) return;
    const now = performance.now();
    const laneNotes = notes.filter((n) => n.lane === lane && !n.isHit && !n.isMissed);

    let closest: Note | null = null;
    let minDiff = Infinity;

    for (const n of laneNotes) {
      const diff = Math.abs(now - n.hitTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = n;
      }
    }

    if (closest && minDiff <= 220) {
      closest.isHit = true;
      if (minDiff <= 55) {
        // PERFECT
        sound.playPop(880);
        showJudgement('🌸 PERFECT', 'text-amber-400');
        const nextC = combo() + 1;
        setCombo(nextC);
        setMaxCombo((m) => Math.max(m, nextC));
        setScore((s) => s + 300 + nextC * 10);
      } else if (minDiff <= 110) {
        // GREAT
        sound.playPop(660);
        showJudgement('✨ GREAT', 'text-emerald-400');
        const nextC = combo() + 1;
        setCombo(nextC);
        setMaxCombo((m) => Math.max(m, nextC));
        setScore((s) => s + 150 + nextC * 5);
      } else {
        // GOOD
        sound.playPop(440);
        showJudgement('👍 GOOD', 'text-sky-400');
        setCombo((c) => c + 1);
        setScore((s) => s + 50);
      }
    } else {
      // 空打ち
      sound.playPop(220);
    }
  };

  const showJudgement = (text: string, color: string) => {
    setJudgement({ text, color, time: performance.now() });
  };

  const loop = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.width;
    const height = canvasRef.height;
    const now = performance.now();

    ctx.clearRect(0, 0, width, height);

    // 背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // 4レーンの境界線
    const laneWidth = width / 4;
    const judgeY = height - 70;

    for (let i = 0; i < 4; i++) {
      const x = i * laneWidth;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // レーンのグラデーション光
      const grad = ctx.createLinearGradient(0, judgeY - 60, 0, judgeY + 20);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, `${LANE_COLORS[i]}15`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, judgeY - 60, laneWidth, 80);
    }

    // 判定ライン
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, judgeY);
    ctx.lineTo(width, judgeY);
    ctx.stroke();

    // 判定サークル
    for (let i = 0; i < 4; i++) {
      const cx = i * laneWidth + laneWidth / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(cx, judgeY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = LANE_COLORS[i];
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 落下ノーツの描画
    if (isPlaying() && !isGameOver()) {
      for (const n of notes) {
        if (n.isHit || n.isMissed) continue;

        const progress = (now - n.spawnTime) / fallDuration;

        if (progress >= 0 && progress <= 1.2) {
          const ny = progress * judgeY;
          const nx = n.lane * laneWidth + laneWidth / 2;

          // 桜の花びら風ノーツ
          ctx.save();
          ctx.translate(nx, ny);
          ctx.rotate(progress * 2);

          const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 20);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.5, LANE_COLORS[n.lane]);
          grad.addColorStop(1, `${LANE_COLORS[n.lane]}99`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.restore();
        }

        // ミス判定（通り過ぎた場合）
        if (now - n.hitTime > 160 && !n.isHit && !n.isMissed) {
          n.isMissed = true;
          setCombo(0);
          showJudgement('💨 MISS', 'text-slate-400');
        }
      }

      // 曲終了判定
      if (now - startTime > songDuration) {
        setIsPlaying(false);
        setIsGameOver(true);
        sound.playVictory();
        confetti({ particleCount: 50, spread: 80 });
        if (audioTimerId) clearInterval(audioTimerId);
      }
    }

    animId = requestAnimationFrame(loop);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    const idx = LANE_KEYS.indexOf(key);
    if (idx !== -1) {
      e.preventDefault();
      handleHitLane(idx);
    }
  };

  onSettled(() => {
    window.addEventListener('keydown', handleKeyDown);
    animId = requestAnimationFrame(loop);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animId) cancelAnimationFrame(animId);
      if (audioTimerId) clearInterval(audioTimerId);
    });
  });

  return (
    <GameShell
      id="rhythm-tap"
      title="Floral Beats"
      score={score()}
      isGameOver={isGameOver()}
      isVictory={isGameOver()}
      onRestart={startSong}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-1.5 font-bold">
            <span class="text-amber-500 font-mono">MAX COMBO: {maxCombo()}</span>
          </div>

          <div class="flex items-center gap-2">
            <Show when={!isPlaying()}>
              <button
                onClick={startSong}
                class="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-all active:scale-95 shadow-md flex items-center gap-1"
              >
                <span>▶</span>
                <span>{isGameOver() ? 'リプレイ' : 'スタート'}</span>
              </button>
            </Show>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-md h-full flex flex-col items-center justify-center relative min-h-0 select-none p-2 gap-2">
        {/* メインゲームレーンキャンバス */}
        <div class="w-full aspect-[3/4] max-h-[calc(100dvh-175px)] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative bg-slate-950 flex items-center justify-center">
          <canvas ref={canvasRef} width={360} height={480} class="w-full h-full block" />

          {/* コンボ＆判定テキスト表示 */}
          <div class="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            <Show when={combo() > 1}>
              <div class="text-3xl font-black text-amber-400 animate-bounce tracking-wider drop-shadow-lg">
                {combo()}
              </div>
              <div class="text-[10px] font-black text-white/80 tracking-widest uppercase">
                COMBO
              </div>
            </Show>
            <Show when={judgement()}>
              <div class={`text-sm font-black mt-1 animate-in zoom-in-50 duration-75 ${judgement()?.color}`}>
                {judgement()?.text}
              </div>
            </Show>
          </div>

          {/* 未スタート時プロンプト */}
          <Show when={!isPlaying() && !isGameOver()}>
            <div class="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center p-4 text-center">
              <span class="text-4xl mb-2">🌸</span>
              <h2 class="text-lg font-black text-white mb-1">Floral Beats</h2>
              <p class="text-xs text-slate-300 mb-4 max-w-xs">
                キーボード（D・F・J・K）または画面タップでリズムに乗ってノーツを叩こう！
              </p>
              <button
                onClick={startSong}
                class="px-6 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm shadow-xl active:scale-95 transition-all"
              >
                ♪ 演奏スタート
              </button>
            </div>
          </Show>
        </div>

        {/* スマホ用 4レーン タップボタン */}
        <div class="grid grid-cols-4 gap-2 w-full max-w-[360px]">
          <For each={[0, 1, 2, 3]}>
            {(lane) => (
              <button
                onPointerDown={() => handleHitLane(lane)}
                class="py-3 rounded-2xl border-2 border-slate-700 bg-slate-800/80 active:bg-rose-500 text-white font-mono font-black text-base shadow-md active:scale-95 transition-all flex flex-col items-center justify-center"
              >
                <span>{LANE_KEYS[lane]}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </GameShell>
  );
};
