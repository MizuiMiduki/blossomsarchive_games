import { Component, createSignal, onSettled, onCleanup, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

interface TopicPair {
  citizen: string;
  wolf: string;
  category: string;
  difficulty: 'normal' | 'hard';
  hints: {
    citizenHints: string[];
    wolfHints: string[];
  };
}

const TOPICS: TopicPair[] = [
  {
    citizen: 'カフェラテ',
    wolf: 'ミルクティー',
    category: '人気のドリンク',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        'ほっと一息つきたいカフェの定番ですね。',
        'ミルクのまろやかさの中に、心地よい苦味や香ばしさがあります。',
        '豆の焙煎度合いやエスプレッソの濃さで味がガラリと変わります。',
      ],
      wolfHints: [
        'ほっと一息つきたいカフェの定番ですね。',
        'ミルクのまろやかさの中に、華やかで豊かな香りが広がります。',
        '茶葉の種類や甘さの加減でいろんなアレンジが楽しめます。',
      ],
    },
  },
  {
    citizen: '新幹線',
    wolf: '飛行機',
    category: '長距離移動',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        '遠くへ旅行や出張に行くときに頼りになる乗り物です。',
        '乗る前に売店でお弁当や飲み物を買い込むのが楽しみの一つ。',
        '窓の外の街並みや田園風景が高速で流れていくのが見どころです。',
      ],
      wolfHints: [
        '遠くへ旅行や出張に行くときに頼りになる乗り物です。',
        '出発の少し前に着いて、手続きを済ませて待つ時間がドキドキします。',
        '窓から見下ろす雲海や地上の景色がとても神秘的で感動します。',
      ],
    },
  },
  {
    citizen: '海',
    wolf: 'プール',
    category: '夏の水辺レジャー',
    difficulty: 'normal',
    hints: {
      citizenHints: [
        '夏になると家族や友達と水着を着て出かけたくなります。',
        '波の音を聞きながら砂浜でまったり過ごすのも気持ちいいです。',
        '上がったあとに肌が少しベタついたり、塩気を感じることがあります。',
      ],
      wolfHints: [
        '夏になると家族や友達と水着を着て出かけたくなります。',
        '流れるコースやすべり台など、アトラクション感覚で楽しめます。',
        '上がったあとに塩素の匂いがしたり、シャワーで洗い流しますね。',
      ],
    },
  },
  {
    citizen: '映画館',
    wolf: '水族館',
    category: '屋内デートスポット',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        '薄暗い落ち着いた空間で、非日常の体験ができます。',
        'チケットを買って指定の席に座り、ポップコーンをつまみます。',
        '大画面の迫力と臨場感ある音響に圧倒されて引き込まれます。',
      ],
      wolfHints: [
        '薄暗い落ち着いた空間で、非日常の体験ができます。',
        '歩きながら幻想的な青い光の空間に包まれてリラックスできます。',
        'ガラス越しに優雅に動く姿を眺めていると時間が経つのを忘れます。',
      ],
    },
  },
  {
    citizen: '焼肉',
    wolf: 'すき焼き',
    category: 'ごちそう肉料理',
    difficulty: 'normal',
    hints: {
      citizenHints: [
        'スタミナをつけたい時や、お祝いの席で食べたくなる最高のごちそう。',
        '網の上でジュージュー焼いて、部位ごとの食感の違いを楽しみます。',
        '白ご飯やビールが止まらなくなって、タレの香ばしさがたまりません。',
      ],
      wolfHints: [
        'スタミナをつけたい時や、お祝いの席で食べたくなる最高のごちそう。',
        '甘辛い出汁で煮込んで、お肉と一緒に野菜や豆腐にも味が染み込みます。',
        '溶いた生卵にくぐらせて口に運ぶ瞬間がたまらなく至福です。',
      ],
    },
  },
  {
    citizen: 'カレーライス',
    wolf: 'ハヤシライス',
    category: 'プレート洋食',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        '大人から子どもまで大人気で、ご飯にたっぷりかけていただきます。',
        'スパイスの香りが食欲をそそり、辛さのアクセントがクセになります。',
        '福神漬けやらっきょうが名脇役として最高に合いますね。',
      ],
      wolfHints: [
        '大人から子どもまで大人気で、ご飯にたっぷりかけていただきます。',
        'トマトや玉ねぎの深いコクと甘みが引き立ち、とてもまろやかです。',
        '薄切り牛肉の旨味がデミグラスソースに溶け込んで優しい味わいです。',
      ],
    },
  },
  {
    citizen: '犬',
    wolf: '猫',
    category: '身近なペット',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        '人間にとても忠実で、表情豊かにコミュニケーションをとってくれます。',
        '毎日のお散歩や運動が欠かせず、外で元気に遊ぶのが大好き。',
        '嬉しいときに尻尾をブンブン振って駆け寄ってくる姿が愛おしいです。',
      ],
      wolfHints: [
        '自由気ままでマイペースなところがたまらなく可愛いです。',
        '日当たりのいい場所で丸くなって寝ている姿に癒やされます。',
        '喉をゴロゴロ鳴らしてすり寄ってくるとたまらない気持ちになります。',
      ],
    },
  },
  {
    citizen: 'サウナ',
    wolf: '温泉',
    category: '温浴リフレッシュ',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        'じっくり汗を流して、心身ともにデトックスできる場所です。',
        '限界まで温まったあとの水風呂と外気浴で「ととのう」感覚が最高。',
        '数分入っているだけで全身から玉のような汗が吹き出してきます。',
      ],
      wolfHints: [
        'じっくり汗を流して、心身ともにデトックスできる場所です。',
        '湯船に肩まで浸かって「はぁ〜」と声が出る瞬間が至福の癒やし。',
        '露天風呂から眺める自然の景色や、効能豊かな泉質を味わいます。',
      ],
    },
  },
  {
    citizen: '花火大会',
    wolf: '夏祭り',
    category: '夏の風物詩',
    difficulty: 'normal',
    hints: {
      citizenHints: [
        '夜空を見上げながら、夏の思い出を作るビッグイベントです。',
        '浴衣を着て出かける人も多く、ドーンとお腹に響く大迫力。',
        'クライマックスの連続打ち上げには思わず歓声と拍手が起こります。',
      ],
      wolfHints: [
        '夏の夜にみんなで集まって、屋台や雰囲気を楽しむイベントです。',
        '浴衣を着て出かける人も多く、太鼓の音や提灯の灯りが風情満点。',
        '焼きそばやかき氷、射的や金魚すくいなどお店を回るのが楽しいです。',
      ],
    },
  },
  {
    citizen: 'キャンプ',
    wolf: 'グランピング',
    category: 'アウトドア体験',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        '大自然の中でテントを張り、非日常のひとときを過ごします。',
        '自分たちで火を起こしてご飯を作ったり、不便さも楽しむスタイル。',
        '夜の焚き火を囲んで星空を眺めながら語り合うのが最高の醍醐味。',
      ],
      wolfHints: [
        '大自然の中でテントを張り、非日常のひとときを過ごします。',
        'ベッドや冷暖房が完備されていて、手ぶらで快適に過ごせるスタイル。',
        '豪華なバーベキューやおしゃれな内装で、ホテル感覚のアウトドアです。',
      ],
    },
  },
  {
    citizen: 'ラーメン',
    wolf: 'うどん',
    category: '麺料理',
    difficulty: 'normal',
    hints: {
      citizenHints: [
        '熱々のスープと麺の組み合わせが絶品で、専門店がたくさんあります。',
        'スープの濃さや背脂の量、麺の硬さをお好みでカスタマイズできます。',
        '飲み会のシメや、ガッツリお腹を満たしたいときに真っ先に浮かびます。',
      ],
      wolfHints: [
        '熱々のスープと麺の組み合わせが絶品で、専門店がたくさんあります。',
        '出汁の優しい旨味が染み渡り、温かいのも冷水で締めたのも美味。',
        '体調がすぐれない時や、胃に優しいものが食べたい時にも安心の味です。',
      ],
    },
  },
  {
    citizen: 'シャーペン',
    wolf: '鉛筆',
    category: '筆記用具',
    difficulty: 'hard',
    hints: {
      citizenHints: [
        '文字や絵を描くときに手放せない、学生時代からの相棒です。',
        'ノックすると芯が出てきて、常に一定の細さで書き続けられます。',
        '中に替芯を補充して、お気に入りの本体を何年も長く愛用できます。',
      ],
      wolfHints: [
        '文字や絵を描くときに手放せない、学生時代からの相棒です。',
        '削りたての木の香りと、紙の上を走る独特の滑らかな描き心地が好き。',
        '使っていくうちに少しずつ短くなっていく姿に愛着が湧きますね。',
      ],
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
  const [difficulty, setDifficulty] = createSignal<'normal' | 'hard'>('hard');
  const [gameState, setGameState] = createSignal<'playing' | 'voting' | 'guess' | 'result'>('playing');
  const [round, setRound] = createSignal(1); // 1, 2, 3
  const [playerIsWolf, setPlayerIsWolf] = createSignal(false);
  const [currentTopic, setCurrentTopic] = createSignal<TopicPair>(TOPICS[0]);
  const [playerWord, setPlayerWord] = createSignal('');
  const [logs, setLogs] = createSignal<ChatMessage[]>([]);
  const [inputText, setInputText] = createSignal('');
  const [winner, setWinner] = createSignal<'citizen' | 'wolf' | null>(null);
  const [wolfPlayer, setWolfPlayer] = createSignal<string>('');
  const [votedOutPlayer, setVotedOutPlayer] = createSignal<string>('');
  const [score, setScore] = createSignal(0);
  const [guessChoices, setGuessChoices] = createSignal<string[]>([]);
  const [reverseSuccess, setReverseSuccess] = createSignal(false);
  const [voteDetails, setVoteDetails] = createSignal<{ voter: string; target: string }[]>([]);
  const [thinkingPlayer, setThinkingPlayer] = createSignal<{ name: string; avatar: string } | null>(null);

  let chatContainerRef!: HTMLDivElement;
  let activeTimers: number[] = [];

  const addTimer = (callback: () => void, ms: number) => {
    const tid = window.setTimeout(() => {
      callback();
      activeTimers = activeTimers.filter((id) => id !== tid);
    }, ms);
    activeTimers.push(tid);
    return tid;
  };

  const clearAllTimers = () => {
    activeTimers.forEach((id) => clearTimeout(id));
    activeTimers = [];
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef) {
        chatContainerRef.scrollTo({ top: chatContainerRef.scrollHeight, behavior: 'smooth' });
      }
    }, 40);
  };

  const instructions = [
    '【AIワードウルフ】あなたと3人のAI（アリス・ボブ・キャロル）の中に、1人だけ違うお題を持つ「ウルフ（少数派）」が潜んでいます！',
    '3回の会話ターンで、自分のお題について一言ずつ発言します。固有名詞を直接言うと即バレするので注意！',
    '【難易度ハード】AIも人間らしく巧妙にブラフを使い、市民の発言に擬態してきます。違和感のある言葉遣いを見破りましょう。',
    '【ウルフ逆転ルール】ウルフが最多票で追放されても、最後に「市民のお題」を当てることができればウルフの逆転勝利となります！',
  ];

  const AI_PLAYERS = [
    { id: 'alice', name: 'アリス', avatar: '👩‍💼', desc: '論理的・慎重派' },
    { id: 'bob', name: 'ボブ', avatar: '🧑‍🎨', desc: '直感・マイペース派' },
    { id: 'carol', name: 'キャロル', avatar: '🕵️‍♀️', desc: '鋭い観察・探偵派' },
  ];

  const restart = (diff = difficulty()) => {
    clearAllTimers();
    // 難易度に応じたお題の抽出
    const candidates = TOPICS.filter((t) => (diff === 'hard' ? true : t.difficulty === 'normal'));
    const topic = candidates[Math.floor(Math.random() * candidates.length)] || TOPICS[0];
    setCurrentTopic(topic);

    // プレイヤーがウルフになる確率（35%）
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
    setVotedOutPlayer('');
    setReverseSuccess(false);
    setVoteDetails([]);
    setLogs([]);

    // 最初のAI（アリス）の思考演出
    const firstSpeaker = AI_PLAYERS[0];
    const isFirstWolf = wolfName === firstSpeaker.name;
    const hints = isFirstWolf ? topic.hints.wolfHints : topic.hints.citizenHints;

    setThinkingPlayer({ name: firstSpeaker.name, avatar: firstSpeaker.avatar });
    scrollToBottom();

    addTimer(() => {
      setThinkingPlayer(null);
      sound.playPop(480);
      setLogs([
        {
          speaker: firstSpeaker.name,
          avatar: firstSpeaker.avatar,
          role: 'alice',
          text: hints[0],
        },
      ]);
      scrollToBottom();
    }, 900);
  };

  const handleSendStatement = () => {
    const text = inputText().trim();
    if (!text || gameState() !== 'playing' || thinkingPlayer()) return;

    sound.playPop(500);
    setLogs((prev) => [
      ...prev,
      { speaker: 'あなた', avatar: '👤', role: 'player', text },
    ]);
    setInputText('');
    scrollToBottom();

    const currentR = round();
    const topic = currentTopic();

    // 1. ボブの思考時間演出 (約950ms)
    setThinkingPlayer({ name: 'ボブ', avatar: '🧑‍🎨' });
    scrollToBottom();

    addTimer(() => {
      const isBobWolf = wolfPlayer() === 'ボブ';
      const bobHints = isBobWolf ? topic.hints.wolfHints : topic.hints.citizenHints;
      sound.playPop(480);
      setLogs((prev) => [
        ...prev,
        {
          speaker: 'ボブ',
          avatar: '🧑‍🎨',
          role: 'bob',
          text: bobHints[Math.min(currentR - 1, bobHints.length - 1)],
        },
      ]);
      scrollToBottom();

      // 2. キャロルの思考時間演出 (約1100ms)
      setThinkingPlayer({ name: 'キャロル', avatar: '🕵️‍♀️' });
      scrollToBottom();

      addTimer(() => {
        const isCarolWolf = wolfPlayer() === 'キャロル';
        const carolHints = isCarolWolf ? topic.hints.wolfHints : topic.hints.citizenHints;
        sound.playPop(480);
        setLogs((prev) => [
          ...prev,
          {
            speaker: 'キャロル',
            avatar: '🕵️‍♀️',
            role: 'carol',
            text: carolHints[Math.min(currentR - 1, carolHints.length - 1)],
          },
        ]);
        setThinkingPlayer(null);
        scrollToBottom();

        if (currentR < 3) {
          setRound((r) => r + 1);
          // 3. 次のラウンドのアリスの思考時間演出 (約1000ms)
          setThinkingPlayer({ name: 'アリス', avatar: '👩‍💼' });
          scrollToBottom();

          addTimer(() => {
            const isAliceWolf = wolfPlayer() === 'アリス';
            const aliceHints = isAliceWolf ? topic.hints.wolfHints : topic.hints.citizenHints;
            sound.playPop(480);
            setLogs((prev) => [
              ...prev,
              {
                speaker: 'アリス',
                avatar: '👩‍💼',
                role: 'alice',
                text: aliceHints[currentR],
              },
            ]);
            setThinkingPlayer(null);
            scrollToBottom();
          }, 1000);
        } else {
          // 3ターン終了：全員で熟考してから投票へ (約1200ms)
          setThinkingPlayer({ name: '全員が推理', avatar: '🤔' });
          scrollToBottom();

          addTimer(() => {
            setThinkingPlayer(null);
            sound.playMatch(5);
            setGameState('voting');
          }, 1200);
        }
      }, 1100);
    }, 950);
  };

  const handleVote = (target: string) => {
    sound.playPop(620);

    const actualWolf = wolfPlayer();
    const votes: { voter: string; target: string }[] = [
      { voter: 'あなた', target },
    ];

    // AIの知的な投票計算
    // プレイヤーの発言を分析（文字数が極端に短い、またはウルフのお題が市民とズレているか）
    const playerStatements = logs().filter((l) => l.role === 'player').map((l) => l.text).join(' ');
    const isPlayerSuspicious = playerStatements.length < 15 || Math.random() < 0.25;

    // アリス（論理派）
    if (actualWolf === 'アリス') {
      // 自分がウルフならプレイヤーかボブに濡れ衣
      votes.push({ voter: 'アリス', target: isPlayerSuspicious ? 'あなた' : 'ボブ' });
    } else {
      // 市民アリスはウルフを疑う確率が高い（ハードなら75%）
      const voteTarget = Math.random() < (difficulty() === 'hard' ? 0.75 : 0.6) ? actualWolf : (isPlayerSuspicious ? 'あなた' : 'ボブ');
      votes.push({ voter: 'アリス', target: voteTarget });
    }

    // ボブ（直感派）
    if (actualWolf === 'ボブ') {
      votes.push({ voter: 'ボブ', target: isPlayerSuspicious ? 'あなた' : 'キャロル' });
    } else {
      const voteTarget = Math.random() < 0.55 ? actualWolf : (Math.random() < 0.5 ? 'あなた' : 'キャロル');
      votes.push({ voter: 'ボブ', target: voteTarget });
    }

    // キャロル（観察派）
    if (actualWolf === 'キャロル') {
      votes.push({ voter: 'キャロル', target: isPlayerSuspicious ? 'あなた' : 'アリス' });
    } else {
      const voteTarget = Math.random() < (difficulty() === 'hard' ? 0.8 : 0.6) ? actualWolf : (isPlayerSuspicious ? 'あなた' : 'アリス');
      votes.push({ voter: 'キャロル', target: voteTarget });
    }

    setVoteDetails(votes);

    // 得票数集計
    const countMap: Record<string, number> = {};
    for (const v of votes) {
      countMap[v.target] = (countMap[v.target] || 0) + 1;
    }

    // 最多得票者
    let maxVotes = -1;
    let expelled = '';
    for (const [candidate, count] of Object.entries(countMap)) {
      if (count > maxVotes) {
        maxVotes = count;
        expelled = candidate;
      }
    }
    setVotedOutPlayer(expelled);

    // ウルフが追放されたか？
    if (expelled === actualWolf) {
      // ウルフ逆転チャンスへ！
      // 3択候補の作成（市民のお題 + 似たジャンルのダミー2つ）
      const dummyTopics = TOPICS.filter((t) => t.citizen !== currentTopic().citizen);
      const shuffledDummies = [...dummyTopics].sort(() => Math.random() - 0.5);
      const choices = [
        currentTopic().citizen,
        shuffledDummies[0]?.citizen || 'おにぎり',
        shuffledDummies[1]?.citizen || 'パスタ',
      ].sort(() => Math.random() - 0.5);

      setGuessChoices(choices);

      if (actualWolf === 'あなた') {
        // プレイヤー自身がウルフで追放された！市民のお題当てチャンスへ
        setGameState('guess');
      } else {
        // AIがウルフで追放された！AIの逆転推理
        // ハードなら35%、ノーマルなら20%でAIが逆転正解
        const aiGuessedCorrect = Math.random() < (difficulty() === 'hard' ? 0.35 : 0.2);
        if (aiGuessedCorrect) {
          setReverseSuccess(true);
          setWinner('wolf');
          sound.playGameOver();
        } else {
          setReverseSuccess(false);
          setWinner('citizen');
          sound.playVictory();
          setScore((s) => s + (difficulty() === 'hard' ? 500 : 300));
          confetti({ particleCount: 45, spread: 70 });
        }
        setGameState('result');
      }
    } else {
      // ウルフ追放失敗（市民が追放された）＝ ウルフの逃げ切り勝利！
      setWinner('wolf');
      if (playerIsWolf()) {
        sound.playVictory();
        setScore((s) => s + (difficulty() === 'hard' ? 600 : 400));
        confetti({ particleCount: 50, spread: 80 });
      } else {
        sound.playGameOver();
      }
      setGameState('result');
    }
  };

  const handlePlayerGuess = (choice: string) => {
    sound.playPop(550);
    const isCorrect = choice === currentTopic().citizen;
    if (isCorrect) {
      setReverseSuccess(true);
      setWinner('wolf');
      sound.playVictory();
      setScore((s) => s + 800);
      confetti({ particleCount: 60, spread: 80 });
    } else {
      setReverseSuccess(false);
      setWinner('citizen');
      sound.playGameOver();
    }
    setGameState('result');
  };

  onSettled(() => {
    restart();
  });

  onCleanup(() => {
    clearAllTimers();
  });

  return (
    <GameShell
      id="ai-word-wolf"
      title="AI Word Wolf"
      score={score()}
      isGameOver={gameState() === 'result' && winner() === (playerIsWolf() ? 'citizen' : 'wolf')}
      isVictory={gameState() === 'result' && winner() === (playerIsWolf() ? 'wolf' : 'citizen')}
      onRestart={() => restart()}
      instructions={instructions}
      extraControls={
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-400 font-bold">難易度:</span>
          <button
            onClick={() => {
              setDifficulty('normal');
              restart('normal');
            }}
            class={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
              difficulty() === 'normal'
                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            ノーマル
          </button>
          <button
            onClick={() => {
              setDifficulty('hard');
              restart('hard');
            }}
            class={`px-2.5 py-1 rounded-lg font-bold border transition-all ${
              difficulty() === 'hard'
                ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            🔥 ハード（心理戦）
          </button>
        </div>
      }
    >
      <div class="w-full max-w-2xl h-full flex flex-col items-center justify-between relative min-h-0 select-none p-2 gap-2">
        {/* お題カード表示 */}
        <div class="w-full bg-linear-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 dark:from-amber-950/40 dark:via-rose-950/40 dark:to-indigo-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 px-4 flex items-center justify-between shrink-0 shadow-2xs">
          <div>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold">あなたのお題</span>
            <div class="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span class="tracking-wide text-amber-500 dark:text-amber-400">{playerWord()}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                ジャンル: {currentTopic().category}
              </span>
            </div>
          </div>
          <div class="text-right text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            <span>ターン: {Math.min(round(), 3)}/3</span>
          </div>
        </div>

        {/* チャット会話エリア */}
        <div class="w-full flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div
            ref={chatContainerRef}
            class="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs leading-relaxed scroll-smooth"
          >
            <For each={logs()}>
              {(msg) => (
                <div class="flex items-start gap-2">
                  <span class="text-lg shrink-0 mt-0.5">{msg.avatar}</span>
                  <div class="flex flex-col max-w-[85%]">
                    <span class="text-[10px] text-slate-400 font-bold mb-0.5">{msg.speaker}</span>
                    <div
                      class={`px-3 py-2 rounded-2xl whitespace-pre-wrap shadow-2xs leading-normal ${
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

            {/* AI思考中タイピングインジケーター */}
            <Show when={thinkingPlayer()}>
              <div class="flex items-start gap-2 animate-in fade-in duration-200">
                <span class="text-lg shrink-0 mt-0.5">{thinkingPlayer()?.avatar}</span>
                <div class="flex flex-col max-w-[85%]">
                  <span class="text-[10px] text-amber-500 font-bold mb-0.5 flex items-center gap-1">
                    <span>{thinkingPlayer()?.name}が考え中...</span>
                  </span>
                  <div class="px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs w-fit">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ "animation-delay": "0ms" }} />
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ "animation-delay": "150ms" }} />
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ "animation-delay": "300ms" }} />
                  </div>
                </div>
              </div>
            </Show>
          </div>

          {/* 会話入力フェーズ */}
          <Show when={gameState() === 'playing'}>
            <div class="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0 flex gap-2">
              <input
                type="text"
                disabled={!!thinkingPlayer()}
                placeholder={
                  thinkingPlayer()
                    ? `⏳ ${thinkingPlayer()?.name}の思考を待っています...`
                    : '自分のお題について一言（直接の単語は言わないように！）...'
                }
                value={inputText()}
                onInput={(e) => setInputText(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendStatement();
                }}
                class="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              />
              <button
                onClick={handleSendStatement}
                disabled={!inputText().trim() || !!thinkingPlayer()}
                class="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                {thinkingPlayer() ? '思考中' : '発言'}
              </button>
            </div>
          </Show>

          {/* 投票フェーズ */}
          <Show when={gameState() === 'voting'}>
            <div class="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/30 shrink-0 text-center animate-in fade-in">
              <h3 class="text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                🗳️ 会話終了！誰がウルフ（少数派）だと思いますか？
              </h3>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 mb-3">
                誰かの発言に微妙な違和感はありませんでしたか？
              </p>
              <div class="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
                <For each={AI_PLAYERS}>
                  {(ai) => (
                    <button
                      onClick={() => handleVote(ai.name)}
                      class="p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer flex flex-col items-center gap-1"
                    >
                      <div class="text-xl">{ai.avatar}</div>
                      <div class="font-bold text-slate-900 dark:text-white">{ai.name}</div>
                      <div class="text-[9px] text-slate-400">{ai.desc}</div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* プレイヤーウルフ逆転チャンス（市民のお題当て） */}
          <Show when={gameState() === 'guess'}>
            <div class="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-rose-50 dark:bg-rose-950/30 shrink-0 text-center animate-in zoom-in-95">
              <div class="text-rose-600 dark:text-rose-400 font-black text-sm mb-1">
                ⚠️ あなたはウルフとして追放されました！
              </div>
              <p class="text-xs text-slate-700 dark:text-slate-300 mb-2">
                しかし【ラストチャンス】！みんなが話していた「市民のお題」を当てれば逆転勝利です！
              </p>
              <div class="flex flex-col gap-2 max-w-xs mx-auto">
                <For each={guessChoices()}>
                  {(choice) => (
                    <button
                      onClick={() => handlePlayerGuess(choice)}
                      class="py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold text-slate-800 dark:text-slate-100 transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      {choice}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* 結果発表フェーズ */}
          <Show when={gameState() === 'result'}>
            <div class="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0 text-center animate-in fade-in">
              <div class="text-2xl font-black mb-1">
                {winner() === (playerIsWolf() ? 'wolf' : 'citizen') ? '🎉 VICTORY!' : '💀 DEFEAT'}
              </div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                最多得票: <strong class="text-rose-500 font-black">{votedOutPlayer()}</strong> が追放されました
              </div>

              <Show when={reverseSuccess()}>
                <div class="text-xs font-bold text-amber-500 dark:text-amber-400 my-1">
                  ⚡ ウルフが見事に市民のお題を看破し、大逆転勝利！
                </div>
              </Show>

              <div class="text-xs text-slate-700 dark:text-slate-300 my-1.5">
                ウルフの正体: <strong class="text-rose-500 font-bold">{wolfPlayer()}</strong>
              </div>

              <div class="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                市民のお題: <strong class="text-slate-700 dark:text-slate-300">{currentTopic().citizen}</strong> ／
                ウルフのお題: <strong class="text-rose-500">{currentTopic().wolf}</strong>
              </div>

              {/* 投票の内訳 */}
              <div class="flex flex-wrap justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mb-3 bg-slate-200/50 dark:bg-slate-800/50 p-2 rounded-xl max-w-sm mx-auto">
                <For each={voteDetails()}>
                  {(v) => (
                    <span>
                      {v.voter} ➔ <strong class="text-slate-700 dark:text-slate-300">{v.target}</strong>
                    </span>
                  )}
                </For>
              </div>

              <button
                onClick={() => restart()}
                class="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-md"
              >
                次のゲームをプレイ
              </button>
            </div>
          </Show>
        </div>
      </div>
    </GameShell>
  );
};
