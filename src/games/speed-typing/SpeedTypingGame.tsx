import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

interface WordPrompt {
  kanji: string;
  romaji: string;
}

const PROMPTS: WordPrompt[] = [
  { kanji: '桜吹雪', romaji: 'sakurafubuki' },
  { kanji: '春一番', romaji: 'haruichiban' },
  { kanji: '人工知能', romaji: 'jinkouchinou' },
  { kanji: '初志貫徹', romaji: 'shoshikantetsu' },
  { kanji: '一期一会', romaji: 'ichigoichie' },
  { kanji: '電光石火', romaji: 'denkousekka' },
  { kanji: '明鏡止水', romaji: 'meikyoushisui' },
  { kanji: '百花繚乱', romaji: 'hyakkaryouran' },
  { kanji: 'プログラミング', romaji: 'puroguramingu' },
  { kanji: 'アルゴリズム', romaji: 'arugorizumu' },
  { kanji: 'ウェブブラウザ', romaji: 'webuburauza' },
  { kanji: 'クラウドコンピューティング', romaji: 'kuraudokonpyu-teingu' },
  { kanji: 'オープンソース', romaji: 'o-punso-su' },
  { kanji: 'スマートフォン', romaji: 'suma-tofon' },
  { kanji: '花鳥風月', romaji: 'kachoufuugetsu' },
  { kanji: '臨機応変', romaji: 'rinkiouhen' },
];

export const SpeedTypingGame: Component = () => {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [score, setScore] = createSignal(0);
  const [currentPromptIdx, setCurrentPromptIdx] = createSignal(0);
  const [typedChars, setTypedChars] = createSignal('');
  const [totalKeyHits, setTotalKeyHits] = createSignal(0);
  const [totalMistakes, setTotalMistakes] = createSignal(0);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [inputVal, setInputVal] = createSignal('');

  let timerId: number | null = null;
  let inputRef: HTMLInputElement | undefined;

  const instructions = [
    '【タイピング＆フリック検定】画面に表示される単語を素早く正確に入力してタイピング速度を測定！',
    'PCはキーボードでそのままローマ字入力、スマホは入力欄をタップしてフリック入力できます。',
    '入力文字数（CPM）、正確率、コンボ数から、あなたのタイピングランク（C〜SSS神速）を判定します！',
    '制限時間は60秒間。ミスを減らしてハイスコアを目指しましょう！',
  ];

  const currentPrompt = () => PROMPTS[currentPromptIdx() % PROMPTS.length];

  const startGame = () => {
    sound.playPop(520);
    setIsPlaying(true);
    setTimeLeft(60);
    setScore(0);
    setCurrentPromptIdx(0);
    setTypedChars('');
    setTotalKeyHits(0);
    setTotalMistakes(0);
    setIsGameOver(false);
    setInputVal('');

    if (inputRef) inputRef.focus();

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerId!);
          finishGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const finishGame = () => {
    setIsPlaying(false);
    setIsGameOver(true);
    sound.playVictory();
    confetti({ particleCount: 50, spread: 80 });
  };

  const handleCharInput = (char: string) => {
    if (!isPlaying() || isGameOver()) return;

    setTotalKeyHits((h) => h + 1);
    const targetRomaji = currentPrompt().romaji;
    const currentTyped = typedChars();
    const nextExpected = targetRomaji[currentTyped.length];

    if (char.toLowerCase() === nextExpected.toLowerCase()) {
      sound.playPop(520 + currentTyped.length * 15);
      const newTyped = currentTyped + nextExpected;
      setTypedChars(newTyped);
      setScore((s) => s + 10);

      // 単語完成
      if (newTyped.length === targetRomaji.length) {
        sound.playMatch(5);
        setScore((s) => s + 50);
        setCurrentPromptIdx((idx) => idx + 1);
        setTypedChars('');
        setInputVal('');
      }
    } else {
      sound.playPop(200);
      setTotalMistakes((m) => m + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlaying()) return;
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      handleCharInput(e.key);
    }
  };

  // スマホ用インプット対応
  const handleMobileInput = (e: InputEvent) => {
    if (e.data) {
      for (const ch of e.data) {
        handleCharInput(ch);
      }
    }
    setInputVal('');
  };

  const cpm = () => {
    const elapsed = Math.max(1, 60 - timeLeft());
    return Math.round((totalKeyHits() / elapsed) * 60);
  };

  const accuracy = () => {
    if (totalKeyHits() === 0) return 100;
    return Math.max(0, Math.round(((totalKeyHits() - totalMistakes()) / totalKeyHits()) * 100));
  };

  const rank = () => {
    const speed = cpm();
    if (speed >= 380) return { title: 'SSS (神速)', color: 'text-amber-400' };
    if (speed >= 300) return { title: 'SS (超絶)', color: 'text-purple-400' };
    if (speed >= 230) return { title: 'S (達人)', color: 'text-rose-400' };
    if (speed >= 170) return { title: 'A (上級)', color: 'text-emerald-400' };
    if (speed >= 110) return { title: 'B (中級)', color: 'text-sky-400' };
    return { title: 'C (初級)', color: 'text-slate-400' };
  };

  onSettled(() => {
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerId) clearInterval(timerId);
    });
  });

  return (
    <GameShell
      id="speed-typing"
      title="Speed Typing Battle"
      score={score()}
      isGameOver={isGameOver()}
      isVictory={isGameOver()}
      onRestart={startGame}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between gap-3 w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-3 font-mono">
            <span>CPM: <strong class="text-indigo-500 font-bold">{cpm()}</strong></span>
            <span>正確率: <strong class="text-emerald-500 font-bold">{accuracy()}%</strong></span>
          </div>

          <div class="flex items-center gap-2">
            <span>残り: <strong class="text-rose-500 text-sm font-bold">{timeLeft()}</strong>s</span>
          </div>
        </div>
      }
    >
      <div class="w-full max-w-xl h-full flex flex-col items-center justify-center relative min-h-0 select-none p-2 gap-4">
        {/* 未スタート時 */}
        <Show when={!isPlaying() && !isGameOver()}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center flex flex-col items-center">
            <span class="text-4xl mb-2">⌨️</span>
            <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">
              タイピング・フリック検定
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              PCはキーボードを叩くだけ、スマホは入力欄をタップしてフリック入力で測定できます。
            </p>
            <button
              onClick={startGame}
              class="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl active:scale-95 transition-all"
            >
              ▶ 検定スタート (60秒)
            </button>
          </div>
        </Show>

        {/* プレイ中画面 */}
        <Show when={isPlaying()}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl flex flex-col items-center">
            {/* 漢字・単語表示 */}
            <div class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-wider">
              {currentPrompt().kanji}
            </div>

            {/* ローマ字ガイド表示 */}
            <div class="text-xl sm:text-2xl font-mono font-bold tracking-widest flex items-center mb-6">
              <span class="text-emerald-500">{typedChars()}</span>
              <span class="text-slate-300 dark:text-slate-600">
                {currentPrompt().romaji.slice(typedChars().length)}
              </span>
            </div>

            {/* スマホ用フォーカス対応インプット */}
            <input
              ref={inputRef}
              type="text"
              autocapitalize="off"
              autocomplete="off"
              spellcheck={false}
              aria-label="タイピング入力フィールド"
              value={inputVal()}
              onInput={handleMobileInput}
              class="w-full max-w-sm bg-slate-100 dark:bg-slate-800 border-2 border-indigo-400 rounded-xl px-4 py-2.5 text-center text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden"
              placeholder="タップしてキーボードを表示"
            />
          </div>
        </Show>

        {/* 結果発表カード */}
        <Show when={isGameOver()}>
          <div class="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center flex flex-col items-center animate-in zoom-in-95">
            <span class="text-4xl mb-1">🏆</span>
            <h2 class="text-xl font-black text-slate-900 dark:text-white mb-1">検定結果</h2>
            <div class={`text-3xl font-black my-2 ${rank().color}`}>
              {rank().title}
            </div>
            <div class="grid grid-cols-3 gap-3 w-full max-w-sm my-4 text-xs font-mono">
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div class="text-[10px] text-slate-400">速度 (CPM)</div>
                <div class="text-base font-black text-indigo-500 mt-0.5">{cpm()}</div>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div class="text-[10px] text-slate-400">正確率</div>
                <div class="text-base font-black text-emerald-500 mt-0.5">{accuracy()}%</div>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div class="text-[10px] text-slate-400">総スコア</div>
                <div class="text-base font-black text-amber-500 mt-0.5">{score()}</div>
              </div>
            </div>
            <button
              onClick={startGame}
              class="px-8 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md active:scale-95 transition-all"
            >
              もう一度挑戦
            </button>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
