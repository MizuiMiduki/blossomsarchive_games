import { Component, createSignal, For, Show } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import { runLocalAI } from '../../utils/local-ai.ts';

interface Chamber {
  id: number;
  title: string;
  obstacle: string;
  description: string;
  weaknessHint: string;
}

const CHAMBERS: Chamber[] = [
  {
    id: 1,
    title: '第一試練: 氷封の回廊',
    obstacle: '絶対零度の永久氷壁',
    description: '出口を阻む分厚い氷の壁。並大抵の炎では冷気によって一瞬で鎮火してしまう。',
    weaknessHint: 'ヒント: 「超高温の熱線」や「爆発的膨張」、または「高温の溶岩」のような強力な熱・圧力概念を創り出そう。',
  },
  {
    id: 2,
    title: '第二試練: 轟電の虚空裂け目',
    obstacle: '電磁嵐が渦巻く底なしの奈落',
    description: '足元には底のない裂け目、空中には激しい高圧電流が奔流となって渡る者を拒絶している。',
    weaknessHint: 'ヒント: 「絶縁体」「浮遊」「地盤形成」「重力反転」などの概念を合成して安全な架け橋を作ろう。',
  },
  {
    id: 3,
    title: '最深試練: 黒曜石の再生守護者',
    obstacle: '呪われし不死の魔導ゴーレム',
    description: '強固な黒曜石の巨躯を持ち、砕かれても周囲の魔力を吸って何度でも超再生を果たす番人。',
    weaknessHint: 'ヒント: 「魔力吸収」「時間停止」「聖なる光」「超高周波の共振破壊」などで再生能力そのものを断とう。',
  },
];

const INITIAL_ELEMENTS = [
  '火', '水', '風', '土', '光', '闇', '鉄', '時間', '生命', '雷',
];

export const WordAlchemyGame: Component = () => {
  const [chamberIdx, setChamberIdx] = createSignal(0);
  const [inventory, setInventory] = createSignal<string[]>([...INITIAL_ELEMENTS]);
  const [selectedElement1, setSelectedElement1] = createSignal<string | null>(null);
  const [selectedElement2, setSelectedElement2] = createSignal<string | null>(null);
  const [selectedActionWord, setSelectedActionWord] = createSignal<string | null>(null);
  const [actionNarrative, setActionNarrative] = createSignal<string>('');
  const [isThinking, setIsThinking] = createSignal(false);
  const [isChamberCleared, setIsChamberCleared] = createSignal(false);
  const [isVictory, setIsVictory] = createSignal(false);

  const chamber = () => CHAMBERS[chamberIdx()];

  const restart = () => {
    setChamberIdx(0);
    setInventory([...INITIAL_ELEMENTS]);
    setSelectedElement1(null);
    setSelectedElement2(null);
    setSelectedActionWord(null);
    setActionNarrative('');
    setIsChamberCleared(false);
    setIsVictory(false);
  };

  // 2つの言葉の錬成合成
  const handleSynthesize = async () => {
    const e1 = selectedElement1();
    const e2 = selectedElement2();
    if (!e1 || !e2 || isThinking()) return;

    sound.playPop(520);
    setIsThinking(true);

    const sysPrompt = `あなたは古代の言霊錬金術師です。
2つの単語（元素・概念）を調合して、新しく生まれる1つの単語・魔法概念（名詞・二字熟語〜四字程度）を生成してください。
入力: 「${e1}」 + 「${e2}」
回答フォーマット: 単語名のみを1行で出力してください（例: 溶岩, 業火, 雷電, 磁力, 結晶, 竜巻, 治癒, 恒星 など）`;

    const result = await runLocalAI(sysPrompt, `${e1} + ${e2}`, () => {
      // フォールバック合成マトリクス
      const key = [e1, e2].sort().join('+');
      const table: Record<string, string> = {
        '火+風': '業火',
        '火+水': '蒸気',
        '火+土': '溶岩',
        '火+鉄': '鍛冶',
        '水+土': '泥土',
        '水+風': '暴風雨',
        '風+土': '砂嵐',
        '光+闇': '混沌',
        '光+火': '太陽',
        '光+時間': '閃光',
        '闇+時間': '永夜',
        '土+生命': '巨樹',
        '水+生命': '治癒',
        '火+生命': '不死鳥',
        '時間+生命': '進化',
        '雷+鉄': '電磁石',
        '土+鉄': '金剛石',
        '光+鉄': '聖剣',
        '風+雷': '迅雷',
      };
      return table[key] || `${e1}の${e2}`;
    });

    const newWord = result.trim().replace(/[「」『』\n\r]/g, '').slice(0, 8);

    if (newWord && !inventory().includes(newWord)) {
      setInventory((prev) => [...prev, newWord]);
      sound.playMatch(4);
    } else {
      sound.playPop(420);
    }

    setSelectedElement1(null);
    setSelectedElement2(null);
    setIsThinking(false);
  };

  // 試練の障害物に対して言葉を発動
  const handleUseWordOnObstacle = async () => {
    const word = selectedActionWord();
    if (!word || isThinking() || isChamberCleared()) return;

    sound.playPop(550);
    setIsThinking(true);

    const ch = chamber();
    const sysPrompt = `あなたは試練の審判です。
現在の試練: 「${ch.title}」
障害物: 「${ch.obstacle}」 (${ch.description})
プレイヤーが使用した言霊・魔法: 「${word}」

この言霊の物理的・魔術的特性が、障害物の攻略として理にかなっているか厳格に判定してください。
フォーマット:
[SUCCESS] YES または NO
[NARRATIVE] どのように言霊が発動し、障害物に作用したか（成功または失敗の臨場感ある情景描写）`;

    const res = await runLocalAI(sysPrompt, `使用言霊: ${word}`, () => {
      // フォールバック論理判定
      const w = word.toLowerCase();
      let success = false;
      let text = '';

      if (chamberIdx() === 0) {
        // 氷壁
        if (w.includes('溶岩') || w.includes('業火') || w.includes('太陽') || w.includes('火') || w.includes('熱') || w.includes('爆')) {
          success = true;
          text = `言霊【${word}】が凄まじい熱波を放ち、絶対零度の氷壁が轟音と共に湯気を上げて急速に融解した！突破口が開かれた！`;
        } else {
          text = `言霊【${word}】を発動したが、永久氷壁の極冷気によって弾かれ、氷を溶かすには至らなかった。`;
        }
      } else if (chamberIdx() === 1) {
        // 奈落と雷雲
        if (w.includes('土') || w.includes('巨樹') || w.includes('石') || w.includes('地') || w.includes('磁') || w.includes('浮') || w.includes('聖')) {
          success = true;
          text = `言霊【${word}】が大地の骨格を呼び起こし、電磁嵐を受け流しながら虚空を渡る堅牢な橋梁を瞬時に形成した！`;
        } else {
          text = `言霊【${word}】は荒れ狂う電磁嵐に呑み込まれ、虚空の底へと散ってしまった。絶縁や浮揚の力が必要だ。`;
        }
      } else {
        // 不死のゴーレム
        if (w.includes('聖') || w.includes('時') || w.includes('閃光') || w.includes('進化') || w.includes('混沌') || w.includes('金剛')) {
          success = true;
          text = `言霊【${word}】の神秘の力がゴーレムの再生核を直撃！黒曜石の体が光の粒子となって崩壊し、守護者は安らかな眠りについた！`;
        } else {
          text = `言霊【${word}】でゴーレムに傷を与えたものの、魔力再生によって瞬く間に修復されてしまった。再生そのものを絶つ概念が必要だ。`;
        }
      }

      return `[SUCCESS] ${success ? 'YES' : 'NO'}\n[NARRATIVE] ${text}`;
    });

    let success = false;
    let narrative = res;

    const sMatch = res.match(/\[SUCCESS\]\s*(YES|NO)/i);
    if (sMatch && sMatch[1].toUpperCase() === 'YES') success = true;

    const nMatch = res.match(/\[NARRATIVE\]\s*([\s\S]+)/i);
    if (nMatch) narrative = nMatch[1].trim();

    setActionNarrative(narrative);

    if (success) {
      sound.playVictory();
      setIsChamberCleared(true);
    } else {
      sound.playGameOver();
    }

    setIsThinking(false);
  };

  const handleNextChamber = () => {
    const next = chamberIdx() + 1;
    if (next >= CHAMBERS.length) {
      setIsVictory(true);
      return;
    }
    setChamberIdx(next);
    setIsChamberCleared(false);
    setSelectedActionWord(null);
    setActionNarrative('');
    sound.playMatch(5);
  };

  const instructions = [
    '古代の元素を2つ選んで「合成」し、新しい言霊・アイテム・魔法を錬成してください。',
    '錬成した言葉を選んで「試練の障害物」に発動します。',
    'AIがその言葉の科学的・魔術的妥当性をその場で判定し、見事弱点を突けば障害物が打ち破られ次の回廊へ進めます！',
    '全3つの回廊を突破し、古代神殿からの完全脱出を目指しましょう。',
    '【完全プライベート】端末内のローカルAIで推論するため、言葉の合成や試行が外部サーバーへ送信・学習されることはありません。',
  ];

  return (
    <GameShell
      id="word-alchemy"
      title="Word Alchemy (言霊錬金脱出)"
      score={(chamberIdx() * 1000) + inventory().length * 100}
      isGameOver={false}
      isVictory={isVictory()}
      onRestart={restart}
      onNextStage={() => {
        setChamberIdx(0);
        restart();
      }}
      nextStageLabel="全回廊制覇！最初から遊ぶ"
      instructions={instructions}
    >
      <div class="w-full max-w-2xl h-full flex flex-col justify-between p-2 min-h-0 select-none">
        {/* 上部: 現在の試練と障害物 */}
        <div class="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md mb-2 shrink-0">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-amber-400 font-mono">{chamber().title}</span>
            <span class="text-emerald-400 font-mono text-[11px]">100% On-Device</span>
          </div>
          <div class="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>障壁:</span>
            <span class="text-rose-400">{chamber().obstacle}</span>
          </div>
          <p class="text-xs text-slate-300 mt-1 leading-relaxed">{chamber().description}</p>
          <div class="mt-1 text-[11px] text-amber-300/80 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/40">
            {chamber().weaknessHint}
          </div>
        </div>

        {/* 作用結果ナラティブ */}
        <Show when={actionNarrative()}>
          <div
            class={`p-3 rounded-2xl border text-xs font-mono leading-relaxed mb-2 shrink-0 animate-in fade-in ${
              isChamberCleared()
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <div class="font-bold mb-1">
              {isChamberCleared() ? '★ 障壁突破成功！' : '● 行動結果:'}
            </div>
            <div>{actionNarrative()}</div>
            <Show when={isChamberCleared()}>
              <button
                onClick={handleNextChamber}
                class="mt-2 w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                {chamberIdx() + 1 < CHAMBERS.length ? '次の回廊へ進む' : '脱出完了！クリア画面へ'}
              </button>
            </Show>
          </div>
        </Show>

        {/* 中央: 調合スロット & インベントリ */}
        <div class="flex-1 flex flex-col bg-slate-950 rounded-2xl p-3 border border-slate-800 shadow-inner overflow-hidden min-h-0 mb-2">
          {/* 調合枠 */}
          <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 mb-2 shrink-0 text-xs">
            <div class="flex items-center gap-1.5 flex-1">
              <span class="text-slate-400 text-[11px] font-mono shrink-0">調合:</span>
              <div class="flex items-center gap-1">
                <span class="px-2 py-1 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-200 font-bold min-w-[36px] text-center">
                  {selectedElement1() || '？'}
                </span>
                <span class="text-slate-500 font-bold">+</span>
                <span class="px-2 py-1 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-200 font-bold min-w-[36px] text-center">
                  {selectedElement2() || '？'}
                </span>
              </div>
            </div>

            <button
              onClick={handleSynthesize}
              disabled={!selectedElement1() || !selectedElement2() || isThinking()}
              class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
            >
              錬成する
            </button>
          </div>

          {/* 言霊グリモワール (手持ち単語一覧) */}
          <div class="flex-1 overflow-y-auto">
            <div class="text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
              <span>所持している言霊 (全{inventory().length}種):</span>
              <span class="text-[10px] text-slate-500">クリックで選択 / 発動</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <For each={inventory()}>
                {(word) => {
                  const isSel1 = () => selectedElement1() === word;
                  const isSel2 = () => selectedElement2() === word;
                  const isAction = () => selectedActionWord() === word;

                  return (
                    <button
                      onClick={() => {
                        sound.playPop(480);
                        if (!selectedElement1()) {
                          setSelectedElement1(word);
                        } else if (!selectedElement2() && selectedElement1() !== word) {
                          setSelectedElement2(word);
                        } else {
                          setSelectedActionWord((prev) => (prev === word ? null : word));
                        }
                      }}
                      class={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
                        isAction()
                          ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-400 scale-105'
                          : isSel1() || isSel2()
                          ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400'
                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {word}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </div>

        {/* 選択した言霊を障害物に発動 */}
        <div class="w-full flex items-center gap-2 shrink-0">
          <div class="flex-1 p-2 bg-slate-900 rounded-xl border border-slate-800 text-xs flex items-center justify-between px-3">
            <span class="text-slate-400">発動対象:</span>
            <Show
              when={selectedActionWord()}
              fallback={<span class="text-slate-500 italic">言霊をクリックして選択</span>}
            >
              <span class="font-bold text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded border border-rose-800">
                言霊【{selectedActionWord()}】
              </span>
            </Show>
          </div>

          <button
            onClick={handleUseWordOnObstacle}
            disabled={!selectedActionWord() || isThinking() || isChamberCleared()}
            class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {isThinking() ? '言霊判定中...' : '障壁に発動！'}
          </button>
        </div>
      </div>
    </GameShell>
  );
};
