import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { ZeroTrustP2P } from '../../utils/p2p';
import confetti from 'canvas-confetti';

type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

const SHAPES: Record<TetrominoType, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS: Record<TetrominoType | 'G', string> = {
  I: '#06b6d4', // cyan
  O: '#eab308', // yellow
  T: '#a855f7', // purple
  S: '#22c55e', // green
  Z: '#ef4444', // red
  J: '#3b82f6', // blue
  L: '#f97316', // orange
  G: '#64748b', // garbage gray
};

const COLS = 10;
const ROWS = 20;

export const PuzzleClashGame: Component = () => {
  const [mode, setMode] = createSignal<'menu' | 'cpu' | 'p2p'>('menu');
  const [role, setRole] = createSignal<'host' | 'client'>('host');
  const [roomCode, setRoomCode] = createSignal('');
  const [inputCode, setInputCode] = createSignal('');
  const [connected, setConnected] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [p2pError, setP2pError] = createSignal('');

  // Game state
  const [gameState, setGameState] = createSignal<'ready' | 'playing' | 'gameover' | 'victory'>('ready');
  const [myScore, setMyScore] = createSignal(0);
  const [myLines, setMyLines] = createSignal(0);
  const [myWins, setMyWins] = createSignal(0);
  const [opponentWins, setOpponentWins] = createSignal(0);
  const [nextPiece, setNextPiece] = createSignal<TetrominoType>('T');
  const [incomingGarbage, setIncomingGarbage] = createSignal(0);

  // Boards
  let myCanvasRef!: HTMLCanvasElement;
  let oppCanvasRef!: HTMLCanvasElement;

  let p2p: ZeroTrustP2P | null = null;
  let dropIntervalId: number | null = null;
  let cpuLoopId: number | null = null;

  // Board grid: 0 = empty, string = color code
  let grid: (string | 0)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let oppGrid: (string | 0)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  // Current falling piece
  let currentPiece: {
    type: TetrominoType;
    shape: number[][];
    x: number;
    y: number;
  } | null = null;

  const getRandomPiece = (): TetrominoType => {
    const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const spawnPiece = () => {
    const type = nextPiece();
    setNextPiece(getRandomPiece());
    const shape = SHAPES[type].map((row) => [...row]);
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;

    // Check collision at spawn
    if (checkCollision(shape, x, y, grid)) {
      handleGameOver(false);
      return;
    }

    currentPiece = { type, shape, x, y };
  };

  const checkCollision = (shape: number[][], posX: number, posY: number, targetGrid: (string | 0)[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = posX + c;
          const newY = posY + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && targetGrid[newY][newX] !== 0) return true;
        }
      }
    }
    return false;
  };

  const rotatePiece = (matrix: number[][]) => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated: number[][] = [];
    for (let c = 0; c < cols; c++) {
      rotated.push([]);
      for (let r = rows - 1; r >= 0; r--) {
        rotated[c].push(matrix[r][c]);
      }
    }
    return rotated;
  };

  const moveLeft = () => {
    if (!currentPiece || gameState() !== 'playing') return;
    if (!checkCollision(currentPiece.shape, currentPiece.x - 1, currentPiece.y, grid)) {
      currentPiece.x -= 1;
      drawMyBoard();
    }
  };

  const moveRight = () => {
    if (!currentPiece || gameState() !== 'playing') return;
    if (!checkCollision(currentPiece.shape, currentPiece.x + 1, currentPiece.y, grid)) {
      currentPiece.x += 1;
      drawMyBoard();
    }
  };

  const rotate = () => {
    if (!currentPiece || gameState() !== 'playing') return;
    const rotated = rotatePiece(currentPiece.shape);
    let offset = 0;
    if (checkCollision(rotated, currentPiece.x, currentPiece.y, grid)) {
      // Wall kick attempt
      if (!checkCollision(rotated, currentPiece.x - 1, currentPiece.y, grid)) offset = -1;
      else if (!checkCollision(rotated, currentPiece.x + 1, currentPiece.y, grid)) offset = 1;
      else if (!checkCollision(rotated, currentPiece.x - 2, currentPiece.y, grid)) offset = -2;
      else if (!checkCollision(rotated, currentPiece.x + 2, currentPiece.y, grid)) offset = 2;
      else return; // cannot rotate
    }
    currentPiece.shape = rotated;
    currentPiece.x += offset;
    drawMyBoard();
  };

  const drop = () => {
    if (!currentPiece || gameState() !== 'playing') return;
    if (!checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1, grid)) {
      currentPiece.y += 1;
      drawMyBoard();
    } else {
      lockPiece();
    }
  };

  const hardDrop = () => {
    if (!currentPiece || gameState() !== 'playing') return;
    while (!checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1, grid)) {
      currentPiece.y += 1;
    }
    lockPiece();
  };

  const lockPiece = () => {
    if (!currentPiece) return;
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const py = currentPiece.y + r;
          const px = currentPiece.x + c;
          if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
            grid[py][px] = COLORS[currentPiece.type];
          }
        }
      }
    }
    currentPiece = null;
    clearLines();
    applyIncomingGarbage();
    sendBoardSync();
    spawnPiece();
    drawMyBoard();
  };

  const clearLines = () => {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every((cell) => cell !== 0)) {
        grid.splice(r, 1);
        grid.unshift(Array(COLS).fill(0));
        cleared++;
        r++; // check same row again
      }
    }

    if (cleared > 0) {
      setMyLines((prev) => prev + cleared);
      const points = [0, 100, 300, 500, 800][cleared] || cleared * 200;
      setMyScore((prev) => prev + points);

      // Attack garbage: 2 lines -> 1 garbage, 3 lines -> 2 garbage, 4 lines (Tetris) -> 4 garbage
      const garbageToSend = cleared === 4 ? 4 : cleared === 3 ? 2 : cleared === 2 ? 1 : 0;
      if (garbageToSend > 0) {
        // First offset incoming garbage if any
        if (incomingGarbage() > 0) {
          const diff = incomingGarbage() - garbageToSend;
          if (diff >= 0) {
            setIncomingGarbage(diff);
          } else {
            setIncomingGarbage(0);
            sendAttack(Math.abs(diff));
          }
        } else {
          sendAttack(garbageToSend);
        }
      }
    }
  };

  const sendAttack = (lines: number) => {
    if (mode() === 'p2p' && p2p) {
      p2p.send({ type: 'garbage', lines });
    } else if (mode() === 'cpu') {
      cpuReceiveGarbage(lines);
    }
  };

  const applyIncomingGarbage = () => {
    const count = incomingGarbage();
    if (count <= 0) return;

    for (let i = 0; i < count; i++) {
      grid.shift();
      const hole = Math.floor(Math.random() * COLS);
      const row = Array(COLS).fill(COLORS.G);
      row[hole] = 0;
      grid.push(row);
    }
    setIncomingGarbage(0);
  };

  const handleGameOver = (won: boolean) => {
    if (gameState() !== 'playing') return;
    setGameState(won ? 'victory' : 'gameover');
    if (dropIntervalId) clearInterval(dropIntervalId);
    if (cpuLoopId) clearInterval(cpuLoopId);

    if (won) {
      setMyWins((prev) => prev + 1);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } else {
      setOpponentWins((prev) => prev + 1);
      if (mode() === 'p2p' && p2p) {
        p2p.send({ type: 'gameover' });
      }
    }
  };

  // Drawing
  const drawMyBoard = () => {
    if (!myCanvasRef) return;
    const ctx = myCanvasRef.getContext('2d');
    if (!ctx) return;

    const w = myCanvasRef.width;
    const h = myCanvasRef.height;
    const cellW = w / COLS;
    const cellH = h / ROWS;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, h);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(w, y * cellH);
      ctx.stroke();
    }

    // Grid blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = grid[r][c];
        if (val) {
          drawBlock(ctx, c * cellW, r * cellH, cellW, cellH, val);
        }
      }
    }

    // Active falling piece
    if (currentPiece) {
      // Ghost piece (drop guide)
      let ghostY = currentPiece.y;
      while (!checkCollision(currentPiece.shape, currentPiece.x, ghostY + 1, grid)) {
        ghostY++;
      }
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c]) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(
              (currentPiece.x + c) * cellW + 1,
              (ghostY + r) * cellH + 1,
              cellW - 2,
              cellH - 2
            );
          }
        }
      }

      // Solid piece
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c]) {
            drawBlock(
              ctx,
              (currentPiece.x + c) * cellW,
              (currentPiece.y + r) * cellH,
              cellW,
              cellH,
              COLORS[currentPiece.type]
            );
          }
        }
      }
    }
  };

  let cpuCurrentPiece: {
    type: TetrominoType;
    shape: number[][];
    x: number;
    y: number;
  } | null = null;
  let cpuTargetX = 3;

  const drawOppBoard = () => {
    if (!oppCanvasRef) return;
    const ctx = oppCanvasRef.getContext('2d');
    if (!ctx) return;

    const w = oppCanvasRef.width;
    const h = oppCanvasRef.height;
    const cellW = w / COLS;
    const cellH = h / ROWS;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, h);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(w, y * cellH);
      ctx.stroke();
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = oppGrid[r][c];
        if (val) {
          drawBlock(ctx, c * cellW, r * cellH, cellW, cellH, val);
        }
      }
    }

    // Draw active falling piece for CPU
    if (cpuCurrentPiece && mode() === 'cpu') {
      for (let r = 0; r < cpuCurrentPiece.shape.length; r++) {
        for (let c = 0; c < cpuCurrentPiece.shape[r].length; c++) {
          if (cpuCurrentPiece.shape[r][c]) {
            drawBlock(
              ctx,
              (cpuCurrentPiece.x + c) * cellW,
              (cpuCurrentPiece.y + r) * cellH,
              cellW,
              cellH,
              COLORS[cpuCurrentPiece.type]
            );
          }
        }
      }
    }
  };

  const drawBlock = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 1, y + 1, w - 2, 2);
    ctx.fillRect(x + 1, y + 1, 2, h - 2);
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 1, y + h - 3, w - 2, 2);
    ctx.fillRect(x + w - 3, y + 1, 2, h - 2);
  };

  const sendBoardSync = () => {
    if (mode() === 'p2p' && p2p) {
      // Compress grid for sync
      const simpleGrid = grid.map((row) =>
        row.map((cell) => (cell ? (cell === COLORS.G ? 2 : 1) : 0))
      );
      p2p.send({ type: 'board', grid: simpleGrid });
    }
  };

  // Keyboard handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameState() !== 'playing') return;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) {
      e.preventDefault();
      moveLeft();
    } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      moveRight();
    } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      drop();
    } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
      e.preventDefault();
      rotate();
    } else if (e.code === 'Space') {
      e.preventDefault();
      hardDrop();
    }
  };

  const startRound = () => {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    oppGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    cpuCurrentPiece = null;
    cpuGarbage = 0;
    setIncomingGarbage(0);
    setGameState('playing');
    setNextPiece(getRandomPiece());
    spawnPiece();
    drawMyBoard();
    drawOppBoard();

    if (dropIntervalId) clearInterval(dropIntervalId);
    dropIntervalId = window.setInterval(() => {
      drop();
    }, 700);

    if (mode() === 'cpu') {
      startCpuAI();
    }
  };

  // CPU AI Engine
  let cpuGarbage = 0;
  const cpuReceiveGarbage = (lines: number) => {
    cpuGarbage += lines;
  };

  const spawnCpuPiece = () => {
    const type = getRandomPiece();
    const shape = SHAPES[type].map((row) => [...row]);
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0;

    if (checkCollision(shape, x, y, oppGrid)) {
      handleGameOver(true); // CPU topped out, player wins!
      return;
    }

    cpuCurrentPiece = { type, shape, x, y };

    // Choose target column
    const validCols: number[] = [];
    for (let c = 0; c <= COLS - shape[0].length; c++) {
      if (!checkCollision(shape, c, 0, oppGrid)) {
        validCols.push(c);
      }
    }
    cpuTargetX = validCols.length > 0
      ? validCols[Math.floor(Math.random() * validCols.length)]
      : x;
  };

  const startCpuAI = () => {
    if (cpuLoopId) clearInterval(cpuLoopId);
    cpuGarbage = 0;
    cpuCurrentPiece = null;
    spawnCpuPiece();
    drawOppBoard();

    cpuLoopId = window.setInterval(() => {
      if (gameState() !== 'playing') return;

      if (!cpuCurrentPiece) {
        spawnCpuPiece();
        drawOppBoard();
        return;
      }

      // Move toward target column
      if (cpuCurrentPiece.x < cpuTargetX && !checkCollision(cpuCurrentPiece.shape, cpuCurrentPiece.x + 1, cpuCurrentPiece.y, oppGrid)) {
        cpuCurrentPiece.x += 1;
      } else if (cpuCurrentPiece.x > cpuTargetX && !checkCollision(cpuCurrentPiece.shape, cpuCurrentPiece.x - 1, cpuCurrentPiece.y, oppGrid)) {
        cpuCurrentPiece.x -= 1;
      }

      // Drop
      if (!checkCollision(cpuCurrentPiece.shape, cpuCurrentPiece.x, cpuCurrentPiece.y + 1, oppGrid)) {
        cpuCurrentPiece.y += 1;
      } else {
        // Lock piece into oppGrid
        for (let r = 0; r < cpuCurrentPiece.shape.length; r++) {
          for (let c = 0; c < cpuCurrentPiece.shape[r].length; c++) {
            if (cpuCurrentPiece.shape[r][c]) {
              const py = cpuCurrentPiece.y + r;
              const px = cpuCurrentPiece.x + c;
              if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
                oppGrid[py][px] = COLORS[cpuCurrentPiece.type];
              }
            }
          }
        }
        cpuCurrentPiece = null;

        // Clear lines
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (oppGrid[r].every((cell) => cell !== 0)) {
            oppGrid.splice(r, 1);
            oppGrid.unshift(Array(COLS).fill(0));
            cleared++;
            r++;
          }
        }

        // Send attack to player
        if (cleared > 0) {
          const garbageToSend = cleared === 4 ? 4 : cleared === 3 ? 2 : cleared === 2 ? 1 : 0;
          if (garbageToSend > 0) {
            setIncomingGarbage((prev) => prev + garbageToSend);
          }
        }

        // Apply incoming garbage from player
        if (cpuGarbage > 0) {
          const applyCount = Math.min(cpuGarbage, 4);
          for (let i = 0; i < applyCount; i++) {
            oppGrid.shift();
            const hole = Math.floor(Math.random() * COLS);
            const row = Array(COLS).fill(COLORS.G);
            row[hole] = 0;
            oppGrid.push(row);
          }
          cpuGarbage = Math.max(0, cpuGarbage - applyCount);
        }

        // Check if CPU topped out
        if (oppGrid[0].some((c) => c !== 0) || oppGrid[1].some((c) => c !== 0)) {
          handleGameOver(true);
          return;
        }

        spawnCpuPiece();
      }

      drawOppBoard();
    }, 280);
  };

  // P2P Setup
  const setupHost = async () => {
    setP2pError('');
    setIsGenerating(true);
    setRoomCode('');
    try {
      p2p = new ZeroTrustP2P({
        onConnected: () => {
          setConnected(true);
        },
        onMessage: (data: unknown) => handleP2PMessage(data as any),
        onDisconnected: () => {
          setConnected(false);
        },
        onError: (err: string) => setP2pError(err),
      });

      const offer = await p2p.createHostOffer();
      setRoomCode(offer);
    } catch (e: any) {
      setP2pError(e?.message || 'コードの生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const joinClient = async () => {
    if (!inputCode().trim()) return;
    setP2pError('');
    setIsGenerating(true);
    setRoomCode('');
    try {
      p2p = new ZeroTrustP2P({
        onConnected: () => {
          setConnected(true);
        },
        onMessage: (data: unknown) => handleP2PMessage(data as any),
        onDisconnected: () => {
          setConnected(false);
        },
        onError: (err: string) => setP2pError(err),
      });

      const answer = await p2p.joinGuest(inputCode().trim());
      setRoomCode(answer);
    } catch (e: any) {
      setP2pError(e?.message || '応答の生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const finalizeHost = async () => {
    if (!inputCode().trim() || !p2p) return;
    await p2p.completeHostConnection(inputCode().trim());
  };

  const handleP2PMessage = (data: any) => {
    if (data.type === 'start') {
      startRound();
    } else if (data.type === 'board') {
      // Decode opponent board
      if (Array.isArray(data.grid)) {
        oppGrid = data.grid.map((row: number[]) =>
          row.map((val: number) => (val === 2 ? COLORS.G : val === 1 ? '#38bdf8' : 0))
        );
        drawOppBoard();
      }
    } else if (data.type === 'garbage') {
      setIncomingGarbage((prev) => prev + (data.lines || 1));
    } else if (data.type === 'gameover') {
      // Opponent topped out, I win!
      handleGameOver(true);
    }
  };

  const handleStartP2PRound = () => {
    if (p2p) {
      p2p.send({ type: 'start' });
    }
    startRound();
  };

  onSettled(() => {
    window.addEventListener('keydown', handleKeyDown);
    drawMyBoard();
    drawOppBoard();
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
    if (dropIntervalId) clearInterval(dropIntervalId);
    if (cpuLoopId) clearInterval(cpuLoopId);
    if (p2p) p2p.close();
  });

  return (
    <div class="flex flex-col items-center w-full max-w-4xl mx-auto p-4 select-none">
      <div class="text-center mb-4">
        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
          Puzzle Clash
        </h2>
        <p class="text-sm text-slate-400">
          ラインを消してお邪魔ブロックを相手に送り込むリアルタイムパズルバトル
        </p>
      </div>

      {/* Mode Selection */}
      <Show when={mode() === 'menu'}>
        <div class="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <button
            onClick={() => {
              setMode('cpu');
              startRound();
            }}
            class="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
          >
            🤖 CPUと対戦（練習）
          </button>
          <button
            onClick={() => {
              setMode('p2p');
              setupHost();
            }}
            class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
          >
            🌐 リモート通信対戦（2人）
          </button>
        </div>
      </Show>

      {/* P2P Lobby */}
      <Show when={mode() === 'p2p' && !connected()}>
        <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <div class="flex border-b border-slate-800 pb-2 gap-2">
            <button
              onClick={() => {
                setRole('host');
                setupHost();
              }}
              class={`flex-1 py-2 font-bold rounded-lg ${
                role() === 'host' ? 'bg-cyan-600 text-white' : 'text-slate-400'
              }`}
            >
              ホスト（部屋作成）
            </button>
            <button
              onClick={() => {
                setRole('client');
                setRoomCode('');
              }}
              class={`flex-1 py-2 font-bold rounded-lg ${
                role() === 'client' ? 'bg-cyan-600 text-white' : 'text-slate-400'
              }`}
            >
              参加（招待コード入力）
            </button>
          </div>

          <Show when={role() === 'host'}>
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-slate-300">
                1. 以下の招待コードを相手に共有してください：
              </span>
              <button
                onClick={setupHost}
                disabled={isGenerating()}
                class="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer disabled:opacity-50"
              >
                🔄 再生成
              </button>
            </div>
            <div class="flex gap-2">
              <input
                type="text"
                readonly
                aria-label="生成された招待コード"
                value={isGenerating() ? '⏳ 招待コードを生成中...' : roomCode()}
                placeholder="招待コードがここに表示されます"
                class={`flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono select-all ${
                  isGenerating() ? 'text-amber-400 animate-pulse' : 'text-cyan-300'
                }`}
              />
              <button
                onClick={() => {
                  if (roomCode()) {
                    navigator.clipboard.writeText(roomCode());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                disabled={isGenerating() || !roomCode()}
                class="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold rounded-lg text-white cursor-pointer active:scale-95"
              >
                {copied() ? 'コピー済！' : 'コピー'}
              </button>
            </div>
            <p class="text-xs text-slate-300">
              2. 相手から返ってきた応答コードを貼り付けて接続：
            </p>
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="相手の応答コードを貼り付け"
                aria-label="相手の応答コード入力"
                value={inputCode()}
                onInput={(e) => setInputCode(e.currentTarget.value)}
                class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-white"
              />
              <button
                onClick={finalizeHost}
                class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold rounded-lg text-white cursor-pointer"
              >
                接続
              </button>
            </div>
          </Show>

          <Show when={role() === 'client'}>
            <p class="text-xs text-slate-300">
              ホストの招待コードを貼り付けて参加してください：
            </p>
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="ホストの招待コード"
                aria-label="ホストの招待コード入力"
                value={inputCode()}
                onInput={(e) => setInputCode(e.currentTarget.value)}
                class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-white"
              />
              <button
                onClick={joinClient}
                disabled={isGenerating()}
                class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-bold rounded-lg text-white cursor-pointer"
              >
                {isGenerating() ? '生成中...' : '応答生成'}
              </button>
            </div>
            <Show when={roomCode()}>
              <p class="text-xs text-slate-300 mt-2">
                生成された応答コードをホストに送信してください：
              </p>
              <div class="flex gap-2">
                <input
                  type="text"
                  readonly
                  aria-label="生成された応答コード"
                  value={roomCode()}
                  class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-cyan-300 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white cursor-pointer"
                >
                  {copied() ? 'コピー済！' : 'コピー'}
                </button>
              </div>
            </Show>
          </Show>

          <Show when={p2pError()}>
            <p class="text-xs text-red-400">{p2pError()}</p>
          </Show>

          <button
            onClick={() => setMode('menu')}
            class="text-xs text-slate-400 hover:text-slate-200 mt-2"
          >
            ← メニューに戻る
          </button>
        </div>
      </Show>

      {/* Game Screen */}
      <Show when={mode() === 'cpu' || (mode() === 'p2p' && connected())}>
        <div class="w-full flex flex-col items-center">
          {/* Status Bar */}
          <div class="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-4 flex justify-between items-center text-sm">
            <div class="flex items-center gap-3">
              <span class="font-bold text-cyan-400">あなた: {myWins()} 勝</span>
              <span class="text-slate-500">vs</span>
              <span class="font-bold text-rose-400">
                {mode() === 'cpu' ? 'CPU' : '相手'}: {opponentWins()} 勝
              </span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-xs text-slate-400">スコア: {myScore()}</span>
              <span class="text-xs text-slate-400">消去ライン: {myLines()}</span>
              <Show when={incomingGarbage() > 0}>
                <span class="text-xs font-bold text-rose-400 animate-pulse">
                  ⚠️ 警告: +{incomingGarbage()} お邪魔
                </span>
              </Show>
            </div>
          </div>

          {/* Arenas Container */}
          <div class="flex flex-row justify-center items-start gap-4 md:gap-8 w-full">
            {/* My Board */}
            <div class="flex flex-col items-center">
              <span class="text-xs font-bold text-cyan-400 mb-1">YOU</span>
              <div class="relative border-2 border-cyan-500/50 rounded-lg overflow-hidden shadow-2xl bg-slate-950">
                <canvas
                  ref={(el) => {
                    myCanvasRef = el;
                    drawMyBoard();
                  }}
                  width={200}
                  height={400}
                  class="block"
                />

                {/* Overlay Game Over / Win */}
                <Show when={gameState() !== 'playing'}>
                  <div class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4">
                    <span
                      class={`text-2xl font-black mb-2 ${
                        gameState() === 'victory' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {gameState() === 'victory' ? 'VICTORY!' : 'DEFEAT'}
                    </span>
                    <button
                      onClick={mode() === 'p2p' ? handleStartP2PRound : startRound}
                      class="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-lg active:scale-95 cursor-pointer"
                    >
                      次のラウンドへ
                    </button>
                  </div>
                </Show>
              </div>

              {/* Next piece display */}
              <div class="mt-2 text-xs text-slate-400 flex items-center gap-2">
                <span>NEXT:</span>
                <span
                  class="font-mono font-bold px-2 py-0.5 rounded"
                  style={{ color: COLORS[nextPiece()] }}
                >
                  {nextPiece()}
                </span>
              </div>
            </div>

            {/* Opponent Board Preview */}
            <div class="flex flex-col items-center">
              <span class="text-xs font-bold text-rose-400 mb-1">
                {mode() === 'cpu' ? 'CPU' : 'OPPONENT'}
              </span>
              <div class="relative border-2 border-slate-700 rounded-lg overflow-hidden shadow-lg bg-slate-950 opacity-90">
                <canvas
                  ref={(el) => {
                    oppCanvasRef = el;
                    drawOppBoard();
                  }}
                  width={140}
                  height={280}
                  class="block"
                />
              </div>
            </div>
          </div>

          {/* Mobile On-Screen Controls */}
          <div class="mt-6 w-full max-w-sm flex flex-col gap-2 md:hidden">
            <div class="flex justify-center gap-3">
              <button
                onClick={rotate}
                class="w-16 h-14 bg-slate-800 active:bg-cyan-600 text-white font-bold rounded-xl shadow flex items-center justify-center text-lg"
              >
                ↻
              </button>
              <button
                onClick={hardDrop}
                class="w-24 h-14 bg-indigo-700 active:bg-indigo-600 text-white font-bold rounded-xl shadow flex items-center justify-center text-xs"
              >
                DROP
              </button>
            </div>
            <div class="flex justify-center gap-3">
              <button
                onClick={moveLeft}
                class="w-16 h-14 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-xl shadow flex items-center justify-center text-lg"
              >
                ◀
              </button>
              <button
                onClick={drop}
                class="w-16 h-14 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-xl shadow flex items-center justify-center text-lg"
              >
                ▼
              </button>
              <button
                onClick={moveRight}
                class="w-16 h-14 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-xl shadow flex items-center justify-center text-lg"
              >
                ▶
              </button>
            </div>
          </div>

          {/* PC Controls Guide */}
          <div class="hidden md:flex gap-4 text-xs text-slate-500 mt-6">
            <span>◀ ▶ / A D: 左右移動</span>
            <span>▲ / W: 回転</span>
            <span>▼ / S: 高速落下</span>
            <span>Space: ハードドロップ</span>
          </div>

          <button
            onClick={() => {
              if (dropIntervalId) clearInterval(dropIntervalId);
              if (cpuLoopId) clearInterval(cpuLoopId);
              setGameState('ready');
              setMode('menu');
            }}
            class="mt-6 text-xs text-slate-500 hover:text-slate-300"
          >
            メニューに戻る
          </button>
        </div>
      </Show>
    </div>
  );
};
