import { Component, createSignal, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { runLocalAI } from '../../utils/local-ai.ts';

const PUZZLE_WORDS = [
  { word: '夕焼け', hint: '一日が終わる頃、空を赤く染める美しい情景。', category: '自然・空' },
  { word: '珈琲', hint: '香ばしい苦味と香りで朝の目を覚ます黒い飲み物。', category: '飲み物・日常' },
  { word: '図書館', hint: '静寂の中に無数の本と知恵が集まる場所。', category: '場所・学問' },
  { word: '花火', hint: '夏の夜空に打ち上がり、一瞬で消える光の芸術。', category: 'イベント・光' },
  { word: '砂時計', hint: 'サラサラと落ちる砂粒で静かに時間を測る器具。', category: '道具・時間' },
  { word: '手紙', hint: '思いを紙に綴り、ポストに入れて相手に届けるもの。', category: '通信・想い' },
  { word: '深海', hint: '光の届かない海の底、静寂と未知の深み。', category: '自然・海' },
];

interface GuessEntry {
  word: string;
  temperature: number; // -20°C ~ 100°C
  label: string;
  color: string;
  order: number;
}

export const SemanticWordGame: Component = () => {
  const [puzzleIdx, setPuzzleIdx] = createSignal(0);
  const [guesses, setGuesses] = createSignal<GuessEntry[]>([]);
  const [inputText, setInputText] = createSignal('');
  const [isThinking, setIsThinking] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [hintRevealed, setHintRevealed] = createSignal(false);

  const target = () => PUZZLE_WORDS[puzzleIdx()];

  const restart = () => {
    setGuesses([]);
    setInputText('');
    setIsVictory(false);
    setHintRevealed(false);
  };

  const nextPuzzle = () => {
    setPuzzleIdx((prev) => (prev + 1) % PUZZLE_WORDS.length);
    restart();
    sound.playMatch(4);
  };

  // 意味的距離・温度計算 (ローカルAIセマンティクス)
  const calculateTemperature = async (guessedWord: string): Promise<number> => {
    const tgt = target().word;
    if (guessedWord.trim() === tgt) {
      return 100;
    }

    const sysPrompt = `あなたは意味的類似度（セマンティック距離）の計測器です。
秘密のお題の単語: 「${tgt}」
ユーザーが推測した単語: 「${guessedWord}」

この2つの単語の意味的・文脈的・連想的な近さを「-20 から 99 までの整数温度（℃）」で評価してください。
ルール:
・完全一致は100（既に除外）
・極めて強い関連（類義語、同一属性、密接な情景）: 75〜95
・中程度の関連（関連する場所、季節、一般的な連想）: 40〜74
・弱い関連（少し連想できる程度）: 15〜39
・全く関係ない無縁な単語: -20〜14
回答フォーマット: 数字のみを1行で出力してください（例: 68）`;

    const res = await runLocalAI(sysPrompt, `${tgt} vs ${guessedWord}`, () => {
      // フォールバック類似度計算
      const g = guessedWord.toLowerCase();
      const t = tgt.toLowerCase();

      // 部分一致
      if (t.includes(g) || g.includes(t)) return '88';

      // 文字の共通度
      let matchCount = 0;
      for (const char of g) {
        if (t.includes(char)) matchCount++;
      }
      if (matchCount > 0) return `${50 + matchCount * 15}`;

      // お題ごとのキーワードマッピング
      const semanticMaps: Record<string, Record<string, number>> = {
        夕焼け: { 空: 82, 太陽: 85, 赤: 80, 黄昏: 94, 夕方: 92, 日没: 95, 茜色: 96, 朝焼け: 88, 雲: 65, 影: 55, 夜: 70, 夏: 50 },
        珈琲: { カフェ: 90, 苦い: 82, 豆: 86, お茶: 78, 紅茶: 85, 朝: 60, 香り: 75, ミルク: 70, ドトール: 65, 砂糖: 68 },
        図書館: { 本: 95, 読書: 92, 静か: 80, 書籍: 94, 学校: 70, 司書: 90, 勉強: 75, 机: 60, 文学: 82 },
        花火: { 夏: 85, 夜空: 90, 祭り: 88, 光: 78, 浴衣: 82, 屋台: 70, 煙: 65, 音: 60, たまや: 95 },
        砂時計: { 時間: 92, 時計: 90, 砂: 88, 秒: 75, 計測: 80, 流れ: 70, ガラス: 75, タイマー: 85 },
      };

      const map = semanticMaps[tgt];
      if (map) {
        for (const [key, score] of Object.entries(map)) {
          if (g.includes(key) || key.includes(g)) return String(score);
        }
      }

      // 一般ランダム類似度 (-10 ~ 25)
      const hash = Array.from(g).reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return String((hash % 35) - 10);
    });

    const parsed = parseInt(res.trim().replace(/[^\d-]/g, ''), 10);
    return isNaN(parsed) ? 10 : Math.max(-20, Math.min(99, parsed));
  };

  const getTemperatureBadge = (temp: number) => {
    if (temp >= 100) return { label: '沸点！正解！', color: 'bg-rose-600 text-white border-rose-400' };
    if (temp >= 80) return { label: '超熱い！至近距離', color: 'bg-rose-500 text-white border-rose-300' };
    if (temp >= 60) return { label: '温かい', color: 'bg-amber-500 text-white border-amber-300' };
    if (temp >= 35) return { label: 'ぬるい', color: 'bg-yellow-500 text-slate-900 border-yellow-300' };
    if (temp >= 10) return { label: '冷たい', color: 'bg-sky-500 text-white border-sky-300' };
    return { label: '極寒', color: 'bg-slate-700 text-slate-300 border-slate-600' };
  };

  const handleGuessSubmit = async () => {
    const text = inputText().trim();
    if (!text || isThinking() || isVictory()) return;

    setInputText('');
    setIsThinking(true);
    sound.playPop(480);

    const temp = await calculateTemperature(text);
    const badge = getTemperatureBadge(temp);

    const newEntry: GuessEntry = {
      word: text,
      temperature: temp,
      label: badge.label,
      color: badge.color,
      order: guesses().length + 1,
    };

    setGuesses((prev) => [newEntry, ...prev]);

    if (temp >= 100) {
      setIsVictory(true);
      sound.playVictory();
    } else {
      sound.playPop(temp >= 60 ? 550 : 380);
    }

    setIsThinking(false);
  };

  // ソートされた推測リスト（温度が高い順）
  const sortedGuesses = () => {
    return [...guesses()].sort((a, b) => b.temperature - a.temperature);
  };

  // 最高到達温度
  const highestTemp = () => {
    if (guesses().length === 0) return 0;
    return Math.max(...guesses().map((g) => g.temperature));
  };

  const instructions = [
    '隠された「秘密のお題の言葉」を当てるパズルです。',
    'どんな単語でも自由に入力すると、お題との【意味的な近さ（-20℃〜100℃の温度）】が判定されます。',
    '「ぬるい」「温かい」「超熱い！」という温度を手がかりに連想を膨らませ、100℃（完全正解）を目指しましょう！',
    '【完全プライベート】端末内のローカルAIで推論するため、入力した単語が外部送信・学習されることは一切ありません。',
  ];

  return (
    <GameShell
      id="semantic-word"
      title="Semantic Thermometer (ことばの温度計)"
      score={isVictory() ? Math.max(100, 3000 - guesses().length * 100) : highestTemp() * 10}
      isGameOver={false}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-2xl h-full flex flex-col justify-between p-2 min-h-0 select-none">
        {/* 上部ステータスバー */}
        <div class="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md mb-2 shrink-0">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-sky-400 font-mono">
              お題 #{puzzleIdx() + 1}（カテゴリ: {target().category}）
            </span>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">試行: {guesses().length}回</span>
              <span class="text-emerald-400 font-mono text-[11px]">100% On-Device</span>
            </div>
          </div>

          {/* 最高温度バー */}
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-mono text-slate-400 shrink-0">最高到達温度:</span>
            <div class="flex-1 h-3.5 rounded-full bg-slate-950 overflow-hidden border border-slate-700/60 p-0.5">
              <div
                class="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, highestTemp())}%`,
                  'background-color':
                    highestTemp() >= 80 ? '#f43f5e' : highestTemp() >= 50 ? '#f59e0b' : '#38bdf8',
                }}
              />
            </div>
            <span
              class={`text-xs font-mono font-bold w-14 text-right shrink-0 ${
                highestTemp() >= 80 ? 'text-rose-400' : 'text-sky-400'
              }`}
            >
              {highestTemp()} ℃
            </span>
          </div>

          {/* ヒント表示ボタン */}
          <div class="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-800 text-xs">
            <Show
              when={hintRevealed()}
              fallback={
                <button
                  onClick={() => {
                    sound.playPop(420);
                    setHintRevealed(true);
                  }}
                  class="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                >
                  💡 AIのヒントを見る
                </button>
              }
            >
              <span class="text-[11px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                ヒント: {target().hint}
              </span>
            </Show>

            <button
              onClick={nextPuzzle}
              class="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              別のお題に変える →
            </button>
          </div>
        </div>

        {/* 推測履歴（温度順リスト） */}
        <div class="flex-1 w-full bg-slate-950 rounded-2xl p-3 border border-slate-800 shadow-inner overflow-y-auto flex flex-col gap-1.5 font-mono text-xs min-h-0 mb-2">
          <Show
            when={guesses().length > 0}
            fallback={
              <div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                <span>連想する言葉を自由に入力してください</span>
                <span class="text-[11px] text-slate-600">例: 「夜」「時間」「自然」「海」「空」など</span>
              </div>
            }
          >
            <For each={sortedGuesses()}>
              {(g) => (
                <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80 shadow-2xs">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-slate-500 w-5">#{g.order}</span>
                    <span class="font-bold text-slate-100 text-sm">{g.word}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${g.color}`}>
                      {g.label}
                    </span>
                    <span
                      class={`font-bold font-mono text-xs w-12 text-right ${
                        g.temperature >= 80 ? 'text-rose-400' : g.temperature >= 50 ? 'text-amber-400' : 'text-sky-400'
                      }`}
                    >
                      {g.temperature} ℃
                    </span>
                  </div>
                </div>
              )}
            </For>
          </Show>

          {/* 正解モーダル */}
          <Show when={isVictory()}>
            <div class="p-3 rounded-2xl bg-rose-950/80 border border-rose-500 text-center font-bold text-xs my-2 animate-in zoom-in-95">
              <div class="text-base text-rose-300 mb-1">🎉 100℃ 沸点到達！大正解！</div>
              <div class="text-white text-sm">
                お題の単語は『<span class="text-amber-300 font-bold">{target().word}</span>』でした！
              </div>
              <div class="text-[11px] text-rose-200 mt-1">{target().hint}</div>
              <button
                onClick={nextPuzzle}
                class="mt-2.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                次のお題へ挑戦！
              </button>
            </div>
          </Show>
        </div>

        {/* 単語推測入力フォーム */}
        <Show when={!isVictory()}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGuessSubmit();
            }}
            class="flex items-center gap-2 w-full shrink-0"
          >
            <input
              type="text"
              placeholder="連想する単語を入力 (例: 空, 赤, 太陽)..."
              value={inputText()}
              onInput={(e) => setInputText(e.currentTarget.value)}
              disabled={isThinking()}
              class="flex-1 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isThinking() || !inputText().trim()}
              class="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
            >
              {isThinking() ? '測定中...' : '測定する'}
            </button>
          </form>
        </Show>
      </div>
    </GameShell>
  );
};
