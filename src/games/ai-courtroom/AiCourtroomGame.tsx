import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { runLocalAI } from '../../utils/local-ai.ts';

interface CourtLog {
  speaker: 'prosecutor' | 'defense' | 'judge';
  speakerName: string;
  text: string;
  guiltDelta?: number;
}

const ACCUSATIONS = [
  {
    turn: 1,
    title: '疑惑1: 入館ログの存在',
    argument: '犯行時刻である昨夜23時42分、被害現場である星詠み天文台のゲートに、被告人本人の認証カードで通過した記録が残されている。言い逃れは不可能だ。',
  },
  {
    turn: 2,
    title: '疑惑2: 特殊粉末の付着',
    argument: '宝玉の展示ケースは強化サファイアガラス製であり、粉砕時に生じた微細なガラス結晶が被告人の右靴の底から検出された。現場に立ち入った確たる物証である。',
  },
  {
    turn: 3,
    title: '疑惑3: 犯行動機の存在',
    argument: '被告人の端末ログを調査したところ、先月多額の借金返済期限が迫っていた事実が判明した。換金性の高い国宝級の宝玉を狙う動機は極めて明白である。',
  },
  {
    turn: 4,
    title: '疑惑4: 現場防犯カメラの死角',
    argument: '防犯カメラが意図的に2分間ループ映像にすり替えられていた。これは天文台のシステム構造に詳しい被告人しか実行し得ないハッキング手口だ。',
  },
  {
    turn: 5,
    title: '疑惑5: 最終論告求刑',
    argument: 'これら全ての状況証拠・物証・動機が被告人を指し示している。公正なるAI裁判官よ、有罪判決を！',
  },
];

export const AiCourtroomGame: Component = () => {
  const [currentTurn, setCurrentTurn] = createSignal(1);
  const [guiltRate, setGuiltRate] = createSignal(100);
  const [logs, setLogs] = createSignal<CourtLog[]>([
    {
      speaker: 'judge',
      speakerName: 'AI裁判官 JUSTICE-09',
      text: '開廷します。事件番号404: 星詠み天文台「大星宝玉」窃盗事件。被告人、あなたの有罪推定率は現在100%です。検察の立証に対し、合理的な反論を行い嫌疑を晴らしてください。',
    },
    {
      speaker: 'prosecutor',
      speakerName: '検察AI DELTA',
      text: ACCUSATIONS[0].argument,
    },
  ]);
  const [inputText, setInputText] = createSignal('');
  const [isThinking, setIsThinking] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

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
    () => ({ len: logs().length, thinking: isThinking(), over: isGameOver() }),
    () => {
      scrollToBottom();
    }
  );

  const restart = () => {
    setCurrentTurn(1);
    setGuiltRate(100);
    setIsGameOver(false);
    setIsVictory(false);
    setLogs([
      {
        speaker: 'judge',
        speakerName: 'AI裁判官 JUSTICE-09',
        text: '開廷します。事件番号404: 星詠み天文台「大星宝玉」窃盗事件。被告人、あなたの有罪推定率は現在100%です。検察の立証に対し、合理的な反論を行い嫌疑を晴らしてください。',
      },
      {
        speaker: 'prosecutor',
        speakerName: '検察AI DELTA',
        text: ACCUSATIONS[0].argument,
      },
    ]);
  };

  const handleDefenseSubmit = async () => {
    const defenseText = inputText().trim();
    if (!defenseText || isThinking() || isGameOver()) return;

    sound.playPop(500);
    setInputText('');

    // プレイヤーの弁明ログ追加
    setLogs((prev) => [
      ...prev,
      {
        speaker: 'defense',
        speakerName: '被告人 (あなた)',
        text: defenseText,
      },
    ]);

    setIsThinking(true);

    const accusation = ACCUSATIONS[currentTurn() - 1];
    const sysPrompt = `あなたは厳格かつ中立公正なAI裁判長です。
審理中の嫌疑: 「${accusation.title}」
検察の主張: 「${accusation.argument}」
被告人の弁明: 「${defenseText}」

被告人の弁明の論理性、アリバイの成立度、物証への反論、別容疑者・陰謀・機器異常の可能性の合理性を総合評価してください。
フォーマット:
[GUILT_CHANGE] -35 〜 +10 の整数（説得力が高ければ-20〜-35、論理が薄ければ-5〜-10、矛盾や失言なら+5）
[JUDGE_VERDICT] 裁判長の法廷見解（被告人の主張のどの点に着目し、どう判断したかの簡潔な判示）`;

    const result = await runLocalAI(sysPrompt, `被告人弁明: ${defenseText}`, () => {
      // フォールバック判定ロジック
      const lower = defenseText.toLowerCase();
      let delta = -15;

      if (lower.includes('盗まれ') || lower.includes('紛失') || lower.includes('複製') || lower.includes('カード')) delta -= 10;
      if (lower.includes('アリバイ') || lower.includes('防犯カメラ') || lower.includes('同僚') || lower.includes('目撃')) delta -= 15;
      if (lower.includes('別') || lower.includes('真犯人') || lower.includes('罠') || lower.includes('偽造')) delta -= 10;
      if (defenseText.length > 30) delta -= 5;

      let comment = '';
      if (delta <= -25) {
        comment = `被告人の指摘した論拠には極めて高い合理性がある。検察側物証の信憑性に疑問が生じたため、有罪推定率を大きく引き下げる。`;
      } else {
        comment = `被告人の弁明を聴取した。一定の考慮に値するが、決定的な反証とは言えない。慎重に審理を継続する。`;
      }

      return `[GUILT_CHANGE] ${delta}\n[JUDGE_VERDICT] ${comment}`;
    });

    let delta = -15;
    let verdict = result;

    const deltaMatch = result.match(/\[GUILT_CHANGE\]\s*([+-]?\d+)/i);
    if (deltaMatch) delta = parseInt(deltaMatch[1], 10);

    const verdictMatch = result.match(/\[JUDGE_VERDICT\]\s*([\s\S]+)/i);
    if (verdictMatch) verdict = verdictMatch[1].trim();

    const newGuilt = Math.max(0, Math.min(100, guiltRate() + delta));
    setGuiltRate(newGuilt);

    setLogs((prev) => [
      ...prev,
      {
        speaker: 'judge',
        speakerName: 'AI裁判官 JUSTICE-09',
        text: verdict,
        guiltDelta: delta,
      },
    ]);

    sound.playPop(delta < 0 ? 580 : 340);

    // ターン終了判定
    const nextTurn = currentTurn() + 1;

    if (newGuilt <= 30) {
      // 早期無罪判決！
      setIsGameOver(true);
      setIsVictory(true);
      sound.playVictory();
      setLogs((prev) => [
        ...prev,
        {
          speaker: 'judge',
          speakerName: 'AI裁判官 JUSTICE-09',
          text: `【判決言渡】有罪推定率が${newGuilt}%まで低下しました。「疑わしきは被告人の利益に」。主文、被告人は無罪！`,
        },
      ]);
      setIsThinking(false);
      return;
    }

    if (nextTurn > ACCUSATIONS.length) {
      // 全ターン終了時の最終判決
      setIsGameOver(true);
      const won = newGuilt <= 30;
      setIsVictory(won);
      if (won) sound.playVictory();
      else sound.playGameOver();

      setLogs((prev) => [
        ...prev,
        {
          speaker: 'judge',
          speakerName: 'AI裁判官 JUSTICE-09',
          text: won
            ? `【結審・無罪】有罪推定率${newGuilt}%。検察側の立証は不十分と判断する。主文、無罪！`
            : `【結審・有罪】有罪推定率${newGuilt}%。合理的な疑いを超える嫌疑が維持された。主文、被告人を懲役刑に処する。`,
        },
      ]);
      setIsThinking(false);
      return;
    }

    // 次の検察追及へ
    setCurrentTurn(nextTurn);
    setLogs((prev) => [
      ...prev,
      {
        speaker: 'prosecutor',
        speakerName: '検察AI DELTA',
        text: ACCUSATIONS[nextTurn - 1].argument,
      },
    ]);

    setIsThinking(false);
  };

  const instructions = [
    '無実の罪を着せられたあなたが、法廷で検察AIの主張に対して反論を行います。',
    'AI裁判官はあなたの反論の論理性・アリバイの成立度・科学的反証の妥当性を厳格に評価します。',
    '説得力のある主張を行うことで「有罪推定率」が下がり、全5ターン以内に【30%以下】まで下げれば「無罪判決」を勝ち取れます！',
    '【完全プライベート】端末内のローカルAIで推論するため、法廷での発言内容が外部送信・学習されることは一切ありません。',
  ];

  return (
    <GameShell
      id="ai-courtroom"
      title="AI Courtroom (AI心理法廷)"
      score={isVictory() ? 4000 - guiltRate() * 20 : (100 - guiltRate()) * 10}
      isGameOver={isGameOver() && !isVictory()}
      isVictory={isVictory()}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-2xl h-full flex flex-col justify-between p-2 min-h-0 select-none">
        {/* 上部有罪ゲージ */}
        <div class="bg-slate-900 text-white rounded-2xl p-2 sm:p-2.5 border border-slate-800 shadow-md mb-1.5 shrink-0">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-amber-400 text-[11px] sm:text-xs">審理ラウンド: {currentTurn()} / 5</span>
            <span class="text-emerald-400 font-mono text-[10px] sm:text-[11px]">100% On-Device</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] sm:text-[11px] font-mono text-slate-400 shrink-0">有罪率:</span>
            <div class="flex-1 h-2.5 sm:h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-700/60 p-0.5">
              <div
                class="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${guiltRate()}%`,
                  'background-color':
                    guiltRate() > 60 ? '#ef4444' : guiltRate() > 30 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <span
              class={`text-[11px] sm:text-xs font-mono font-bold w-12 text-right shrink-0 ${
                guiltRate() <= 30 ? 'text-emerald-400' : guiltRate() <= 60 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {guiltRate()}%
            </span>
          </div>

          <div class="text-[9px] sm:text-[10px] text-slate-400 text-right mt-0.5">
            ※30%以下に引き下げると無罪確定
          </div>
        </div>

        {/* 法廷会話ログ */}
        <div
          ref={chatContainerRef}
          class="flex-1 w-full bg-slate-950 rounded-2xl p-2 sm:p-2.5 border border-slate-800 shadow-inner overflow-y-auto flex flex-col gap-2 font-mono text-xs min-h-0 mb-1.5 scroll-smooth"
        >
          <For each={logs()}>
            {(log) => (
              <div
                class={`p-2.5 rounded-2xl max-w-[88%] leading-relaxed ${
                  log.speaker === 'defense'
                    ? 'ml-auto bg-indigo-950 border border-indigo-800 text-indigo-100'
                    : log.speaker === 'prosecutor'
                    ? 'mr-auto bg-rose-950/80 border border-rose-800 text-rose-100'
                    : 'mx-auto w-full bg-slate-900 border border-amber-600/50 text-amber-100'
                }`}
              >
                <div class="flex items-center justify-between text-[10px] font-bold mb-1 opacity-80">
                  <span>{log.speakerName}</span>
                  <Show when={log.guiltDelta !== undefined}>
                    <span
                      class={`font-mono font-bold ${
                        log.guiltDelta! < 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      有罪率変動: {log.guiltDelta! > 0 ? `+${log.guiltDelta}` : log.guiltDelta}%
                    </span>
                  </Show>
                </div>
                <div class="whitespace-pre-wrap">{log.text}</div>
              </div>
            )}
          </For>

          <Show when={isThinking()}>
            <div class="mx-auto bg-slate-900 p-2.5 rounded-2xl border border-slate-800 text-slate-400 text-xs flex items-center gap-2 animate-pulse">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>AI裁判長が弁明の論理性を検証中...</span>
            </div>
          </Show>
        </div>

        {/* 弁明入力フォーム */}
        <Show
          when={!isGameOver()}
          fallback={
            <div class="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs font-bold shrink-0">
              {isVictory() ? (
                <span class="text-emerald-400 text-sm">無罪判決を勝ち取りました！</span>
              ) : (
                <span class="text-rose-400 text-sm">有罪判決が下されました。リスタートして再挑戦！</span>
              )}
            </div>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDefenseSubmit();
            }}
            class="flex items-center gap-2 w-full shrink-0"
          >
            <input
              type="text"
              placeholder="検察の主張に対する反論・アリバイ・物証の疑義を入力..."
              value={inputText()}
              onInput={(e) => setInputText(e.currentTarget.value)}
              onFocus={() => {
                if (typeof window !== 'undefined') window.scrollTo(0, 0);
              }}
              disabled={isThinking()}
              class="flex-1 p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isThinking() || !inputText().trim()}
              class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
            >
              反論する
            </button>
          </form>
        </Show>
      </div>
    </GameShell>
  );
};
