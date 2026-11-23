import { Component, createSignal, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { runLocalAI } from '../../utils/local-ai.ts';
import confetti from 'canvas-confetti';

interface ResumeOption {
  id: string;
  title: string;
  subtitle: string;
  history: string;
  skill: string;
  pr: string;
}

interface InterviewTurn {
  question: string;
  intent: string;
}

const RESUMES: ResumeOption[] = [
  {
    id: 'demon-king',
    title: '元・魔王軍 総司令官',
    subtitle: '世界征服は惜しくも失敗したが、組織マネジメント力は抜群',
    history: '魔王城統括（300年）、四天王および十万体の魔物部下をマネジメント。勇者一行のレイド対策指揮。',
    skill: '大規模組織の統率、メガフレア、予算（魔力）最適化、危機管理',
    pr: '勇者の理不尽な急成長により惜敗しましたが、300年黒字経営を維持しました。弊社でもアグレッシブなシェア拡大に貢献できます。',
  },
  {
    id: 'neet-guard',
    title: '自宅警備主任（無職歴10年）',
    subtitle: 'インターネットの深淵を見つめ続け、不動の精神力を体得',
    history: '自室における定点観測（365日24時間）、掲示板およびSNSの常時監視とトレンド分析。',
    skill: '超高速リサーチ、不眠不休の監視、回線トラブル自力解決、孤独耐性',
    pr: '10年間一歩も家から出ず部屋を守り抜いた「驚異の定着率」と「忠誠心」をお約束します。リモートワークなら誰にも負けません。',
  },
  {
    id: 'time-traveler',
    title: '未来人（西暦2099年より来訪）',
    subtitle: '歴史の特異点を修正するため、なぜか現代の会社員を志望',
    history: '地球連邦量子ネットワーク保守（2090〜2099年）、タイムマシン航法士。',
    skill: '未来予測（株価・天災・AI動向）、反重力デバイス修理、時間跳躍',
    pr: '御社が2030年に世界トップ企業になる未来を見て参りました。その歴史を実現するためのキーパーソンとして応募いたしました。',
  },
  {
    id: 'cat',
    title: '猫（元・野良猫・推定4歳）',
    subtitle: '言葉は喋れないが、愛嬌と存在感で全社員の生産性を300%向上させる',
    history: '路地裏の縄張り管理、日向ぼっこ、気まぐれな通行人へのスリスリ業務。',
    skill: 'キーボードの上で寝る、ゴロゴロ音によるストレス低減、チュール要求',
    pr: 'ニャー（オフィスに私がいるだけで残業時間が半減し、社内エンゲージメントが爆上がりすることを保証します）。',
  },
];

const QUESTIONS_BY_RESUME: Record<string, InterviewTurn[]> = {
  'demon-king': [
    { question: '履歴書を拝見しました。「世界征服」が中途半端に終わった原因と、その失敗から弊社で活かせる学びを簡潔に教えてください。', intent: '失敗の分析力と改善意欲' },
    { question: '前職では部下（オークやゴーレムなど）の多様性が高かったようですが、意見の対立が起きた際のマネジメント方法を教えてください。', intent: 'チーム協調性とリーダーシップ' },
    { question: '最後に、もし弊社でプロジェクトが炎上した際、魔力や暴力を使わずにビジネスとしてどう鎮火させますか？', intent: 'コンプライアンスと論理的解決力' },
  ],
  'neet-guard': [
    { question: '10年間のブランクがありますが、この期間に他者との協調性やコミュニケーション能力をどう維持されていましたか？', intent: '対人スキルと客観性' },
    { question: '「驚異の定着率」とありますが、嫌なタスクや急な理不尽に直面した際、部屋に引きこもらず出社・対応し続けられますか？', intent: 'ストレス耐性と持続性' },
    { question: '弊社には20代の若手も多く在籍しています。10年間の深淵リサーチ経験を活かして、どのように社内へ付加価値を提供できますか？', intent: '独自価値の提案力' },
  ],
  'time-traveler': [
    { question: '2099年から来られたとのことですが、なぜ数ある時代・企業の中から、あえて現代の弊社を選抜されたのでしょうか？', intent: '志望動機の必然性と熱意' },
    { question: '未来の情報を知っている場合、インサイダー取引や歴史改変のコンプライアンス違反リスクが懸念されますが、どう制御しますか？', intent: '倫理観とリスク管理能力' },
    { question: '現代の原始的なPCや業務フロー（メールや紙の稟議など）にストレスを感じず、根気強く適応できる根拠を教えてください。', intent: '環境適応力と謙虚さ' },
  ],
  'cat': [
    { question: '弊社は人間中心の職場ですが、業務中の睡眠時間（1日16時間）と所定労働時間（8時間）の矛盾をどう調整するおつもりですか？', intent: '勤怠管理と労働意欲' },
    { question: '重要な役員プレゼン中にプロジェクターの光やコードに飛びついて会議を妨害しないと約束できますか？', intent: 'TPOの弁えと自制心' },
    { question: '最後に、鳴き声以外であなたの「圧倒的な癒やし力」を数値目標（KPI）としてコミットする方法を提示してください。', intent: '成果へのコミットメント' },
  ],
};

interface MessageLog {
  speaker: 'interviewer' | 'candidate';
  text: string;
  score?: number;
  comment?: string;
}

export const AiInterviewGame: Component = () => {
  const [selectedResume, setSelectedResume] = createSignal<ResumeOption | null>(null);
  const [currentRound, setCurrentRound] = createSignal(0); // 0, 1, 2
  const [inputText, setInputText] = createSignal('');
  const [isThinking, setIsThinking] = createSignal(false);
  const [logs, setLogs] = createSignal<MessageLog[]>([]);
  const [totalScore, setTotalScore] = createSignal(0);
  const [isFinished, setIsFinished] = createSignal(false);

  const instructions = [
    '【AI圧迫面接を突破せよ！】ユニークすぎる前歴の履歴書を選び、超エリートAI面接官の面接を受けます。',
    'AI面接官から3問の鋭い質問が飛んできます。どんな奇抜な職歴でも、論理と熱意とユーモアで納得させましょう！',
    '回答内容の「説得力」「ユーモア」「図太さ（メンタル）」が瞬時にAI採点されます。',
    '総合スコア70点以上で「内定獲得（採用）」！高得点ならSランク役員待遇のオファーレターが発行されます。',
  ];

  const handleSelectResume = (r: ResumeOption) => {
    sound.playPop(520);
    setSelectedResume(r);
    const qList = QUESTIONS_BY_RESUME[r.id] || QUESTIONS_BY_RESUME['demon-king'];
    setLogs([
      {
        speaker: 'interviewer',
        text: `本日はお時間をいただきありがとうございます。採用統括AIのRECRUIT-9000です。\n提出いただいた履歴書「${r.title}」を拝見しました。\n\nでは早速第1問です。\n${qList[0].question}`,
      },
    ]);
  };

  const handleSendAnswer = async () => {
    const text = inputText().trim();
    if (!text || isThinking() || isFinished()) return;

    sound.playPop(440);
    const currentQList = QUESTIONS_BY_RESUME[selectedResume()?.id || 'demon-king'];
    const currentQ = currentQList[currentRound()];

    // 回答ログ追加
    setLogs((l) => [...l, { speaker: 'candidate', text }]);
    setInputText('');
    setIsThinking(true);

    const roundNum = currentRound();
    const resume = selectedResume()!;

    // AI評価の生成
    const systemPrompt = `あなたは辛口だがユーモアを理解する超一流企業の面接官AI「RECRUIT-9000」です。
応募者の肩書: ${resume.title}
質問: ${currentQ.question}
質問の意図: ${currentQ.intent}
応募者の回答を評価し、0〜100点の点数と、面接官の講評（1〜2文）を出力してください。
出力フォーマット例:
SCORE: 85
COMMENT: 奇想天外な回答ですが、筋が通っており度胸を感じます。`;

    const userPrompt = `応募者の回答:「${text}」`;

    const fallbackEval = () => {
      // オフライン・フォールバック採点
      const len = text.length;
      let score = 55;
      if (len > 30) score += 15;
      if (len > 60) score += 10;
      if (text.includes('貢献') || text.includes('メリット') || text.includes('解決') || text.includes('成果') || text.includes('ニャー')) score += 12;
      if (text.includes('責任') || text.includes('実績') || text.includes('分析')) score += 8;
      score = Math.min(98, Math.max(45, score));

      const comments = [
        '度肝を抜く論理展開ですが、妙な説得力とパッションを感じます。',
        '前職の特殊経験をここまでビジネス用語に落とし込む手腕は見事です。',
        '少々屁理屈のきらいもありますが、臨機応変な胆力は高く評価できます。',
        '予想の斜め上をいく回答ですが、うちの社風には合っているかもしれません。',
      ];
      const comment = comments[Math.floor(Math.random() * comments.length)];
      return `SCORE: ${score}\nCOMMENT: ${comment}`;
    };

    let resultText = '';
    try {
      resultText = await runLocalAI(systemPrompt, userPrompt, fallbackEval);
    } catch {
      resultText = fallbackEval();
    }

    // パース
    const scoreMatch = resultText.match(/SCORE:\s*(\d+)/i);
    const commentMatch = resultText.match(/COMMENT:\s*(.+)/i);
    const turnScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 75;
    const comment = commentMatch ? commentMatch[1].trim() : '興味深い視点での回答です。';

    setTotalScore((s) => s + turnScore);

    const nextRound = roundNum + 1;
    setCurrentRound(nextRound);
    setIsThinking(false);

    if (nextRound < 3) {
      sound.playMatch(Math.min(nextRound + 2, 7));
      const nextQ = currentQList[nextRound];
      setLogs((l) => [
        ...l,
        {
          speaker: 'interviewer',
          text: `【評価: ${turnScore}点】\n${comment}\n\n続いて第${nextRound + 1}問です。\n${nextQ.question}`,
          score: turnScore,
          comment,
        },
      ]);
    } else {
      // 最終結果判定
      const avgScore = Math.round((totalScore() + turnScore) / 3);
      setTotalScore(avgScore);
      setIsFinished(true);

      if (avgScore >= 70) {
        sound.playVictory();
        confetti({ particleCount: 50, spread: 80, origin: { x: 0.5, y: 0.4 } });
      } else {
        sound.playGameOver();
      }

      const verdict =
        avgScore >= 90
          ? '【即時内定・執行役員待遇オファー】'
          : avgScore >= 70
          ? '【内定獲得（採用）】'
          : '【お見送り（不採用）】';

      setLogs((l) => [
        ...l,
        {
          speaker: 'interviewer',
          text: `【最終評価: ${turnScore}点】\n${comment}\n\n全3問の面接が終了しました。\n総合判定: ${verdict}\n平均スコア: ${avgScore}点\n${
            avgScore >= 70
              ? 'おめでとうございます！ユニークな受け答えが評価され、内定となりました！'
              : '残念ながら今回の採用は見送りとなりました。'
          }`,
        },
      ]);
    }
  };

  const restart = () => {
    setSelectedResume(null);
    setCurrentRound(0);
    setInputText('');
    setIsThinking(false);
    setLogs([]);
    setTotalScore(0);
    setIsFinished(false);
  };

  return (
    <GameShell
      id="ai-interview"
      title="AI Job Interview"
      score={totalScore()}
      isGameOver={isFinished() && totalScore() < 70}
      isVictory={isFinished() && totalScore() >= 70}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-2xl h-full flex flex-col items-center justify-between relative min-h-0 select-none p-2 gap-2">
        {/* 履歴書選択画面 */}
        <Show when={!selectedResume()}>
          <div class="w-full h-full flex flex-col items-center justify-center overflow-y-auto max-h-full py-2">
            <div class="text-center mb-4">
              <span class="text-3xl">👔</span>
              <h2 class="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                あなたの経歴（履歴書）を選択してください
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                どんな無茶な肩書でも、AI面接官を納得させれば内定獲得！
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              <For each={RESUMES}>
                {(r) => (
                  <button
                    onClick={() => handleSelectResume(r)}
                    class="flex flex-col text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-500 hover:shadow-md transition-all active:scale-[0.98] group"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {r.title}
                      </span>
                      <span class="text-xs text-indigo-500 font-bold">選ぶ →</span>
                    </div>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                      {r.subtitle}
                    </p>
                    <div class="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-[10px] text-slate-600 dark:text-slate-300">
                      <strong>特技:</strong> {r.skill}
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* 面接チャット画面 */}
        <Show when={selectedResume()}>
          <div class="w-full flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-0">
            {/* 上部ステータスバー */}
            <div class="flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 text-xs shrink-0">
              <div class="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <span>🤖 面接官: RECRUIT-9000</span>
              </div>
              <div class="flex items-center gap-2 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                <span>応募枠: <strong class="text-indigo-500 font-bold">{selectedResume()?.title}</strong></span>
                <span>問 {Math.min(currentRound() + 1, 3)}/3</span>
              </div>
            </div>

            {/* チャットログ */}
            <div class="flex-1 p-3 overflow-y-auto space-y-3 text-xs leading-relaxed">
              <For each={logs()}>
                {(msg) => (
                  <div
                    class={`flex flex-col ${
                      msg.speaker === 'candidate' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div class="text-[10px] text-slate-400 mb-0.5 px-1 font-bold">
                      {msg.speaker === 'candidate' ? 'あなた（応募者）' : 'AI面接官'}
                    </div>
                    <div
                      class={`max-w-[85%] rounded-2xl px-3.5 py-2.5 whitespace-pre-wrap shadow-2xs ${
                        msg.speaker === 'candidate'
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                )}
              </For>

              <Show when={isThinking()}>
                <div class="flex items-center gap-2 text-indigo-500 text-xs font-bold animate-pulse px-2 py-1">
                  <span>🤖 AI面接官が回答を採点・精査中...</span>
                </div>
              </Show>
            </div>

            {/* 入力フォーム */}
            <Show when={!isFinished()}>
              <div class="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0 flex gap-2">
                <input
                  type="text"
                  placeholder="あなたの回答を入力（説得力・ユーモア・熱意）..."
                  value={inputText()}
                  onInput={(e) => setInputText(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendAnswer();
                  }}
                  disabled={isThinking()}
                  class="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSendAnswer}
                  disabled={isThinking() || !inputText().trim()}
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shrink-0"
                >
                  回答
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </GameShell>
  );
};
