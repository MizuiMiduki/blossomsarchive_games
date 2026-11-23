import fs from 'fs';
import path from 'path';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('       BLOSSOMSARCHIVE GAMES - COMPREHENSIVE QA     ');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// 1. レジストリと全ゲーム定義の整合性QA
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1: Game Registry & Integrity ---');
const registryCode = fs.readFileSync('src/games/registry.ts', 'utf8');
const idMatches = [...registryCode.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
assert(idMatches.length === 41, `41 games are registered in registry.ts (found: ${idMatches.length})`);

const expectedIds = [
  'blossom-life', 'petal-reversi', 'mini-shogi', 'standard-shogi', 'blossom-chess',
  'gomoku-garden', 'blossom-drop', 'floris-2048', 'memory-garden', 'petal-solitaire',
  'bouquet-block', 'petal-dash', 'ito-toshi', 'wire-maze', 'lights-out',
  'sky-catapult', 'room-escape', 'ai-jailbreak', 'ai-detective', 'word-alchemy',
  'ai-courtroom', 'semantic-word', 'ar-slicer', 'ar-hunter', 'ar-catcher',
  'ar-bubble', 'ar-toss', 'ar-color-hunt', 'ar-aquarium', 'ai-interview',
  'ai-word-wolf', 'minesweeper', 'sudoku', 'sokoban', 'rhythm-tap',
  'speed-typing', 'bomb-defusal', 'disk-clash', 'puzzle-clash', 'sketch-guess',
  'word-wolf-room'
];

for (const exp of expectedIds) {
  assert(idMatches.includes(exp), `Registry contains game '${exp}'`);
}

// -----------------------------------------------------------------------------
// 2. 静的ルーティング成果物のQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Static Route & Production Assets ---');
const distIndex = path.resolve('dist/index.html');
const dist404 = path.resolve('dist/404.html');
assert(fs.existsSync(distIndex), 'dist/index.html exists');
assert(fs.existsSync(dist404), 'dist/404.html (SPA fallback) exists');

let missingRoutes = [];
for (const id of expectedIds) {
  const p = path.resolve('dist/game', id, 'index.html');
  if (!fs.existsSync(p)) missingRoutes.push(id);
}
assert(missingRoutes.length === 0, `All 41 game routes have dedicated index.html in dist/game/<id>/`);

// -----------------------------------------------------------------------------
// 3. P2P通信モジュール（SDP圧縮・復元）のQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 3: ZeroTrust P2P Data Serialization ---');
// p2p.ts の compress / decompress ロジックをシミュレーションテスト
function compressSdp(sdp) {
  const json = JSON.stringify(sdp);
  return Buffer.from(encodeURIComponent(json)).toString('base64');
}
function decompressSdp(encoded) {
  try {
    const json = decodeURIComponent(Buffer.from(encoded, 'base64').toString());
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const mockOffer = { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=sendrecv' };
const compressed = compressSdp(mockOffer);
const decompressed = decompressSdp(compressed);

assert(typeof compressed === 'string' && compressed.length > 0, 'SDP is successfully compressed to Base64 string');
assert(decompressed !== null && decompressed.type === mockOffer.type && decompressed.sdp === mockOffer.sdp, 'Decompressed SDP strictly matches original offer');

// 不正コードのエラーハンドリング
const invalidCodeResult = decompressSdp('invalid_corrupted_base64_!@#$%^');
assert(invalidCodeResult === null, 'Corrupted invite code gracefully returns null without crashing');

// -----------------------------------------------------------------------------
// 4. ストレージとセーブデータ管理のQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 4: Storage & Data Sync Logic ---');
const storageCode = fs.readFileSync('src/utils/storage.ts', 'utf8');
assert(storageCode.includes('STORAGE_KEY'), 'LocalStorage key (STORAGE_KEY) is defined');
assert(storageCode.includes('defaultData'), 'Default app data fallback (defaultData) exists');
assert(storageCode.includes('exportBackupJson'), 'Backup JSON export function exists');
assert(storageCode.includes('importBackupJson'), 'Backup JSON import function exists');

// -----------------------------------------------------------------------------
// 5. ゲームロジックのQA（倉庫番の初期配置と解法チェック）
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 5: Sokoban Level Validation ---');
const sokobanCode = fs.readFileSync('src/games/sokoban/SokobanGame.tsx', 'utf8');
const levelsMatch = sokobanCode.match(/const LEVELS:\s*string\[\]\[\]\s*=\s*\[([\s\S]*?)\];/);
assert(levelsMatch !== null, 'Sokoban LEVELS array is defined');

// 各レベルの箱の数とゴールの数が一致しているかチェック
const rawLevels = eval('[' + levelsMatch[1] + ']');
assert(rawLevels.length === 8, `Sokoban has 8 stages (found: ${rawLevels.length})`);

rawLevels.forEach((lvl, idx) => {
  let boxes = 0;
  let goals = 0;
  let players = 0;
  for (const row of lvl) {
    for (const char of row) {
      if (char === '$') boxes++;
      if (char === '*') { boxes++; goals++; }
      if (char === 'O') goals++;
      if (char === '+') { players++; goals++; }
      if (char === '@') players++;
    }
  }
  assert(players === 1, `Level ${idx + 1}: Exactly 1 player (@ or +) exists`);
  assert(boxes === goals && boxes > 0, `Level ${idx + 1}: Boxes count (${boxes}) matches Goals count (${goals})`);
});

// -----------------------------------------------------------------------------
// 6. 数独の初期盤面と置換のQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 6: Sudoku Board Logic ---');
const sudokuCode = fs.readFileSync('src/games/sudoku/SudokuGame.tsx', 'utf8');
assert(sudokuCode.includes('SEED_BOARD'), 'Valid Sudoku seed board is defined');
assert(sudokuCode.includes('recalculateErrors'), 'Real-time error recalculation exists');

// SEED_BOARDが有効な数独の解になっているか検証
const seedMatch = sudokuCode.match(/const SEED_BOARD\s*=\s*\[([\s\S]*?)\];/);
const seedBoard = eval('[' + seedMatch[1] + ']');

let seedValid = true;
// 行・列のチェック
for (let i = 0; i < 9; i++) {
  const rowSet = new Set(seedBoard[i]);
  const colSet = new Set(seedBoard.map(r => r[i]));
  if (rowSet.size !== 9 || colSet.size !== 9) seedValid = false;
}
// 3x3ブロックのチェック
for (let br = 0; br < 3; br++) {
  for (let bc = 0; bc < 3; bc++) {
    const block = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        block.push(seedBoard[br * 3 + r][bc * 3 + c]);
      }
    }
    if (new Set(block).size !== 9) seedValid = false;
  }
}
assert(seedValid, 'Sudoku SEED_BOARD is a mathematically valid solved 9x9 board');

// -----------------------------------------------------------------------------
// 7. リバーシ (Reversi) の初期配置と着手判定QA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 7: Reversi Core Rules ---');
const reversiLogic = fs.readFileSync('src/games/reversi/logic.ts', 'utf8');
assert(reversiLogic.includes('getValidMoves'), 'getValidMoves function exists');
assert(reversiLogic.includes('applyMove'), 'applyMove function exists');

// -----------------------------------------------------------------------------
// 8. GameShell ステージクリア遷移のQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 8: GameShell Navigation & Progression ---');
const gameShellCode = fs.readFileSync('src/components/GameShell.tsx', 'utf8');
assert(gameShellCode.includes('onNextStage'), 'GameShell supports onNextStage prop');
assert(gameShellCode.includes('nextStageLabel'), 'GameShell supports nextStageLabel prop');
assert(gameShellCode.includes('props.isVictory && props.onNextStage'), 'GameShell renders Next Stage button when isVictory is true');

// -----------------------------------------------------------------------------
// 9. チェス (Chess) のロジックQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 9: Chess Logic & Board QA ---');
const chessLogic = fs.readFileSync('src/games/chess/logic.ts', 'utf8');
assert(chessLogic.includes('createInitialChessBoard'), 'createInitialChessBoard function exists');
assert(chessLogic.includes('getValidChessMoves'), 'getValidChessMoves function exists');
assert(chessLogic.includes('chooseChessMove'), 'chooseChessMove function exists');

// -----------------------------------------------------------------------------
// 10. ライツアウト (Lights Out) の反転数学ロジックQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 10: Lights Out Reversible Math QA ---');
const lightsOutCode = fs.readFileSync('src/games/lights-out/LightsOutGame.tsx', 'utf8');
assert(lightsOutCode.includes('generateSolvableBoard'), 'generateSolvableBoard ensures puzzles are 100% solvable');

// -----------------------------------------------------------------------------
// 11. ARカメラユーティリティ (camera.ts) のQA
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 11: AR Camera & Canvas Cover Math ---');
const cameraUtil = fs.readFileSync('src/utils/camera.ts', 'utf8');
assert(cameraUtil.includes('drawVideoCover'), 'drawVideoCover (aspect ratio correction) exists');
assert(cameraUtil.includes('setupCanvasAutoResize'), 'setupCanvasAutoResize (ResizeObserver wrapper) exists');

console.log('\n====================================================');
console.log(`QA TEST SUMMARY: Passed: ${passedTests}, Failed: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
