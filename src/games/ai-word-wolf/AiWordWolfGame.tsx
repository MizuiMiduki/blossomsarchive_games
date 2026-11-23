import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

interface TopicPair {
  citizen: string;
  wolf: string;
  category: string;
  hints: {
    citizenHints: string[];
    wolfHints: string[];
  };
}

const TOPICS: TopicPair[] = [
  {
    citizen: 'ラーメン',
    wolf: 'うどん',
    category: '麺料理',
    hints: {
      citizenHints: ['スープの濃さや麺の硬さを選べることが多いです。', 'チャーシューや煮卵が乗っていると嬉しい。', '飲んだ後のシメに食べたくなります。'],
      wolfHints: ['出汁が効いていて、温かいのも冷たいのも美味しいです。', '天ぷらやお揚げをトッピングするのが好きです。', '消化に良くてホッとする味ですね。'],
    },
  },
  {
    citizen: 'ディズニーランド',
    wolf: 'USJ（ユニバ）',
    category: 'テーマパーク',
    hints: {
      citizenHints: ['夢と魔法の空間で、カチューシャをつけて歩きたくなります。', 'パレードや夜の花火がとても幻想的です。', 'ネズミやアヒルの人気キャラクターがいますね。'],
      wolfHints: ['映画やアニメの世界観に入り込める大迫力のアトラクションが多いです。', '被り物やコスプレをして一日中テンションが上がります。', 'マリオや恐竜、魔法使いのエリアが有名です。'],
    },
  },
  {
    citizen: '焼肉',
    wolf: 'すき焼き',
    category: 'ごちそう肉料理',
    hints: {
      citizenHints: ['網や鉄板の上でジュージュー焼いてタレにつけて食べます。', 'カルビや牛タン、ホルモンなど部位を選べるのが楽しい。', 'ビールや白ご飯が無限に進む最高のごちそうです。'],
      wolfHints: ['甘辛い割り下で煮て、生卵に絡めて食べるのが最高です。', 'お肉だけじゃなくネギや豆腐、春雨も味が染みて絶品です。', 'お正月や特別な記念日に家族で鍋を囲むイメージです。'],
    },
  },
  {
    citizen: 'カレーライス',
    wolf: 'ハヤシライス',
    category: '定番洋食',
    hints: {
      citizenHints: ['スパイスが効いていて、辛さの段階が選べます。', '福神漬けやらっきょうがよく合います。', 'キャンプや給食で定番の人気メニューですね。'],
      wolfHints: ['トマトやデミグラスソースのコクと甘みがあります。', '薄切り肉と玉ねぎがたっぷり入っていて優しい味です。', '辛いのが苦手な人でも美味しく食べられます。'],
    },
  },
  {
    citizen: 'スマートフォン',
    wolf: 'ノートパソコン',
    category: '電子機器',
    hints: {
      citizenHints: ['片手で操作できて、常にポケットやカバンに入れています。', 'タッチパネルでアプリを動かしたり写真を撮ったりします。', 'バッテリーが切れると現代人は生きていけません。'],
      wolfHints: ['キーボードで文字を打ったり、画面を開いて作業します。', '持ち運びできてカフェやオフィスでよく使われます。', 'トラックパッドやマウスを使って操作しますね。'],
    },
  },
];

interface ChatMessage {
  speaker: string;
  avatar: string;
  role: 'player' | 'alice' | 'bob' | 'carol';
  text: string;
}

export const AiWordWolfGame: Component = () => {
  const [gameState, setGameState] = createSignal<'playing' | 'voting' | 'result'>('playing');
  const [round, setRound] = createSignal(1); // 1, 2, 3
  const [playerIsWolf, setPlayerIsWolf] = createSignal(false);
  const [currentTopic, setCurrentTopic] = createSignal(TOPICS[0]);
  const [playerWord, setPlayerWord] = createSignal('');
  const [logs, setLogs] = createSignal<ChatMessage[]>([]);
  const [inputText, setInputText] = createSignal('');
  const [winner, setWinner] = createSignal<'citizen' | 'wolf' | null>(null);
  const [wolfPlayer, setWolfPlayer] = createSignal<string>('');
  const [score, setScore] = createSignal(0);

  const instructions = [
    '【AIワードウルフ】あなたと3人のAI（アリス・ボブ・キャロル）の中に、1人だけ違うお題を持つ「ウルフ（人狼）」が潜んでいます！',
    'あなたに配られたお題を確認してください。ただし、自分が「多数派（市民）」か「少数派（ウルフ）」かは分かりません！',
    '3回の会話ターンで、自分のお題について一言ずつ発言します。お題そのものを言ってしまうと即バレするので注意！',
    '違和感のある発言を見極め、最後に「誰がウルフか」を投票で決定します。ウルフを追放できれば市民の勝ち、騙し通せばウルフの勝ちです。',
  ];

  const AI_PLAYERS = [
    { id: 'alice', name: 'アリス', avatar: '👩‍💼', desc: '論理的・慎重派' },
    { id: 'bob', name: 'ボブ', avatar: '🧑‍🎨', desc: '直感・おとぼけ派' },
    { id: 'carol', name: 'キャロル', avatar: '🕵️‍♀️', desc: '観察・鋭い探偵派' },
  ];

  const restart = () => {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    setCurrentTopic(topic);

    // ウルフの決定（プレイヤーまたはAI）
    const isWolf = Math.random() < 0.35;
    setPlayerIsWolf(isWolf);
    setPlayerWord(isWolf ? topic.wolf : topic.citizen);

    const wolfName = isWolf
      ? 'あなた'
      : AI_PLAYERS[Math.floor(Math.random() * AI_PLAYERS.length)].name;
    setWolfPlayer(wolfName);

    setGameState('playing');
    setRound(1);
    setWinner(null);

    // 最初のAI発言
    const firstSpeaker = AI_PLAYERS[0];
    const isFirstWolf = wolfName === firstSpeaker.name;
    const hints = isFirstWolf ? topic.hints.wolfHints : topic.hints.citizenHints;

    setLogs([
      {
        speaker: firstSpeaker.name,
        avatar: firstSpeaker.avatar,
        role: 'alice',
        text: hints[0],
      },
    ]);
  };

  const handleSendStatement = () => {
    const text = inputText().trim();
    if (!text || gameState() !== 'playing') return;

    sound.playPop(500);
    // プレイヤーの発言追加
    const newLogs: ChatMessage[] = [
      ...logs(),
      { speaker: 'あなた', avatar: '👤', role: 'player', text },
    ];

    const currentR = round();
    const topic = currentTopic();

    // ボブの発言
    const isBobWolf = wolfPlayer() === 'ボブ';
    const bobHints = isBobWolf ? topic.hints.wolfHints : topic.hints.citizenHints;
    newLogs.push({
      speaker: 'ボブ',
      avatar: '🧑‍🎨',
      role: 'bob',
      text: bobHints[Math.min(currentR - 1, bobHints.length - 1)],
    });

    // キャロルの発言
    const isCarolWolf = wolfPlayer() === 'キャロル';
    const carolHints = isCarolWolf ? topic.hints.wolfHints : topic.hints.citizenHints;
    newLogs.push({
      speaker: 'キャロル',
      avatar: '🕵️‍♀️',
      role: 'carol',
      text: carolHints[Math.min(currentR - 1, carolHints.length - 1)],
    });

    setLogs(newLogs);
    setInputText('');

    if (currentR < 2) {
      setRound((r) => r + 1);
      // 次のラウンドのアリスの発言
      const isAliceWolf = wolfPlayer() === 'アリス';
      const aliceHints = isAliceWolf ? topic.hints.wolfHints : topic.hints.citizenHints;
      setTimeout(() => {
        setLogs((l) => [
          ...l,
          {
            speaker: 'アリス',
            avatar: '👩‍💼',
            role: 'alice',
            text: aliceHints[currentR],
          },
        ]);
      }, 500);
    } else {
      // 投票フェーズへ
      setTimeout(() => {
        sound.playMatch(5);
        setGameState('voting');
      }, 700);
    }
  };

  const handleVote = (target: string) => {
    sound.playPop(620);

    // AIの投票決定（ウルフに怪しい疑惑が集まりやすいロジック）
    const actualWolf = wolfPlayer();
    const isPlayerWolf = playerIsWolf();

    let votesAgainstWolf = 0;
    if (target === actualWolf) votesAgainstWolf++;

    // AI達の投票
    if (actualWolf !== 'アリス') votesAgainstWolf++;
    if (actualWolf !== 'ボブ' && Math.random() < 0.7) votesAgainstWolf++;

    const isWolfVotedOut = votesAgainstWolf >= 2;

    if (isPlayerWolf) {
      if (isWolfVotedOut) {
        setWinner('citizen');
        sound.playGameOver();
      } else {
        setWinner('wolf');
        sound.playVictory();
        setScore((s) => s + 400);
        confetti({ particleCount: 35, spread: 60 });
      }
    } else {
      if (isWolfVotedOut) {
        setWinner('citizen');
        sound.playVictory();
        setScore((s) => s + 250);
        confetti({ particleCount: 35, spread: 60 });
      } else {
        setWinner('wolf');
        sound.playGameOver();
      }
    }

    setGameState('result');
  };

  onSettled(() => {
    restart();
  });

  return (
    <GameShell
      id="ai-word-wolf"
      title="AI Word Wolf"
      score={score()}
      isGameOver={gameState() === 'result' && winner() === (playerIsWolf() ? 'citizen' : 'wolf')}
      isVictory={gameState() === 'result' && winner() === (playerIsWolf() ? 'wolf' : 'citizen')}
      onRestart={restart}
      instructions={instructions}
    >
      <div class="w-full max-w-2xl h-full flex flex-col items-center justify-between relative min-h-0 select-none p-2 gap-2">
        {/* お題カード表示 */}
        <div class="w-full bg-linear-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 dark:from-amber-950/40 dark:via-rose-950/40 dark:to-indigo-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 px-4 flex items-center justify-between shrink-0 shadow-2xs">
          <div>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold">あなたのお題</span>
            <div class="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{playerWord()}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                ジャンル: {currentTopic().category}
              </span>
            </div>
          </div>
          <div class="text-right text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            <span>ターン: {Math.min(round(), 2)}/2</span>
          </div>
        </div>

        {/* チャット会話エリア */}
        <div class="w-full flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div class="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs leading-relaxed">
            <For each={logs()}>
              {(msg) => (
                <div class="flex items-start gap-2">
                  <span class="text-lg shrink-0 mt-0.5">{msg.avatar}</span>
                  <div class="flex flex-col max-w-[85%]">
                    <span class="text-[10px] text-slate-400 font-bold mb-0.5">{msg.speaker}</span>
                    <div
                      class={`px-3 py-2 rounded-2xl whitespace-pre-wrap shadow-2xs ${
                        msg.role === 'player'
                          ? 'bg-amber-600 text-white rounded-tl-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* 会話入力フェーズ */}
          <Show when={gameState() === 'playing'}>
            <div class="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0 flex gap-2">
              <input
                type="text"
                placeholder="自分のお題について一言（直接の単語は言わないように！）..."
                value={inputText()}
                onInput={(e) => setInputText(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendStatement();
                }}
                class="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSendStatement}
                disabled={!inputText().trim()}
                class="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shrink-0"
              >
                発言
              </button>
            </div>
          </Show>

          {/* 投票フェーズ */}
          <Show when={gameState() === 'voting'}>
            <div class="p-3 border-t border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/30 shrink-0 text-center">
              <h3 class="text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">
                🗳️ 会話終了！誰がウルフ（少数派）だと思いますか？
              </h3>
              <div class="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                <For each={AI_PLAYERS}>
                  {(ai) => (
                    <button
                      onClick={() => handleVote(ai.name)}
                      class="p-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-bold transition-all active:scale-95"
                    >
                      <div>{ai.avatar}</div>
                      <div>{ai.name}</div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* 結果発表フェーズ */}
          <Show when={gameState() === 'result'}>
            <div class="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0 text-center animate-in fade-in">
              <div class="text-xl mb-1">
                {winner() === (playerIsWolf() ? 'wolf' : 'citizen') ? '🎉 VICTORY!' : '💀 DEFEAT'}
              </div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                ウルフの正体は <strong class="text-rose-500 font-black">{wolfPlayer()}</strong> でした！
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">
                市民のお題: <strong class="text-slate-700 dark:text-slate-300">{currentTopic().citizen}</strong> ／
                ウルフのお題: <strong class="text-rose-500">{currentTopic().wolf}</strong>
              </div>
              <button
                onClick={restart}
                class="mt-2.5 px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs active:scale-95 transition-all"
              >
                もう一度遊ぶ
              </button>
            </div>
          </Show>
        </div>
      </div>
    </GameShell>
  );
};
