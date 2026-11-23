import { Component, createSignal, createEffect, For, Show, onCleanup } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { runLocalAI } from '../../utils/local-ai.ts';
import confetti from 'canvas-confetti';

interface SecretSubject {
  name: string;
  category: string;
  aliases: string[];
  isLiving: boolean;
  isFood: boolean;
  isManMade: boolean;
  isIndoor: boolean;
  isHoldable: boolean;
  isElectronic: boolean;
  hint1: string;
  hint2: string;
}

const SECRETS: SecretSubject[] = [
  {
    name: 'スマートフォン',
    category: '電子機器・日用品',
    aliases: ['スマホ', '携帯', '携帯電話', 'iphone', 'android'],
    isLiving: false,
    isFood: false,
    isManMade: true,
    isIndoor: true,
    isHoldable: true,
    isElectronic: true,
    hint1: '常に身につけて持ち歩く人が多いです。',
    hint2: '画面をタッチして情報を得たり連絡をとります。',
  },
  {
    name: '猫',
    category: '動物・ペット',
    aliases: ['ねこ', 'ネコ', 'cat', '子猫'],
    isLiving: true,
    isFood: false,
    isManMade: false,
    isIndoor: true,
    isHoldable: true,
    isElectronic: false,
    hint1: '気まぐれで愛くるしい仕草をします。',
    hint2: '「ニャー」と鳴いて喉をゴロゴロ鳴らします。',
  },
  {
    name: 'ラーメン',
    category: '食べ物・料理',
    aliases: ['らーめん', '中華そば', 'つけ麺'],
    isLiving: false,
    isFood: true,
    isManMade: true,
    isIndoor: true,
    isHoldable: true,
    isElectronic: false,
    hint1: '熱々のスープと麺のハーモニーが最高です。',
    hint2: 'チャーシューやメンマ、煮卵が乗っています。',
  },
  {
    name: '冷蔵庫',
    category: '大型家電',
    aliases: ['れいぞうこ', '冷凍庫'],
    isLiving: false,
    isFood: false,
    isManMade: true,
    isIndoor: true,
    isHoldable: false,
    isElectronic: true,
    hint1: 'キッチンになくてはならない大柄な存在です。',
    hint2: '扉を開けると中を冷やして食品を保存します。',
  },
  {
    name: '自転車',
    category: '乗り物',
    aliases: ['じてんしゃ', 'チャリ', 'バイク', 'ロードバイク'],
    isLiving: false,
    isFood: false,
    isManMade: true,
    isIndoor: false,
    isHoldable: false,
    isElectronic: false,
    hint1: 'ペダルを漕いで風を切って進みます。',
    hint2: '車輪が2つあり、エコな移動手段として親しまれています。',
  },
  {
    name: '傘',
    category: '日用品・雨具',
    aliases: ['かさ', 'アンブレラ', '日傘', '雨傘'],
    isLiving: false,
    isFood: false,
    isManMade: true,
    isIndoor: false,
    isHoldable: true,
    isElectronic: false,
    hint1: '天気が崩れたときに大活躍します。',
    hint2: 'パッと開いて頭上に掲げ、雨や日差しを遮ります。',
  },
  {
    name: 'ペンギン',
    category: '動物・鳥類',
    aliases: ['ぺんぎん', 'penguin'],
    isLiving: true,
    isFood: false,
    isManMade: false,
    isIndoor: false,
    isHoldable: true,
    isElectronic: false,
    hint1: '鳥の仲間ですが、空を飛ぶことはできません。',
    hint2: '白黒のタキシード姿でよちよち歩き、水中を素早く泳ぎます。',
  },
  {
    name: '富士山',
    category: '自然・名所',
    aliases: ['ふじさん', '富士', 'mt. fuji'],
    isLiving: false,
    isFood: false,
    isManMade: false,
    isIndoor: false,
    isHoldable: false,
    isElectronic: false,
    hint1: '日本の象徴とも言える雄大な自然です。',
    hint2: '日本一の標高を誇り、冬は頂上に雪を冠します。',
  },
  {
    name: '腕時計',
    category: 'アクセサリー・日用品',
    aliases: ['時計', 'とけい', 'うでどけい', 'ウォッチ'],
    isLiving: false,
    isFood: false,
    isManMade: true,
    isIndoor: true,
    isHoldable: true,
    isElectronic: true,
    hint1: '手首に巻きつけて使用します。',
    hint2: '針やデジタル表示で現在の時刻を教えてくれます。',
  },
  {
    name: 'カレーライス',
    category: '食べ物・料理',
    aliases: ['カレー', 'かれー', 'curry'],
    isLiving: false,
    isFood: true,
    isManMade: true,
    isIndoor: true,
    isHoldable: true,
    isElectronic: false,
    hint1: '給食やキャンプの超定番メニューです。',
    hint2: 'スパイスの香りが食欲をそそり、福神漬けが合います。',
  },
  {
    name: '飛行機',
    category: '乗り物',
    aliases: ['ひこうき', '航空機', 'ジェット機', 'airplane'],
    isLiving: false,
    isFood: false,
    isManMade: true,
    isIndoor: false,
    isHoldable: false,
    isElectronic: true,
    hint1: '巨大な翼を広げて空高く飛翔します。',
    hint2: '空港から飛び立ち、雲の上を通り世界中を旅します。',
  },
  {
    name: '本 (書籍)',
    category: '文化・日用品',
    aliases: ['本', '書籍', 'ほん', 'book', '読書', '教科書', '小説'],
    isLiving: false,
    isFood: false,
    isManMade: true,
    isIndoor: true,
    isHoldable: true,
    isElectronic: false,
    hint1: '紙を束ねて綴じたもので、知識や物語が詰まっています。',
    hint2: 'ページをめくりながら文字やイラストを読み進めます。',
  },
];

const QUICK_QUESTIONS = [
  '生き物（動物や植物）ですか？',
  '食べたり飲んだりできるものですか？',
  '片手で持ち運べるサイズですか？',
  '電気やバッテリーで動くものですか？',
  '普段、家の中（室内）にありますか？',
  '人間が作った人工物ですか？',
  '移動するときに乗るものですか？',
  '1万円以上する高価なものですか？',
];

interface QATurn {
  qNum: number;
  question: string;
  answerType: 'yes' | 'no' | 'partial' | 'unknown';
  answerText: string;
}

export const AiDetectiveGame: Component = () => {
  const [targetSecret, setTargetSecret] = createSignal<SecretSubject>(SECRETS[0]);
  const [qaList, setQaList] = createSignal<QATurn[]>([]);
  const [questionInput, setQuestionInput] = createSignal('');
  const [guessInput, setGuessInput] = createSignal('');
  const [isThinking, setIsThinking] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);
  const [isGameOver, setIsGameOver] = createSignal(false);
  const [showGuessModal, setShowGuessModal] = createSignal(false);
  const [guessFeedback, setGuessFeedback] = createSignal<string>('');
  const [score, setScore] = createSignal(0);

  // 判明したヒントタグ
  const [knownTraits, setKnownTraits] = createSignal<{ label: string; positive: boolean }[]>([]);

  let chatContainerRef: HTMLDivElement | undefined;
  const maxQuestions = 15;

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

  const restart = () => {
    const s = SECRETS[Math.floor(Math.random() * SECRETS.length)];
    setTargetSecret(s);
    setQaList([]);
    setQuestionInput('');
    setGuessInput('');
    setIsThinking(false);
    setIsVictory(false);
    setIsGameOver(false);
    setShowGuessModal(false);
    setGuessFeedback('');
    setKnownTraits([]);
  };

  const evaluateRuleAnswer = (qText: string, secret: SecretSubject): { type: 'yes' | 'no' | 'partial' | 'unknown'; text: string; trait?: { label: string; positive: boolean } } | null => {
    const q = qText.toLowerCase();

    // 1. 生き物判定
    if (q.includes('生き物') || q.includes('生物') || q.includes('動物') || q.includes('植物')) {
      return {
        type: secret.isLiving ? 'yes' : 'no',
        text: secret.isLiving ? 'はい、生き物です！' : 'いいえ、生き物ではありません。',
        trait: { label: '生き物', positive: secret.isLiving },
      };
    }

    // 2. 食べ物判定
    if (q.includes('食べ') || q.includes('飲ん') || q.includes('食料') || q.includes('料理') || q.includes('口に入')) {
      return {
        type: secret.isFood ? 'yes' : 'no',
        text: secret.isFood ? 'はい、食べたり飲んだりできます！' : 'いいえ、口に入れたり食べるものではありません。',
        trait: { label: '食べ物/飲み物', positive: secret.isFood },
      };
    }

    // 3. 人工物判定
    if (q.includes('人工物') || q.includes('人が作') || q.includes('人間が作') || q.includes('工業') || q.includes('工場')) {
      return {
        type: secret.isManMade ? 'yes' : 'no',
        text: secret.isManMade ? 'はい、人間が作った人工物です。' : 'いいえ、自然界に存在するものです。',
        trait: { label: '人工物', positive: secret.isManMade },
      };
    }

    // 4. サイズ・持ち運び
    if (q.includes('持てる') || q.includes('持ち運') || q.includes('片手') || q.includes('ポケット') || q.includes('カバン') || q.includes('小さい') || q.includes('手のひら')) {
      return {
        type: secret.isHoldable ? 'yes' : 'no',
        text: secret.isHoldable ? 'はい、手で持ったり持ち運べます。' : 'いいえ、手で手軽に持ち運ぶには大きすぎます。',
        trait: { label: '持ち運べるサイズ', positive: secret.isHoldable },
      };
    }

    // 5. 電気・機械
    if (q.includes('電気') || q.includes('バッテリー') || q.includes('充電') || q.includes('機械') || q.includes('電子') || q.includes('電源')) {
      return {
        type: secret.isElectronic ? 'yes' : 'no',
        text: secret.isElectronic ? 'はい、電気やバッテリーで動きます。' : 'いいえ、電気は使いません。',
        trait: { label: '電気/電子機器', positive: secret.isElectronic },
      };
    }

    // 6. 室内・場所
    if (q.includes('家の中') || q.includes('室内') || q.includes('部屋') || q.includes('リビング') || q.includes('キッチン')) {
      return {
        type: secret.isIndoor ? 'yes' : 'no',
        text: secret.isIndoor ? 'はい、普段は室内や家の中にあります。' : 'いいえ、基本的に屋外にあります。',
        trait: { label: '室内にある', positive: secret.isIndoor },
      };
    }

    // 7. 乗り物
    if (q.includes('乗る') || q.includes('乗り物') || q.includes('移動') || q.includes('交通')) {
      const isVehicle = secret.category.includes('乗り物');
      return {
        type: isVehicle ? 'yes' : 'no',
        text: isVehicle ? 'はい、人が乗って移動する乗り物です！' : 'いいえ、乗り物ではありません。',
        trait: { label: '乗り物', positive: isVehicle },
      };
    }

    return null;
  };

  const handleAskQuestion = async (qText: string) => {
    const text = qText.trim();
    if (!text || isThinking() || isGameOver() || isVictory()) return;

    sound.playPop(520);
    setIsThinking(true);
    setQuestionInput('');

    const secret = targetSecret();
    const currentQNum = qaList().length + 1;

    // ルールベース高速判定
    const ruleResult = evaluateRuleAnswer(text, secret);

    let answerType: 'yes' | 'no' | 'partial' | 'unknown' = 'unknown';
    let answerText = 'どちらとも言えません、または関係ない質問です。';

    if (ruleResult) {
      answerType = ruleResult.type;
      answerText = ruleResult.text;
      if (ruleResult.trait) {
        setKnownTraits((prev) => {
          if (!prev.some((t) => t.label === ruleResult.trait!.label)) {
            return [...prev, ruleResult.trait!];
          }
          return prev;
        });
      }
    } else {
      // 自由な質問の場合はローカルAIに問い合わせ
      const sysPrompt = `あなたは20の扉（20 Questions）の回答者です。
あなたの秘密の正体は「${secret.name}（ジャンル: ${secret.category}）」です。
プレイヤーからの質問に対して、「はい」「いいえ」「微妙・部分的にそう」「関係ない」のいずれかで簡潔に答えてください。
回答フォーマット:
[TYPE] YES または NO または PARTIAL または UNKNOWN
[ANSWER] プレイヤーへの日本語での一言返答（正体の名前は絶対に言わないこと）`;

      const aiResponse = await runLocalAI(sysPrompt, `質問: ${text}`, () => {
        return `[TYPE] UNKNOWN\n[ANSWER] その特徴については一概に言えません。`;
      });

      const typeMatch = aiResponse.match(/\[TYPE\]\s*(YES|NO|PARTIAL|UNKNOWN)/i);
      const rawType = typeMatch ? typeMatch[1].toUpperCase() : 'UNKNOWN';
      answerType = rawType === 'YES' ? 'yes' : rawType === 'NO' ? 'no' : rawType === 'PARTIAL' ? 'partial' : 'unknown';

      const ansMatch = aiResponse.match(/\[ANSWER\]\s*([\s\S]+)/i);
      answerText = ansMatch ? ansMatch[1].trim() : '判断が難しい質問です。';
    }

    // 思考ディレイ演出（臨場感）
    setTimeout(() => {
      sound.playPop(answerType === 'yes' ? 620 : 420);
      setQaList((prev) => [
        ...prev,
        {
          qNum: currentQNum,
          question: text,
          answerType,
          answerText,
        },
      ]);
      setIsThinking(false);
      scrollToBottom();

      // 15問終了判定
      if (currentQNum >= maxQuestions) {
        setIsGameOver(true);
        sound.playGameOver();
      }
    }, 600);
  };

  const handleFinalGuess = () => {
    const guess = guessInput().trim().toLowerCase();
    if (!guess) return;

    const secret = targetSecret();
    const correctNames = [secret.name.toLowerCase(), ...secret.aliases.map((a) => a.toLowerCase())];

    const isMatch = correctNames.some((c) => guess.includes(c) || c.includes(guess));

    if (isMatch) {
      sound.playVictory();
      setIsVictory(true);
      setShowGuessModal(false);

      // スコア計算: 質問数が少ないほど高得点！
      const turns = qaList().length;
      const calculatedScore = Math.max(500, 3000 - turns * 150);
      setScore(calculatedScore);
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    } else {
      sound.playGameOver();
      setGuessFeedback(`「${guessInput()}」ではありません！推理を続けてください。`);
    }
  };

  createEffect(
    () => qaList().length,
    () => {
      scrollToBottom();
    }
  );

  onCleanup(() => {
    // cleanup
  });

  restart();

  const instructions = [
    '【AI 20の扉】AIが心に決めた「秘密の正体」を、最大15問以内の質問で暴き出す推理ゲームです！',
    '「生き物ですか？」「食べられますか？」など、「はい / いいえ」で答えられる質問を入力またはタップしましょう。',
    '判明した特徴は上部に自動で蓄積されます。質問を重ねて対象を絞り込んでいきましょう。',
    '正体がピンと来たら、いつでも「🎯 正体を推理する！」ボタンから解答可能！少ない質問数で当てるほど高スコア獲得です！',
  ];

  return (
    <GameShell
      id="ai-detective"
      title="AI 20Q (20の扉)"
      score={score()}
      isGameOver={isGameOver()}
      isVictory={isVictory()}
      gameOverTitle="タイムアップ！質問切れ"
      gameOverMessage={`15問以内の推理に失敗しました！正解は「${targetSecret().name}」でした。`}
      victoryTitle="見事正解！名探偵！"
      victoryMessage={`素晴らしい洞察力！第${qaList().length}問で正解「${targetSecret().name}」を看破しました！`}
      onRestart={restart}
      instructions={instructions}
      extraControls={
        <div class="flex items-center justify-between w-full max-w-4xl px-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-bold">ジャンル:</span>
            <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
              {targetSecret().category}
            </span>
          </div>
          <button
            onClick={() => {
              sound.playPop(500);
              setShowGuessModal(true);
              setGuessFeedback('');
            }}
            class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <span>🎯</span>
            <span>正体を推理する！</span>
          </button>
        </div>
      }
    >
      <div class="w-full max-w-2xl h-full flex flex-col justify-between p-2 min-h-0 select-none gap-2">
        {/* 上部ステータス & 判明ヒントバッジ */}
        <div class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 px-3.5 shadow-2xs shrink-0 flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs font-mono font-bold">
            <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>質問数:</span>
              <span class="text-indigo-600 dark:text-indigo-400 text-sm font-black">{qaList().length}</span>
              <span>/ {maxQuestions}</span>
            </div>
            <div class="text-[11px] text-slate-400">
              <span>少ない質問で当てると高得点！</span>
            </div>
          </div>

          {/* 判明した特徴バッジ一覧 */}
          <div class="flex flex-wrap gap-1.5 items-center min-h-[24px]">
            <span class="text-[10px] text-slate-400 font-bold mr-1">判明した特徴:</span>
            <Show
              when={knownTraits().length > 0}
              fallback={<span class="text-[10px] text-slate-400 italic">質問して特徴を絞り込もう</span>}
            >
              <For each={knownTraits()}>
                {(t) => (
                  <span
                    class={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                      t.positive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    <span>{t.positive ? '⭕' : '❌'}</span>
                    <span>{t.label}</span>
                  </span>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* チャットタイムライン */}
        <div
          ref={chatContainerRef}
          class="flex-1 w-full bg-slate-950 rounded-2xl p-3 border border-slate-800 shadow-inner overflow-y-auto flex flex-col gap-3 text-xs min-h-0 scroll-smooth"
        >
          {/* ウェルカムメッセージ */}
          <div class="mr-auto bg-slate-900 border border-slate-800 text-slate-200 p-3 rounded-2xl max-w-[90%] shadow-2xs leading-relaxed">
            <div class="text-[10px] text-indigo-400 font-bold mb-1 flex items-center gap-1">
              <span>🕵️ AIマスター</span>
            </div>
            <div>
              私はある「<strong>{targetSecret().category}</strong>」を思い浮かべました。
              あなたが15問以内の質問でその正体を当ててください！「はい」か「いいえ」で答えられる質問をどうぞ。
            </div>
          </div>

          {/* 質問と回答履歴 */}
          <For each={qaList()}>
            {(qa) => (
              <div class="flex flex-col gap-2 w-full animate-in fade-in">
                {/* プレイヤー質問 */}
                <div class="ml-auto bg-indigo-600 text-white p-2.5 px-3.5 rounded-2xl rounded-tr-xs max-w-[85%] shadow-md">
                  <div class="text-[10px] text-indigo-200 font-bold mb-0.5 text-right">
                    質問 #{qa.qNum}
                  </div>
                  <div class="leading-relaxed font-semibold">{qa.question}</div>
                </div>

                {/* AI回答 */}
                <div class="mr-auto bg-slate-900 border border-slate-800 text-slate-100 p-2.5 px-3.5 rounded-2xl rounded-tl-xs max-w-[85%] shadow-2xs">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        qa.answerType === 'yes'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : qa.answerType === 'no'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {qa.answerType === 'yes'
                        ? '⭕ YES (はい)'
                        : qa.answerType === 'no'
                        ? '❌ NO (いいえ)'
                        : '🔺 PARTIAL (微妙)'}
                    </span>
                  </div>
                  <div class="leading-relaxed text-slate-300">{qa.answerText}</div>
                </div>
              </div>
            )}
          </For>

          {/* AI思考中 */}
          <Show when={isThinking()}>
            <div class="mr-auto bg-slate-900 p-2.5 px-3.5 rounded-2xl border border-slate-800 text-slate-400 text-xs flex items-center gap-2 animate-pulse">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ "animation-delay": "0ms" }} />
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ "animation-delay": "150ms" }} />
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ "animation-delay": "300ms" }} />
              <span class="text-[11px]">AIが判定中...</span>
            </div>
          </Show>
        </div>

        {/* 質問操作エリア */}
        <Show when={!isGameOver() && !isVictory()}>
          <div class="w-full flex flex-col gap-1.5 shrink-0">
            {/* クイック質問候補チップ */}
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <For each={QUICK_QUESTIONS}>
                {(q) => (
                  <button
                    onClick={() => handleAskQuestion(q)}
                    disabled={isThinking()}
                    class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {q}
                  </button>
                )}
              </For>
            </div>

            {/* 自由質問入力フォーム */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion(questionInput());
              }}
              class="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="質問を入力 (例: 金属でできていますか？)..."
                value={questionInput()}
                onInput={(e) => setQuestionInput(e.currentTarget.value)}
                disabled={isThinking()}
                class="flex-1 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isThinking() || !questionInput().trim()}
                class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                質問する
              </button>
            </form>
          </div>
        </Show>

        {/* 正体推理モーダル */}
        <Show when={showGuessModal()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center flex flex-col gap-3">
              <div class="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-500 flex items-center justify-center mx-auto text-2xl">
                🎯
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 dark:text-white">正体をズバリ推理！</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  あなたが導き出した答えを入力してください
                </p>
              </div>

              <input
                type="text"
                placeholder="例: 猫, スマートフォン..."
                value={guessInput()}
                onInput={(e) => setGuessInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinalGuess();
                }}
                class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-center focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />

              <Show when={guessFeedback()}>
                <p class="text-xs font-bold text-rose-500 animate-shake">{guessFeedback()}</p>
              </Show>

              <div class="flex gap-2 mt-1">
                <button
                  onClick={() => setShowGuessModal(false)}
                  class="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  まだ質問する
                </button>
                <button
                  onClick={handleFinalGuess}
                  disabled={!guessInput().trim()}
                  class="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  決定！
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
