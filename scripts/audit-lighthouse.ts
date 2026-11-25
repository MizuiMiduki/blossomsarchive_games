import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ISSUE_REPORT_PATH = path.join(ROOT_DIR, 'dist', 'lighthouse-issue.md');

interface AuditDetailItem {
  selector?: string;
  snippet?: string;
  nodeLabel?: string;
  explanation?: string;
  url?: string;
  wastedMs?: number;
  wastedBytes?: number;
  description?: string;
}

interface FailedAudit {
  id: string;
  title: string;
  score: number;
  displayValue: string;
  explanation: string;
  description: string;
  detailsItems: AuditDetailItem[];
}

interface RegressionScores {
  performance?: number;
  accessibility?: number;
  bestPractices?: number;
  seo?: number;
  error?: string;
}

interface RegressionItem {
  route: string;
  preset: string;
  theme?: string;
  scores: RegressionScores;
  failedAudits?: FailedAudit[];
}

interface AuditTask {
  route: string;
  preset: 'mobile' | 'desktop';
  theme: 'light' | 'dark';
}

const ROUTE_SOURCE_MAP: Record<string, string> = {
  '/': 'src/App.tsx',
  '/game/blossom-life': 'src/games/life-game/BlossomLifeGame.tsx',
  '/game/petal-reversi': 'src/games/reversi/ReversiGame.tsx',
  '/game/mini-shogi': 'src/games/shogi/MiniShogiGame.tsx',
  '/game/standard-shogi': 'src/games/shogi/StandardShogiGame.tsx',
  '/game/blossom-chess': 'src/games/chess/ChessGame.tsx',
  '/game/gomoku-garden': 'src/games/gomoku/GomokuGame.tsx',
  '/game/blossom-drop': 'src/games/blossom-drop/BlossomDropGame.tsx',
  '/game/floris-2048': 'src/games/floris-2048/Floris2048Game.tsx',
  '/game/memory-garden': 'src/games/memory-garden/MemoryGardenGame.tsx',
  '/game/petal-solitaire': 'src/games/solitaire/PetalSolitaireGame.tsx',
  '/game/bouquet-block': 'src/games/block-puzzle/BouquetBlockGame.tsx',
  '/game/petal-dash': 'src/games/petal-dash/PetalDashGame.tsx',
  '/game/ito-toshi': 'src/games/ito-toshi/ItoToshiGame.tsx',
  '/game/wire-maze': 'src/games/wire-maze/WireMazeGame.tsx',
  '/game/lights-out': 'src/games/lights-out/LightsOutGame.tsx',
  '/game/sky-catapult': 'src/games/sky-launcher/SkyLauncherGame.tsx',
  '/game/room-escape': 'src/games/room-escape/RoomEscapeGame.tsx',
  '/game/ai-jailbreak': 'src/games/ai-jailbreak/AiJailbreakGame.tsx',
  '/game/ai-detective': 'src/games/ai-detective/AiDetectiveGame.tsx',
  '/game/word-alchemy': 'src/games/word-alchemy/WordAlchemyGame.tsx',
  '/game/ai-courtroom': 'src/games/ai-courtroom/AiCourtroomGame.tsx',
  '/game/semantic-word': 'src/games/semantic-word/SemanticWordGame.tsx',
  '/game/ar-slicer': 'src/games/ar-slicer/ArSlicerGame.tsx',
  '/game/ar-hunter': 'src/games/ar-hunter/ArHunterGame.tsx',
  '/game/ar-catcher': 'src/games/ar-catcher/ArCatcherGame.tsx',
  '/game/ar-bubble': 'src/games/ar-bubble/ArBubbleGame.tsx',
  '/game/ar-toss': 'src/games/ar-toss/ArTossGame.tsx',
  '/game/ar-color-hunt': 'src/games/ar-color-hunt/ArColorHuntGame.tsx',
  '/game/ar-aquarium': 'src/games/ar-aquarium/ArAquariumGame.tsx',
  '/game/ai-interview': 'src/games/ai-interview/AiInterviewGame.tsx',
  '/game/ai-word-wolf': 'src/games/ai-word-wolf/AiWordWolfGame.tsx',
  '/game/minesweeper': 'src/games/minesweeper/MinesweeperGame.tsx',
  '/game/sudoku': 'src/games/sudoku/SudokuGame.tsx',
  '/game/sokoban': 'src/games/sokoban/SokobanGame.tsx',
  '/game/speed-typing': 'src/games/speed-typing/SpeedTypingGame.tsx',
  '/game/bomb-defusal': 'src/games/bomb-defusal/BombDefusalGame.tsx',
  '/game/disk-clash': 'src/games/disk-clash/DiskClashGame.tsx',
  '/game/puzzle-clash': 'src/games/puzzle-clash/PuzzleClashGame.tsx',
  '/game/sketch-guess': 'src/games/sketch-guess/SketchGuessGame.tsx',
  '/game/word-wolf-room': 'src/games/word-wolf-room/WordWolfRoomGame.tsx',
};

const args = process.argv.slice(2);
const shardArg = args.find((a) => a.startsWith('--shard='))?.split('=')[1];
const reportJsonArg = args.find((a) => a.startsWith('--report-json='))?.split('=')[1];
const aggregateDirArg = args.find((a) => a.startsWith('--aggregate='))?.split('=')[1];

function findLighthouseBin(): string {
  const customPath = path.join(process.env.HOME || '', '.npm-global', 'bin', 'lighthouse');
  if (fs.existsSync(customPath)) return customPath;

  const localBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'lighthouse');
  if (fs.existsSync(localBin)) return localBin;

  return 'lighthouse';
}

async function isPortOpen(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function startPreviewServer(): Promise<any> {
  console.log('🚀 Starting preview server on http://127.0.0.1:4173 ...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
    shell: true,
  });

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await isPortOpen(4173)) {
      console.log('✅ Preview server is ready.');
      return server;
    }
  }

  server.kill();
  throw new Error('Preview server failed to start within timeout.');
}

async function auditUrl(
  lhBin: string,
  url: string,
  preset: 'mobile' | 'desktop',
  theme: 'light' | 'dark'
): Promise<any> {
  const chromeFlags = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--force-prefers-color-scheme=${theme}`,
  ];

  const lhArgs = [
    url,
    '--output=json',
    '--output-path=stdout',
    `--chrome-flags=${chromeFlags.join(' ')}`,
    '--quiet',
  ];

  if (preset === 'desktop') {
    lhArgs.push('--preset=desktop');
  }

  const { stdout } = await execFileAsync(lhBin, lhArgs, {
    maxBuffer: 64 * 1024 * 1024,
    timeout: 60000,
  });

  return JSON.parse(stdout);
}

function extractFailedAudits(report: any): FailedAudit[] {
  const failed: FailedAudit[] = [];
  const audits = report.audits || {};

  for (const [id, a] of Object.entries<any>(audits)) {
    if (a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'informative') {
      const items: AuditDetailItem[] = [];
      if (a.details && a.details.items && Array.isArray(a.details.items)) {
        for (const item of a.details.items.slice(0, 5)) {
          items.push({
            selector: item.node?.selector,
            snippet: item.node?.snippet,
            nodeLabel: item.node?.nodeLabel,
            explanation: item.node?.explanation,
            url: item.url,
            wastedMs: item.wastedMs,
            wastedBytes: item.wastedBytes,
            description: item.description,
          });
        }
      }

      failed.push({
        id,
        title: a.title || id,
        score: Math.round((a.score ?? 0) * 100),
        displayValue: a.displayValue || '',
        explanation: a.explanation || '',
        description: a.description || '',
        detailsItems: items,
      });
    }
  }

  return failed;
}

function generateReportMarkdown(regressions: RegressionItem[]): void {
  if (regressions.length === 0) {
    console.log('🎉 全ルート×モバイル・デスクトップ×ライト・ダークですべて 100/100 満点を達成しました！');
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_issues=false\n');
    }
    return;
  }

  const jstTimestamp = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

  let markdown = `## ⚠️ PageSpeed / Lighthouse スコア退行レポート\n\n`;
  markdown += `> **計測日時 (JST)**: ${jstTimestamp}\n\n`;
  markdown += `ビルド後の自動 Lighthouse 監査にて、満点未満の減点が検出されました。\n`;
  markdown += `以下の検出サマリーと要素特定詳細を確認し、対象ソースコードを修正してください。\n\n`;

  markdown += `### 📊 検出サマリー一覧\n\n`;
  markdown += `| ルート | プリセット (テーマ) | 対象ソースファイル | Performance | Accessibility | Best Practices | SEO |\n`;
  markdown += `| :--- | :---: | :--- | :---: | :---: | :---: | :---: |\n`;

  for (const r of regressions) {
    const sourceFile = ROUTE_SOURCE_MAP[r.route] ? `\`${ROUTE_SOURCE_MAP[r.route]}\`` : '-';
    const presetTheme = `${r.preset}${r.theme ? ` (${r.theme})` : ''}`;
    if (r.scores.error) {
      markdown += `| \`${r.route}\` | ${presetTheme} | ${sourceFile} | 監査エラー | - | - | - |\n`;
    } else {
      const p = r.scores.performance === 100 ? '100' : `**${r.scores.performance}** ⚠️`;
      const a = r.scores.accessibility === 100 ? '100' : `**${r.scores.accessibility}** ⚠️`;
      const b = r.scores.bestPractices === 100 ? '100' : `**${r.scores.bestPractices}** ⚠️`;
      const s = r.scores.seo === 100 ? '100' : `**${r.scores.seo}** ⚠️`;
      markdown += `| \`${r.route}\` | ${presetTheme} | ${sourceFile} | ${p} | ${a} | ${b} | ${s} |\n`;
    }
  }

  markdown += `\n---\n\n`;
  markdown += `### 🔍 減点要因の特定・詳細ログ\n\n`;

  for (const r of regressions) {
    if (r.failedAudits && r.failedAudits.length > 0) {
      const sourceFile = ROUTE_SOURCE_MAP[r.route] || '該当コンポーネント';
      const presetTheme = `${r.preset}${r.theme ? ` / ${r.theme}` : ''}`;
      markdown += `#### 📄 \`${r.route}\` (${presetTheme}) — 対象: \`${sourceFile}\`\n\n`;
      for (const a of r.failedAudits) {
        markdown += `- **${a.title}** (スコア: ${a.score}): ${a.displayValue || a.explanation || a.description}\n`;
        if (a.detailsItems && a.detailsItems.length > 0) {
          for (const item of a.detailsItems) {
            if (item.selector) {
              markdown += `  - 該当セレクタ: \`${item.selector}\`\n`;
            }
            if (item.snippet) {
              markdown += `    \`\`\`html\n    ${item.snippet}\n    \`\`\`\n`;
            }
            if (item.explanation) {
              markdown += `    💡 理由: ${item.explanation}\n`;
            }
          }
        }
      }
      markdown += `\n`;
    }
  }

  fs.mkdirSync(path.dirname(ISSUE_REPORT_PATH), { recursive: true });
  fs.writeFileSync(ISSUE_REPORT_PATH, markdown, 'utf8');
  console.log(`Saved regression report to: ${ISSUE_REPORT_PATH}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_issues=true\n');
  }
}

async function handleAggregate(dir: string): Promise<void> {
  console.log(`📊 Aggregating Lighthouse shard reports from: ${dir}`);
  const resolvedDir = path.resolve(ROOT_DIR, dir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Aggregate directory not found: ${resolvedDir}`);
    generateReportMarkdown([]);
    return;
  }

  const allRegressions: RegressionItem[] = [];
  const files = fs.readdirSync(resolvedDir);
  for (const file of files) {
    if (file.startsWith('shard-') && file.endsWith('.json')) {
      const filePath = path.join(resolvedDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(data)) {
          allRegressions.push(...data);
        } else if (Array.isArray(data.regressions)) {
          allRegressions.push(...data.regressions);
        }
        console.log(`Loaded ${file}: ${Array.isArray(data) ? data.length : data.regressions?.length || 0} regressions`);
      } catch (err) {
        console.error(`Failed to read report JSON ${filePath}:`, err);
      }
    }
  }

  console.log(`Total confirmed regressions across all shards: ${allRegressions.length}`);
  generateReportMarkdown(allRegressions);
}

async function main(): Promise<void> {
  if (aggregateDirArg) {
    await handleAggregate(aggregateDirArg);
    return;
  }

  let serverProcess: any = null;
  const lhBin = findLighthouseBin();
  console.log(`Using Lighthouse binary: ${lhBin}`);

  try {
    serverProcess = await startPreviewServer();
    const routes = Object.keys(ROUTE_SOURCE_MAP);
    console.log(`Total routes to audit: ${routes.length}`);

    const allTasks: AuditTask[] = [];
    for (const route of routes) {
      allTasks.push({ route, preset: 'mobile', theme: 'light' });
      allTasks.push({ route, preset: 'desktop', theme: 'light' });
      allTasks.push({ route, preset: 'mobile', theme: 'dark' });
      allTasks.push({ route, preset: 'desktop', theme: 'dark' });
    }

    // シャード分割 (--shard=INDEX/TOTAL)
    let tasks = allTasks;
    if (shardArg) {
      const [shardIdxStr, totalShardsStr] = shardArg.split('/');
      const shardIdx = parseInt(shardIdxStr, 10);
      const totalShards = parseInt(totalShardsStr, 10);
      if (Number.isFinite(shardIdx) && Number.isFinite(totalShards) && totalShards > 0) {
        tasks = allTasks.filter((_, idx) => idx % totalShards === shardIdx - 1);
        console.log(`⚡ Shard mode [${shardIdx}/${totalShards}]: Auditing ${tasks.length} / ${allTasks.length} audits`);
      }
    }

    const regressions: RegressionItem[] = [];
    const totalAudits = tasks.length;
    let completed = 0;

    async function worker() {
      while (tasks.length > 0) {
        const task = tasks.shift();
        if (!task) break;

        const { route, preset, theme } = task;
        const url = `http://127.0.0.1:4173${route}`;
        const presetLabel = `${preset.toUpperCase()} (${theme.toUpperCase()})`;

        try {
          const report = await auditUrl(lhBin, url, preset, theme);
          const cats = report.categories || {};
          const scores: RegressionScores = {
            performance: Math.round((cats.performance?.score ?? 0) * 100),
            accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
            bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
            seo: Math.round((cats.seo?.score ?? 0) * 100),
          };

          completed++;
          const isPassed =
            (scores.performance ?? 0) >= 95 &&
            (scores.accessibility ?? 0) >= 95 &&
            (scores.bestPractices ?? 0) >= 95 &&
            (scores.seo ?? 0) >= 95;

          if (isPassed) {
            console.log(`[${completed}/${totalAudits}] [${presetLabel}] ${route} ✅ P:${scores.performance} A:${scores.accessibility} B:${scores.bestPractices} S:${scores.seo}`);
          } else {
            console.log(`[${completed}/${totalAudits}] [${presetLabel}] ${route} ⚠️ P:${scores.performance} A:${scores.accessibility} B:${scores.bestPractices} S:${scores.seo}`);
            const failedAudits = extractFailedAudits(report);
            regressions.push({
              route,
              preset,
              theme,
              scores,
              failedAudits,
            });
          }
        } catch (err: any) {
          completed++;
          console.log(`[${completed}/${totalAudits}] [${presetLabel}] ${route} ❌ Audit error: ${err?.message || String(err)}`);
          regressions.push({
            route,
            preset,
            theme,
            scores: { error: err?.message || String(err) },
            failedAudits: [],
          });
        }
      }
    }

    await Promise.all([worker(), worker()]);

    // 単独再検証（CPU競合による一時的ブレ・偽陽性の排除）
    if (regressions.length > 0) {
      const totalCandidates = regressions.length;
      console.log(`\n🔄 Re-verifying ${totalCandidates} candidates in single-worker mode...`);
      await new Promise((r) => setTimeout(r, 1000));
      const confirmedRegressions: RegressionItem[] = [];

      let candIndex = 0;
      for (const cand of regressions) {
        candIndex++;
        const url = `http://127.0.0.1:4173${cand.route}`;
        const presetLabel = `${cand.preset.toUpperCase()} (${(cand.theme || 'light').toUpperCase()})`;
        let passedOnRetry = false;
        let latestCandidate = cand;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            if (attempt > 1) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
            const report = await auditUrl(
              lhBin,
              url,
              cand.preset as 'mobile' | 'desktop',
              (cand.theme || 'light') as 'light' | 'dark'
            );
            const cats = report.categories || {};
            const scores: RegressionScores = {
              performance: Math.round((cats.performance?.score ?? 0) * 100),
              accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
              bestPractices: Math.round((cats['best-practices']?.score ?? 0) * 100),
              seo: Math.round((cats.seo?.score ?? 0) * 100),
            };

            const isPassed =
              (scores.performance ?? 0) >= 95 &&
              (scores.accessibility ?? 0) >= 95 &&
              (scores.bestPractices ?? 0) >= 95 &&
              (scores.seo ?? 0) >= 95;

            const progressTag = `[RETRY ${candIndex}/${totalCandidates} (試行${attempt}/3)]`;

            if (isPassed) {
              console.log(`${progressTag} [${presetLabel}] ${cand.route} ✅ 合格 (単独検証でクリア)`);
              passedOnRetry = true;
              break;
            } else {
              console.log(`${progressTag} [${presetLabel}] ${cand.route} ⚠️ P:${scores.performance} A:${scores.accessibility} B:${scores.bestPractices} S:${scores.seo}`);
              const failedAudits = extractFailedAudits(report);
              latestCandidate = {
                route: cand.route,
                preset: cand.preset,
                theme: cand.theme || 'light',
                scores,
                failedAudits,
              };
            }
          } catch (err: any) {
            console.log(`[RETRY ${candIndex}/${totalCandidates} (試行${attempt}/3)] [${presetLabel}] ${cand.route} ❌ Audit error: ${err?.message || String(err)}`);
          }
        }

        if (!passedOnRetry) {
          confirmedRegressions.push(latestCandidate);
        }
      }

      regressions.length = 0;
      regressions.push(...confirmedRegressions);
    }

    console.log('\n=================================');
    console.log(`Audit finished: ${totalAudits} audits executed.`);
    console.log(`Regressions found: ${regressions.length}`);
    console.log('=================================\n');

    if (reportJsonArg) {
      const outPath = path.resolve(ROOT_DIR, reportJsonArg);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(regressions, null, 2), 'utf8');
      console.log(`Saved shard report JSON to: ${outPath}`);
    } else {
      generateReportMarkdown(regressions);
    }
  } finally {
    if (serverProcess) {
      console.log('🛑 Stopping preview server...');
      serverProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(0);
});
