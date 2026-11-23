import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { runLocalAI } from '../../utils/local-ai.ts';

const PRESET_SECRETS = [
  'スマートフォン',
  'コーヒー',
  '冷蔵庫',
  '電子レンジ',
  '腕時計',
  '猫',
  '自転車',
  '花火',
  '本 (書籍)',
  '鏡',
  '傘',
  'エアコン',
];

interface DialogueTurn {
  questionNumber: number;
  question: string;
  answer?: string;
  aiGuess?: string;
}

export const AiDetectiveGame: Component = () => {
  const [secretWord, setSecretWord] = createSignal('');
  const [customWord, setCustomWord] = createSignal('');
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [dialogue, setDialogue] = createSignal<DialogueTurn[]>([]);
  const [currentInput, setCurrentInput] = createSignal('');
  const [isThinking, setIsThinking] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [aiFinalGuess, setAiFinalGuess] = createSignal<string | null>(null);

  let chatContainerRef: HTMLDivElement | undefined;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatContainerRef) {
        chatContainerRef.scrollTo({
          top: chatContainerRef.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  };

  createEffect(
    () => ({
      len: dialogue().length,
      ans: dialogue()[dialogue().length - 1]?.answer,
      thinking: isThinking(),
      over: isGameOver(),
    }),
    () => {
      scrollToBottom();
    }
  );

  const maxQuestions = 15;

  const startGameWithWord = (word: string) => {
    if (!word.trim()) return;
    setSecretWord(word.trim());
    setIsPlaying(true);
    setIsGameOver(false);
    setIsVictory(false);
    setDialogue([]);
    setAiFinalGuess(null);
    sound.playPop(520);
    askNextQuestion(1, []);
  };

  const askNextQuestion = async (qNum: number, currentTurns: DialogueTurn[]) => {
    setIsThinking(true);

    const historyStr = currentTurns
      .map((t) => `Q${t.questionNumber}: ${t.question}\nA${t.questionNumber}: ${t.answer || '未回答'}`)
      .join('\n');

    const sysPrompt = `あなたは名探偵AIです。プレイヤーが「ある物・概念」になりきっています。
あなたは質問を重ねてプレイヤーの正体を暴こうとしています。
これまでの対話履歴:
${historyStr}

今回の質問（第${qNum}問）を行ってください。
また、もし正体がほぼ特定できたと確信した場合は推理（GUESS）を提示してください。
フォーマット:
[GUESS] 推理した正体の単語（まだ特定できない場合は「NONE」）
[QUESTION] プレイヤーへの質問（「はい/いいえ」または簡潔に答えられる質問）`;

    const result = await runLocalAI(sysPrompt, `現在の質問番号: ${qNum}/${maxQuestions}`, () => {
      // フォールバック質問ルーチン
      const baseQuestions = [
        'あなたは生き物（動物・植物・人間）ですか？',
        'あなたは一般家庭の室内にあるものですか？',
        'あなたは電気やバッテリーで動くものですか？',
        'あなたは片手で持ち運べるサイズですか？',
        'あなたは食べたり飲んだりするものですか？',
        'あなたは金属やプラスチックでできていますか？',
        'あなたは屋外で使用されることが多いですか？',
        'あなたの値段は一般的に1万円以上しますか？',
        'あなたは毎日使われるものですか？',
        'あなたは音や光を発することがありますか？',
        'あなたは視覚や情報を伝えるものですか？',
        'あなたの寿命や耐久年数は数年以上ありますか？',
      ];
      const q = baseQuestions[(qNum - 1) % baseQuestions.length];
      return `[GUESS] NONE\n[QUESTION] ${q}`;
    });

    let guess = 'NONE';
    let question = result;

    const guessMatch = result.match(/\[GUESS\]\s*([^\n\r]+)/i);
    if (guessMatch) guess = guessMatch[1].trim();

    const qMatch = result.match(/\[QUESTION\]\s*([\s\S]+)/i);
    if (qMatch) question = qMatch[1].trim();

    // AIの推測が当たったか判定
    if (guess !== 'NONE' && guess.length > 0) {
      if (secretWord().includes(guess) || guess.includes(secretWord())) {
        setAiFinalGuess(guess);
        setIsGameOver(true);
        setIsVictory(false);
        sound.playGameOver();
        setIsThinking(false);
        return;
      }
    }

    setDialogue((prev) => [
      ...prev,
      {
        questionNumber: qNum,
        question,
        aiGuess: guess !== 'NONE' ? guess : undefined,
      },
    ]);

    setIsThinking(false);
  };

  const handleSendAnswer = async (ansText: string) => {
    const text = ansText.trim();
    if (!text || isThinking() || isGameOver()) return;

    sound.playPop(480);
    const turns = [...dialogue()];
    const lastIdx = turns.length - 1;
    turns[lastIdx].answer = text;
    setDialogue(turns);
    setCurrentInput('');

    const nextQNum = turns.length + 1;

    // 制限質問数到達
    if (nextQNum > maxQuestions) {
      // プレイヤーの完全勝利！AIは当てられなかった
      setIsGameOver(true);
      setIsVictory(true);
      sound.playVictory();
      return;
    }

    await askNextQuestion(nextQNum, turns);
  };

  const restart = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setIsVictory(false);
    setSecretWord('');
    setDialogue([]);
    setAiFinalGuess(null);
  };

  const instructions = [
    'あなたが「なりきる秘密の単語」を決めてゲームを開始します（AIには秘密にされます）。',
    'AI探偵が1問ずつ質問を投げかけてきます。「はい」「いいえ」または簡潔な文章で正直に答えてください。',
    'AIが途中であなたの正体をズバリ当てたらAIの勝利！',
    'AIに正体を特定させずに【15問の質問】を切り抜けられたら、あなたの完全勝利です！',
    '【完全プライベート】端末内のローカルAIで推論するため、秘密の単語や会話内容が外部送信・学習されることはありません。',
  ];

  return (
    <GameShell
      id="ai-detective"
      title="Reverse 20Q (AI探偵を欺け)"
      score={isVictory() ? 3000 : dialogue().length * 100}
      isGameOver={isGameOver() && !isVictory()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-2xl h-full flex flex-col justify-between p-2 min-h-0 select-none">
        {/* 単語選択画面 (未スタート時) */}
        <Show when={!isPlaying()}>
          <div class="flex-1 flex flex-col items-center justify-center gap-4 bg-white/90 dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto">
            <div class="text-center">
              <span class="text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                AI探偵 vs あなた
              </span>
              <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">
                あなたが「なりきる物」を選んでください
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                AI探偵が15問以内であなたの正体を推理してきます。
              </p>
            </div>

            {/* プリセット候補 */}
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 w-full max-w-lg">
              <For each={PRESET_SECRETS}>
                {(preset) => (
                  <button
                    onClick={() => startGameWithWord(preset)}
                    class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-400 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-95 text-center shadow-2xs"
                  >
                    {preset}
                  </button>
                )}
              </For>
            </div>

            <div class="w-full max-w-md flex items-center gap-2">
              <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
              <span class="text-[11px] text-slate-400 font-bold">または自由に設定</span>
              <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            </div>

            {/* 自由入力 */}
            <div class="flex items-center gap-2 w-full max-w-md">
              <input
                type="text"
                placeholder="好きな物・概念を入力 (例: カレー, ピアノ)..."
                value={customWord()}
                onInput={(e) => setCustomWord(e.currentTarget.value)}
                class="flex-1 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => startGameWithWord(customWord())}
                disabled={!customWord().trim()}
                class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                決定して開始
              </button>
            </div>
          </div>
        </Show>

        {/* プレイ画面 */}
        <Show when={isPlaying()}>
          {/* 上部ヘッダーインフォ */}
          <div class="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-900 text-white rounded-2xl mb-1.5 text-xs border border-slate-800 shadow-md shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-slate-400 text-[11px]">正体:</span>
              <span class="font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800 text-[11px] sm:text-xs">
                {secretWord()}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-slate-400 text-[11px]">
                質問: <strong class="text-white text-xs sm:text-sm font-mono">{dialogue().length}</strong> / {maxQuestions}
              </span>
              <span class="text-emerald-400 font-mono text-[10px] sm:text-[11px]">100% On-Device</span>
            </div>
          </div>

          {/* 質問・回答チャットログ */}
          <div
            ref={chatContainerRef}
            class="flex-1 w-full bg-slate-950 rounded-2xl p-2 sm:p-3 border border-slate-800 shadow-inner overflow-y-auto flex flex-col gap-2 font-mono text-xs min-h-0 mb-1.5 scroll-smooth"
          >
            <For each={dialogue()}>
              {(turn) => (
                <div class="flex flex-col gap-1.5 w-full">
                  {/* AI質問 */}
                  <div class="mr-auto bg-slate-900 border border-slate-800 text-slate-200 p-2.5 rounded-2xl max-w-[90%] shadow-2xs">
                    <div class="flex items-center gap-1.5 text-[10px] text-indigo-400 font-bold mb-1">
                      <span>AI探偵 [第{turn.questionNumber}問]</span>
                      <Show when={turn.aiGuess}>
                        <span class="text-amber-400 ml-1">（推理中: {turn.aiGuess}？）</span>
                      </Show>
                    </div>
                    <div class="text-xs leading-relaxed">{turn.question}</div>
                  </div>

                  {/* プレイヤー回答 */}
                  <Show when={turn.answer}>
                    <div class="ml-auto bg-indigo-950 border border-indigo-800 text-indigo-100 p-2.5 rounded-2xl max-w-[85%] shadow-2xs">
                      <div class="text-[10px] text-slate-400 font-bold mb-0.5 text-right">あなたの回答</div>
                      <div class="text-xs leading-relaxed">{turn.answer}</div>
                    </div>
                  </Show>
                </div>
              )}
            </For>

            <Show when={isThinking()}>
              <div class="mr-auto bg-slate-900 p-2.5 rounded-2xl border border-slate-800 text-slate-400 text-xs flex items-center gap-2 animate-pulse">
                <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>AI探偵が推理・次の質問を思考中...</span>
              </div>
            </Show>

            {/* ゲーム終了時の結果 */}
            <Show when={isGameOver()}>
              <div
                class={`p-3 rounded-2xl border text-center font-bold text-xs my-2 ${
                  isVictory()
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-700 text-rose-200'
                }`}
              >
                <div class="text-base mb-1">
                  {isVictory() ? '🎉 あなたの勝利！' : '🕵️ AI探偵の勝利！'}
                </div>
                <div>
                  {isVictory()
                    ? `AI探偵は15問以内にあなたの正体（${secretWord()}）を見破れませんでした！お見事！`
                    : `AI探偵があなたの正体を「${aiFinalGuess()}」と言い当てました！`}
                </div>
              </div>
            </Show>
          </div>

          {/* 入力エリア */}
          <Show when={!isGameOver()}>
            <div class="w-full flex flex-col gap-1.5 shrink-0">
              {/* クイック選択ボタン */}
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['はい', 'いいえ', 'どちらとも言えない', '場合による', '関係ない'].map((presetAns) => (
                  <button
                    onClick={() => handleSendAnswer(presetAns)}
                    disabled={isThinking()}
                    class="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    {presetAns}
                  </button>
                ))}
              </div>

              {/* 自由入力フォーム */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAnswer(currentInput());
                }}
                class="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="回答を入力 (例: はい、時々使います)..."
                  value={currentInput()}
                  onInput={(e) => setCurrentInput(e.currentTarget.value)}
                  onFocus={() => {
                    if (typeof window !== 'undefined') window.scrollTo(0, 0);
                  }}
                  disabled={isThinking()}
                  class="flex-1 p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isThinking() || !currentInput().trim()}
                  class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  回答する
                </button>
              </form>
            </div>
          </Show>
        </Show>
      </div>
    </GameShell>
  );
};
