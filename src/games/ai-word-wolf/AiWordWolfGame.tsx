import { Component, createSignal, onSettled, onCleanup, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

interface TopicHints {
  // Round 1: 様子見・何にでも当てはまりそうな超抽象表現
  round1: string[];
  // Round 2: シチュエーション・感覚・雰囲気の抽象表現
  round2Citizen: string[];
  round2Wolf: string[];
  // Round 3: 探り合い・こだわり・特徴のニュアンス比較
  round3Citizen: string[];
  round3Wolf: string[];
}

interface TopicPair {
  citizen: string;
  wolf: string;
  category: string;
  difficulty: 'normal' | 'hard';
  hints: TopicHints;
}

const GENERAL_R1_HINTS = [
  '誰でも一度は経験したことがある親しみやすい定番ですよね。',
  '好きな人はとことん好きだし、自分も割とポジティブな印象を持っています。',
  'これがある日はちょっと気分が上がりますし、あると嬉しい存在です。',
  '人によって接する頻度や好みのシチュエーションが分かれそうですね。',
  '値段や種類も幅広くて、いろんなバリエーションが楽しめます。',
];

const GENERAL_R2_HINTS = [
  '家で楽しむか外で楽しむかで、人それぞれのスタイルが出そうです。',
  '季節感やその日の気分によって選ぶ基準がガラリと変わりますね。',
  '一人でじっくり向き合うのも良いですし、誰かと共有するのも楽しいです。',
  '自分なりのこだわりや、選ぶときのポイントが自然と決まってきます。',
];

const TOPICS: TopicPair[] = [
  {
    citizen: 'カフェラテ',
    wolf: 'ミルクティー',
    category: '人気のドリンク',
    difficulty: 'hard',
    hints: {
      round1: [
        'カフェやお店に入ると、無意識にメニューで探しちゃいますね。',
        'ほっと一息つきたいリラックスタイムの定番です。',
        '甘さや温度の好みで人それぞれのこだわりが出やすいと思います。',
        '朝の目覚めや午後の休憩時間に飲むとすごく落ち着きますね。',
      ],
      round2Citizen: [
        'まろやかさの中に、深みのある香ばしさが残るのが好きです。',
        '大人になってから飲む頻度がグッと増えた気がします。',
        '上のふんわりした泡や見た目のグラデーションも綺麗ですよね。',
      ],
      round2Wolf: [
        'まろやかさの中に、上品で華やかな香りが広がるのが好きです。',
        '少し甘めにしてスイーツ感覚で楽しむことも多いですね。',
        'カップを持った瞬間の温もりと香りにすごく癒やされます。',
      ],
      round3Citizen: [
        '苦味と甘さのバランスが一番のポイントですよね。',
        '豆や抽出のこだわりがある専門店も多くて奥が深いです。',
      ],
      round3Wolf: [
        'ベースの香りとまろやかさの調和が決め手ですよね。',
        '茶葉の産地やブレンドによって風味が変わるのも魅力的です。',
      ],
    },
  },
  {
    citizen: '新幹線',
    wolf: '飛行機',
    category: '長距離移動',
    difficulty: 'hard',
    hints: {
      round1: [
        '遠出する時や特別な旅の始まりを感じさせてくれますね。',
        '乗る前からちょっとした非日常感とワクワクがあります。',
        '時間に余裕を持って準備して向かうイメージです。',
        '窓から流れる景色をぼーっと眺める時間が好きですね。',
      ],
      round2Citizen: [
        '乗る前に駅でお弁当や飲み物を買い込むのが楽しみの一つです。',
        '街並みから大自然へ景色が移り変わるスピード感がいいですね。',
        '揺れが少なくて、座席でゆったり過ごせるのが快適です。',
      ],
      round2Wolf: [
        '出発前に手続きを済ませてゲートで待つ時間がドキドキします。',
        '天候や高度によって窓の外の景色がドラマチックに変わります。',
        '短時間で一気に遠くまでワープする感覚がすごいですよね。',
      ],
      round3Citizen: [
        '地面を滑るように走る疾走感と、時間通りの安心感があります。',
        '乗り降りや移動の手軽さも大きな魅力ですよね。',
      ],
      round3Wolf: [
        '離陸や着陸の瞬間の独特の浮遊感がとても印象的です。',
        '上空から見下ろす街や雲海が本当に綺麗ですよね。',
      ],
    },
  },
  {
    citizen: '海',
    wolf: 'プール',
    category: '夏の水辺レジャー',
    difficulty: 'normal',
    hints: {
      round1: [
        '夏といえば真っ先に思い浮かぶ王道のアクティビティですね。',
        '家族や友達とグループで出かけるとすごく盛り上がります。',
        '準備するものも多くて、行く前からイベント感があります。',
        '水に入った瞬間のひんやりした爽快感がたまりません。',
      ],
      round2Citizen: [
        '風の匂いや波の音を聞きながらのんびりするだけでも癒やされます。',
        '砂浜を歩いたり、広大な景色を眺める解放感が格別ですね。',
        '上がった後に少し肌に名残を感じるのも夏の風物詩です。',
      ],
      round2Wolf: [
        '流れるコースやアトラクションでワイワイ遊ぶのが楽しいです。',
        '設備が整っていて、足元が汚れにくいのも安心感があります。',
        '上がった後のシャワーでサッパリするまでがワンセットですね。',
      ],
      round3Citizen: [
        '自然の広大さと夕暮れ時のエモーショナルな雰囲気が好きです。',
        '日焼け対策や砂のケアも思い出の一部ですよね。',
      ],
      round3Wolf: [
        '監視員さんがいて区切られた空間だからこその安心感があります。',
        '屋内外やスライダーなど遊ぶ要素が色々ありますよね。',
      ],
    },
  },
  {
    citizen: '映画館',
    wolf: '水族館',
    category: '屋内デートスポット',
    difficulty: 'hard',
    hints: {
      round1: [
        '薄暗くて落ち着いた空間で、非日常のひとときを味わえます。',
        '休日やデート、一人で気分転換したい時にもぴったりですね。',
        '天候に左右されずに一日中快適に過ごせるのが嬉しいです。',
        'その空間ならではの独特の静けさと雰囲気が好きです。',
      ],
      round2Citizen: [
        'チケットを予約して指定の席に座り、フードをつまむのが定番。',
        '始まる前の照明がスーッと落ちる瞬間にワクワクします。',
        '大画面の迫力と包み込まれるような音響に引き込まれますね。',
      ],
      round2Wolf: [
        '青い照明に包まれた空間をゆったり歩きながら癒やされます。',
        '目の前を通り過ぎる優雅な動きを眺めていると時間を忘れます。',
        '展示の工夫やライティングで幻想的な世界に浸れますね。',
      ],
      round3Citizen: [
        '終わった後に作品の感想を語り合う時間が楽しいです。',
        '上映中の静寂とみんなで同じものを見つめる一体感があります。',
      ],
      round3Wolf: [
        '見ていて飽きない可愛らしさや神秘的な魅力があります。',
        '涼しげな館内の雰囲気でリフレッシュできますよね。',
      ],
    },
  },
  {
    citizen: '焼肉',
    wolf: 'すき焼き',
    category: 'ごちそう肉料理',
    difficulty: 'normal',
    hints: {
      round1: [
        'お祝いの席や自分へのご褒美の日に真っ先に浮かびますね。',
        'テーブルの上にお皿がズラリと並ぶとテンション上がります。',
        '大人数でワイワイ囲むと食事の楽しさが倍増しますよね。',
        '普段の食事とは一味違う、特別な贅沢感があります。',
      ],
      round2Citizen: [
        '立ち上る香ばしい匂いと音だけで食欲が刺激されますね。',
        '自分の好みの仕上がりやペースで食べ進められるのが醍醐味。',
        'ご飯や冷たいドリンクが止まらなくなるガッツリ感があります。',
      ],
      round2Wolf: [
        '立ち上る湯気と甘辛い香りが部屋中に広がる瞬間がたまらないです。',
        'お肉の旨味が他の具材にも染み込んで一体感を楽しめます。',
        'じっくり火が通るのをみんなで待ちながら食べるのが温かいですね。',
      ],
      round3Citizen: [
        'いろんな部位や味付けを少しずつ食べ比べるのが楽しいです。',
        'お店ならではの活気や熱気の中で食べるのが最高ですよね。',
      ],
      round3Wolf: [
        'ひと口ごとに広がる濃厚で深いコクが本当に贅沢です。',
        '最後に残った出汁やタレまで美味しく味わい尽くせますよね。',
      ],
    },
  },
  {
    citizen: 'カレーライス',
    wolf: 'ハヤシライス',
    category: 'プレート洋食',
    difficulty: 'hard',
    hints: {
      round1: [
        '大人から子供までみんな大好きで、お腹いっぱい満たされます。',
        '大きなお皿にご飯とたっぷりのルーが盛られたビジュアルが最高。',
        '家庭の味としても定食屋さんの味としても馴染み深いですね。',
        'ひと口食べ始めるとスプーンが止まらなくなる魅力があります。',
      ],
      round2Citizen: [
        '独特の香りが部屋に充満して、遠くからでも食欲が湧きます。',
        'ピリッとした刺激とコクのバランスがやみつきになりますね。',
        'トッピングや薬味のアクセントが名脇役として輝きます。',
      ],
      round2Wolf: [
        'じっくり煮込まれた具材のまろやかな甘みが引き立ちます。',
        '酸味とコクが絶妙に調和した優しい味わいが特徴ですね。',
        'ソースの奥深い風味が口いっぱいに広がって優しいです。',
      ],
      round3Citizen: [
        '辛さの度合いや配合によって全く別物になりますよね。',
        '翌日に少し寝かせた時の濃厚さも格別だと思います。',
      ],
      round3Wolf: [
        'お肉の旨味と野菜の甘みが全体に溶け込んでいます。',
        '辛いのが苦手な人でも安心して美味しく食べられますよね。',
      ],
    },
  },
  {
    citizen: '犬',
    wolf: '猫',
    category: '身近なペット',
    difficulty: 'hard',
    hints: {
      round1: [
        '一緒にいるだけで日々の疲れが吹き飛ぶ最高の癒やしです。',
        '動画や写真を眺めているだけでも思わず笑顔になっちゃいます。',
        '家族の一員として大切に愛着を持って接したくなりますね。',
        'それぞれ違った愛嬌と魅力があって、見ていて飽きません。',
      ],
      round2Citizen: [
        '表情豊かに感情をストレートに表現してくれるのが愛おしいです。',
        '外で一緒に元気に体を動かす時間がとても楽しいですね。',
        '帰宅した時に全力で出迎えてくれる姿にジーンときます。',
      ],
      round2Wolf: [
        '自由気ままでマイペースな距離感がたまらなく魅力的です。',
        '日当たりのいい場所で丸くなって眠る姿に癒やされます。',
        'たまにふと甘えてスリスリ寄ってくると胸がキュンとしますね。',
      ],
      round3Citizen: [
        '呼ぶと元気よく駆け寄ってきてくれる忠実さが可愛いです。',
        '人との強い絆やコミュニケーションを感じられる存在ですね。',
      ],
      round3Wolf: [
        '気まぐれだけど、信頼して心を開いてくれた瞬間が特別です。',
        'しなやかな仕草や柔らかな触り心地に癒やされますよね。',
      ],
    },
  },
  {
    citizen: 'サウナ',
    wolf: '温泉',
    category: '温浴リフレッシュ',
    difficulty: 'hard',
    hints: {
      round1: [
        '日常の疲れやストレスをしっかり洗い流してリセットできます。',
        '心身ともにじっくり温まってデトックスする至福の時間です。',
        '休日にこれを目的に出かけると、最高の贅沢になりますね。',
        '利用した後の身体の軽さとスッキリ感がたまりません。',
      ],
      round2Citizen: [
        '熱気に耐えたあとの冷たい刺激と外気浴で深く落ち着きます。',
        '短時間で全身から驚くほど汗が吹き出してくる感覚がすごい。',
        '頭の中がクリアになって思考が研ぎ澄まされるのが魅力です。',
      ],
      round2Wolf: [
        '肩まで浸かって思わず深いため息が漏れる瞬間のリラックス感。',
        '露天から眺める景色や、独特の効能を全身で味わいます。',
        'じわじわと体の芯まで温まってポカポカが長く続きますね。',
      ],
      round3Citizen: [
        'あの独特の爽快感はクセになると抜け出せませんよね。',
        '呼吸を整えて自分自身と静かに向き合う時間になります。',
      ],
      round3Wolf: [
        'お湯の肌触りや香りの違いを旅先で楽しむのが醍醐味です。',
        '上がったあとにのんびり畳の部屋で涼む時間が最高ですよね。',
      ],
    },
  },
  {
    citizen: '花火大会',
    wolf: '夏祭り',
    category: '夏の風物詩',
    difficulty: 'normal',
    hints: {
      round1: [
        '夏の夜の特別な空気感と思い出を作ってくれる大イベントです。',
        '浴衣姿の人たちを見かけると、季節の訪れを実感しますね。',
        '暗くなってからの賑わいと非日常の雰囲気が大好きです。',
        '友達や家族、恋人と一緒に行くと特別な記憶に残ります。',
      ],
      round2Citizen: [
        '空を見上げながら、お腹に響くほどの迫力を体感します。',
        '夜空いっぱいに広がる鮮やかな光の余韻が感動的ですね。',
        'クライマックスの瞬間に沸き起こる大歓声が胸に刺さります。',
      ],
      round2Wolf: [
        '提灯の明かりと賑やかな音が流れる空間を散策するのが楽しい。',
        'ずらりと並ぶ屋台の匂いや活気にすごくワクワクしますね。',
        '食べ歩きしたり、昔ながらの遊びに挑戦する時間が楽しいです。',
      ],
      round3Citizen: [
        '遠くからでも見えたり音が聞こえると夏を感じますよね。',
        '一瞬の輝きと儚さが日本ならではの美しさだと思います。',
      ],
      round3Wolf: [
        '地域ごとの伝統や懐かしい雰囲気に包まれるのが魅力です。',
        '屋台で買ったものを片手に夜風を感じながら歩くのが好きですね。',
      ],
    },
  },
  {
    citizen: 'キャンプ',
    wolf: 'グランピング',
    category: 'アウトドア体験',
    difficulty: 'hard',
    hints: {
      round1: [
        '大自然の中で日常を忘れて過ごすリフレッシュのひととき。',
        '澄んだ空気と緑に囲まれて過ごす時間が何よりの贅沢ですね。',
        '夜に星空を眺めながら語り合うのが最高の思い出になります。',
        '外で食べるご飯って、なぜか普段の何倍も美味しく感じますよね。',
      ],
      round2Citizen: [
        '自分たちで拠点を整えたり、火を起こす作業そのものが楽しい。',
        '少し不便な環境だからこそ得られる達成感と一体感があります。',
        'パチパチ燃える炎を眺めながら静かに過ごすのが醍醐味ですね。',
      ],
      round2Wolf: [
        '自然を満喫しつつ、ホテル並みの快適な空間で過ごせます。',
        '手ぶらで豪華な食事や設備が整っているのがすごく嬉しいですね。',
        'おしゃれな内装や映える空間で贅沢な気分に浸れます。',
      ],
      round3Citizen: [
        '道具を揃えて自分好みのスタイルを作るのが楽しいですね。',
        '大自然とダイレクトに一体になる感覚が味わえます。',
      ],
      round3Wolf: [
        '初心者でも気負わず安心して大自然を満喫できますよね。',
        'ベッドでぐっすり眠れて翌朝もスッキリ快適に過ごせます。',
      ],
    },
  },
  {
    citizen: 'ラーメン',
    wolf: 'うどん',
    category: '麺料理',
    difficulty: 'normal',
    hints: {
      round1: [
        '熱々のスープと麺の組み合わせはいつ食べても飽きません。',
        'お腹が空いた時、真っ先に候補に浮かぶ国民食ですね。',
        '全国各地にご当地の個性があって、食べ歩くのも楽しいです。',
        '注文してからパッと手軽に食べられる手軽さも最高ですよね。',
      ],
      round2Citizen: [
        '濃厚なスープと麺が絡み合ってガツンと満たされる感覚。',
        '具材や味の濃さをお好みで選べるのが楽しいですよね。',
        'ガッツリ食べたい時に無性に恋しくなる魅力があります。',
      ],
      round2Wolf: [
        '出汁の優しい旨味が五臓六腑に染み渡るような安心感です。',
        '温かいのも冷たく締めたのも、それぞれ違った良さがあります。',
        '胃に優しいものが食べたい時にも安心の味ですね。',
      ],
      round3Citizen: [
        '立ち込めるスープの香りが店先に漂うと引き寄せられます。',
        'こってり系からあっさり系まで奥が深いジャンルですよね。',
      ],
      round3Wolf: [
        'ツルツルッとした喉越しと、出汁本来の風味が主役ですね。',
        'トッピングやお揚げなどとの相性も抜群だと思います。',
      ],
    },
  },
  {
    citizen: 'シャーペン',
    wolf: '鉛筆',
    category: '筆記用具',
    difficulty: 'hard',
    hints: {
      round1: [
        '学生時代からずっと手に馴染んできた身近な相棒ですね。',
        '文字やメモを書くとき、手元にあると安心する道具です。',
        '人によって持つ時のグリップや筆圧の好みが分かれますね。',
        '紙の上を走らせる感触が心地よくて愛着が湧きます。',
      ],
      round2Citizen: [
        'カチカチとノックして、常に一定の細さで書き続けられる便利さ。',
        '中にお気に入りの芯を補充して、同じ軸を長く愛用できます。',
        '機能的なグリップや進化が面白くてコレクションしたくなります。',
      ],
      round2Wolf: [
        '削りたての木の香りと、紙に吸い付くような滑らかな描き心地。',
        '筆圧の加減で濃淡を自由にコントロールできるのが魅力です。',
        '使っていくうちにだんだん短くなっていく姿に愛着を感じますね。',
      ],
      round3Citizen: [
        '芯が折れにくい工夫や、細かい文字が綺麗に書けるのがいいですね。',
        '手帳やノートの小さなマス目にもスッキリ収まるのが便利です。',
      ],
      round3Wolf: [
        '握ったときの木の温もりと、素朴な質感がホッとします。',
        'デッサンやスケッチなど表現の幅が豊かなのも特徴ですよね。',
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
    { id: 'alice' as const, name: 'アリス', avatar: '👩‍💼', desc: '論理的・慎重派' },
    { id: 'bob' as const, name: 'ボブ', avatar: '🧑‍🎨', desc: '直感・マイペース派' },
    { id: 'carol' as const, name: 'キャロル', avatar: '🕵️‍♀️', desc: '鋭い観察・探偵派' },
  ];

  // 同一ゲーム内での重複発言を絶対に防止する管理セット
  const usedStatements = new Set<string>();

  // キャラクター別の個性的な口調変換＆相槌演出
  const applyCharacterStyle = (
    baseText: string,
    role: 'alice' | 'bob' | 'carol',
    prevSpeaker?: string
  ): string => {
    // 35%の確率で前の発言者への自然な相槌・リアクションを付与
    let prefix = '';
    if (prevSpeaker && Math.random() < 0.35) {
      if (role === 'alice') {
        prefix = `${prevSpeaker}さんのおっしゃる通り、`;
      } else if (role === 'bob') {
        prefix = `${prevSpeaker}の言うことめっちゃわかる！`;
      } else if (role === 'carol') {
        prefix = `${prevSpeaker}さんの視点、興味深いわね。`;
      }
    }

    if (role === 'alice') {
      // アリス: 丁寧・論理派
      return prefix + baseText;
    } else if (role === 'bob') {
      // ボブ: カジュアル・直感・元気
      const casual = baseText
        .replace(/ですね。?$/, 'だよね！')
        .replace(/と思います。?$/, 'と思うな〜！')
        .replace(/ありますね。?$/, 'あるある！')
        .replace(/ですね$/, 'だし！')
        .replace(/最高です。?$/, '最高じゃん！')
        .replace(/好きです。?$/, '好きなんだよね！')
        .replace(/ますね。?$/, 'るよね！');
      return prefix + casual;
    } else {
      // キャロル: 鋭い観察・クール派
      const cool = baseText
        .replace(/ですね。?$/, 'かしら。')
        .replace(/と思います。?$/, 'と思うわ。')
        .replace(/ありますね。?$/, 'あるわね。')
        .replace(/ですね$/, 'ね。')
        .replace(/です。?$/, 'ね。');
      return prefix + cool;
    }
  };

  // ワードウルフらしい抽象的かつ知的な発言生成（ラウンド進行＆キャラ別）
  const generateStatement = (
    speakerRole: 'alice' | 'bob' | 'carol',
    r: number, // 1, 2, 3
    isWolf: boolean,
    prevSpeakerName?: string
  ): string => {
    const topic = currentTopic();
    let candidates: string[] = [];

    // ハードモードでウルフの場合、中盤以降30%で市民に擬態・同調
    if (isWolf && difficulty() === 'hard' && r >= 2 && Math.random() < 0.3) {
      const camouflagePhrases = [
        '皆さんの言う通り、そのイメージすごく共感できます！',
        '確かにそのシチュエーションが一番しっくりきますね。',
        'うんうん、私もそのニュアンスで捉えていました。',
      ];
      candidates = camouflagePhrases;
    } else if (r === 1) {
      // ラウンド1: 超抽象・様子見・何にでも当てはまりそうな表現
      candidates = [...topic.hints.round1, ...GENERAL_R1_HINTS];
    } else if (r === 2) {
      // ラウンド2: 雰囲気・シチュエーション探り
      candidates = isWolf
        ? [...topic.hints.round2Wolf, ...GENERAL_R2_HINTS]
        : [...topic.hints.round2Citizen, ...GENERAL_R2_HINTS];
    } else {
      // ラウンド3: 核心探り・こだわり・他者との比較
      candidates = isWolf
        ? [...topic.hints.round3Wolf]
        : [...topic.hints.round3Citizen];
    }

    // 未使用のフレーズを優先して重複を100%防止
    const unused = candidates.filter((c) => !usedStatements.has(c));
    const chosenRaw = unused.length > 0
      ? unused[Math.floor(Math.random() * unused.length)]
      : candidates[Math.floor(Math.random() * candidates.length)] || 'とても奥が深いテーマですよね。';

    usedStatements.add(chosenRaw);
    return applyCharacterStyle(chosenRaw, speakerRole, prevSpeakerName);
  };

  const restart = (diff = difficulty()) => {
    clearAllTimers();
    usedStatements.clear();

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

    setThinkingPlayer({ name: firstSpeaker.name, avatar: firstSpeaker.avatar });
    scrollToBottom();

    addTimer(() => {
      setThinkingPlayer(null);
      sound.playPop(480);
      const text = generateStatement('alice', 1, isFirstWolf);
      setLogs([
        {
          speaker: firstSpeaker.name,
          avatar: firstSpeaker.avatar,
          role: 'alice',
          text,
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

    // 1. ボブの思考時間演出 (約950ms)
    setThinkingPlayer({ name: 'ボブ', avatar: '🧑‍🎨' });
    scrollToBottom();

    addTimer(() => {
      const isBobWolf = wolfPlayer() === 'ボブ';
      const bobStatement = generateStatement('bob', currentR, isBobWolf, 'あなた');
      sound.playPop(480);
      setLogs((prev) => [
        ...prev,
        {
          speaker: 'ボブ',
          avatar: '🧑‍🎨',
          role: 'bob',
          text: bobStatement,
        },
      ]);
      scrollToBottom();

      // 2. キャロルの思考時間演出 (約1100ms)
      setThinkingPlayer({ name: 'キャロル', avatar: '🕵️‍♀️' });
      scrollToBottom();

      addTimer(() => {
        const isCarolWolf = wolfPlayer() === 'キャロル';
        const carolStatement = generateStatement('carol', currentR, isCarolWolf, 'ボブ');
        sound.playPop(480);
        setLogs((prev) => [
          ...prev,
          {
            speaker: 'キャロル',
            avatar: '🕵️‍♀️',
            role: 'carol',
            text: carolStatement,
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
            const aliceStatement = generateStatement('alice', currentR + 1, isAliceWolf, 'キャロル');
            sound.playPop(480);
            setLogs((prev) => [
              ...prev,
              {
                speaker: 'アリス',
                avatar: '👩‍💼',
                role: 'alice',
                text: aliceStatement,
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
                aria-label="自分のお題についての発言入力"
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
