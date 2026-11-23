import { Component, createSignal, onSettled, For, Show, onCleanup } from 'solid-js';
import { GameShell } from '../../components/GameShell.tsx';
import { sound } from '../../utils/sound.ts';
import confetti from 'canvas-confetti';

export type ScenarioId = 'laboratory' | 'mansion' | 'observatory';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  detailContent?: string;
  combinableWith?: string; // 合成可能な相手アイテムID
  combinedResultId?: string; // 合成後に得られるアイテムID
}

interface ScenarioData {
  id: ScenarioId;
  name: string;
  subtitle: string;
  bgColors: [string, string, string, string]; // 北・東・南・西の壁色
  floorColor: string;
  story: string;
}

const SCENARIOS: Record<ScenarioId, ScenarioData> = {
  laboratory: {
    id: 'laboratory',
    name: '秘密研究室の停電',
    subtitle: '電源復旧と薬品溶解による脱出',
    bgColors: ['#0f172a', '#1e293b', '#0f172a', '#1e293b'],
    floorColor: '#020617',
    story: '非常警報が鳴り響く地下実験室。電源が落ち、隔壁がロックされている。',
  },
  mansion: {
    id: 'mansion',
    name: '洋館の時計仕掛け書斎',
    subtitle: '古文書の修復と仕掛け時計の連動',
    bgColors: ['#292524', '#3f3f46', '#27272a', '#3f3f46'],
    floorColor: '#18181b',
    story: '時を刻む音だけが静かに響くアンティーク書斎。重厚な扉には鍵がない。',
  },
  observatory: {
    id: 'observatory',
    name: '星詠みの古代天文台',
    subtitle: '光の屈折と星座レリーフの開門',
    bgColors: ['#09132e', '#0f172a', '#172554', '#0f172a'],
    floorColor: '#030712',
    story: '満天の星空を仰ぐ円形天文台。一筋の月光が神秘的な石扉を照らす。',
  },
};

export const RoomEscapeGame: Component = () => {
  const [selectedScenario, setSelectedScenario] = createSignal<ScenarioId>('laboratory');
  const [direction, setDirection] = createSignal<number>(0); // 0: 北(正面), 1: 東(右), 2: 南(後), 3: 西(左)
  const [message, setMessage] = createSignal<string>('');
  const [inventory, setInventory] = createSignal<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = createSignal<string | null>(null);
  const [isEscaped, setIsEscaped] = createSignal(false);
  const [inspectingItem, setInspectingItem] = createSignal<InventoryItem | null>(null);

  // タイマー
  const [startTime, setStartTime] = createSignal(Date.now());
  const [elapsedSec, setElapsedSec] = createSignal(0);
  let timerId: number | null = null;

  // -------------------------------------------------------------
  // シナリオ1: 研究室 (Laboratory) 状態
  // -------------------------------------------------------------
  const [labPowerRestored, setLabPowerRestored] = createSignal(false);
  const [labBreakerOpened, setLabBreakerOpened] = createSignal(false);
  const [labPcUnlocked, setLabPcUnlocked] = createSignal(false);
  const [labAcidCreated, setLabAcidCreated] = createSignal(false);
  const [labVentMelted, setLabVentMelted] = createSignal(false);
  const [labDoorUnlocked, setLabDoorUnlocked] = createSignal(false);
  const [showLabPcModal, setShowLabPcModal] = createSignal(false);
  const [labPcInput, setLabPcInput] = createSignal('');

  // -------------------------------------------------------------
  // シナリオ2: 洋館 (Mansion) 状態
  // -------------------------------------------------------------
  const [mansionDeskUnlocked, setMansionDeskUnlocked] = createSignal(false);
  const [mansionClockSet, setMansionClockSet] = createSignal(false);
  const [mansionBookInserted, setMansionBookInserted] = createSignal(false);
  const [mansionSafeUnlocked, setMansionSafeUnlocked] = createSignal(false);
  const [mansionDoorUnlocked, setMansionDoorUnlocked] = createSignal(false);
  const [showMansionClockModal, setShowMansionClockModal] = createSignal(false);
  const [mansionClockHour, setMansionClockHour] = createSignal(12);
  const [mansionClockMinute, setMansionClockMinute] = createSignal(0);
  const [showMansionSafeModal, setShowMansionSafeModal] = createSignal(false);
  const [mansionSafeCode, setMansionSafeCode] = createSignal(['0', '0', '0']);

  // -------------------------------------------------------------
  // シナリオ3: 天文台 (Observatory) 状態
  // -------------------------------------------------------------
  const [obsTelescopeUnbolted, setObsTelescopeUnbolted] = createSignal(false);
  const [obsPrismPlaced, setObsPrismPlaced] = createSignal(false);
  const [obsPlatePlaced, setObsPlatePlaced] = createSignal(false);
  const [obsDoorSymbols, setObsDoorSymbols] = createSignal<number[]>([0, 0, 0, 0]);
  const [obsDoorUnlocked, setObsDoorUnlocked] = createSignal(false);

  const scenario = () => SCENARIOS[selectedScenario()];

  const initGame = (scId: ScenarioId) => {
    setSelectedScenario(scId);
    setDirection(0);
    setInventory([]);
    setSelectedItemId(null);
    setIsEscaped(false);
    setInspectingItem(null);
    setStartTime(Date.now());
    setElapsedSec(0);

    // 研究室リセット
    setLabPowerRestored(false);
    setLabBreakerOpened(false);
    setLabPcUnlocked(false);
    setLabAcidCreated(false);
    setLabVentMelted(false);
    setLabDoorUnlocked(false);
    setShowLabPcModal(false);
    setLabPcInput('');

    // 洋館リセット
    setMansionDeskUnlocked(false);
    setMansionClockSet(false);
    setMansionBookInserted(false);
    setMansionSafeUnlocked(false);
    setMansionDoorUnlocked(false);
    setShowMansionClockModal(false);
    setMansionClockHour(12);
    setMansionClockMinute(0);
    setShowMansionSafeModal(false);
    setMansionSafeCode(['0', '0', '0']);

    // 天文台リセット
    setObsTelescopeUnbolted(false);
    setObsPrismPlaced(false);
    setObsPlatePlaced(false);
    setObsDoorSymbols([0, 0, 0, 0]);
    setObsDoorUnlocked(false);

    setMessage(SCENARIOS[scId].story);
  };

  const hasItem = (id: string) => inventory().some((item) => item.id === id);

  const addItem = (item: InventoryItem) => {
    sound.playMatch(4);
    setInventory((inv) => [...inv, item]);
    setMessage(`【${item.name}】を手に入れた！`);
  };

  const removeItem = (id: string) => {
    setInventory((inv) => inv.filter((item) => item.id !== id));
    if (selectedItemId() === id) setSelectedItemId(null);
  };

  // 視点切り替え
  const rotateLeft = () => {
    sound.playPop(480);
    setDirection((d) => (d + 3) % 4);
  };

  const rotateRight = () => {
    sound.playPop(480);
    setDirection((d) => (d + 1) % 4);
  };

  const dirNames = ['北 (正面)', '東 (右側)', '南 (背面)', '西 (左側)'];

  // =============================================================
  // シナリオ1: 秘密研究室 (Laboratory) クリック処理
  // =============================================================

  // [西面] デスク＆工具
  const handleLabDeskClick = () => {
    if (!hasItem('screwdriver')) {
      addItem({
        id: 'screwdriver',
        name: 'マイナスドライバー',
        description: '先端の硬い精密ドライバー。配電盤のネジを外せそうだ。',
        icon: '🪛',
      });
      setMessage('作業机の引き出しから【マイナスドライバー】を見つけた！');
    } else {
      setMessage('実験用デスク。精密機械の設計図が散らばっている。');
    }
  };

  // [南面] 配電盤 (ブレーカー)
  const handleLabBreakerClick = () => {
    if (labPowerRestored()) {
      setMessage('配電盤のランプが緑色に点灯している。電力は正常に供給されている。');
      return;
    }

    if (!labBreakerOpened()) {
      if (selectedItemId() === 'screwdriver') {
        sound.playMatch(5);
        setLabBreakerOpened(true);
        setMessage('ドライバーで配電盤のカバーを開けた！ヒューズが1本焼き切れている。');
      } else {
        sound.playPop(300);
        setMessage('配電盤の蓋は頑丈なネジで固定されている。ドライバーが必要だ。');
      }
      return;
    }

    // カバーが開いている場合
    if (selectedItemId() === 'fuse') {
      sound.playVictory();
      removeItem('fuse');
      setLabPowerRestored(true);
      setMessage('バチッ！予備ヒューズを装填した！実験室の電力が復旧し、PCモニターが起動した！');
    } else {
      setMessage('ヒューズボックスの左端が空いている。「予備のヒューズ」があれば電力を復旧できそうだ。');
    }
  };

  // [東面] 薬品保管棚
  const handleLabChemicalClick = () => {
    if (!hasItem('fuse')) {
      addItem({
        id: 'fuse',
        name: '予備の管ヒューズ',
        description: '配電盤に規格が合致する新品のガラス管ヒューズ。',
        icon: '🔋',
      });
      setMessage('薬品棚の隅に転がっていた【予備の管ヒューズ】を拾った！');
      return;
    }

    if (!labPowerRestored()) {
      setMessage('薬品キャビネット。電子ロックがかかっており、電力が無いため開かない。');
      return;
    }

    if (!labAcidCreated()) {
      if (labPcUnlocked()) {
        sound.playMatch(5);
        setLabAcidCreated(true);
        addItem({
          id: 'acid_bottle',
          name: '高濃度溶解液',
          description: '金属をも瞬時に溶かす特殊な強酸の薬品。',
          icon: '🧪',
        });
        setMessage('PCで調合ロックを解除し、【高濃度溶解液】を手に入れた！');
      } else {
        setMessage('薬品キャビネット。「PCの認証コード」でロックされている。');
      }
    } else {
      setMessage('空になった薬品棚。もう必要な薬品はない。');
    }
  };

  // [西面] PCモニター
  const handleLabPcClick = () => {
    if (!labPowerRestored()) {
      sound.playPop(300);
      setMessage('停電しているためPCは起動しない。まず配電盤を直そう。');
      return;
    }
    if (labPcUnlocked()) {
      setMessage('PC画面:「薬品キャビネット解除コード送信完了。溶解液が取り出せます。」');
      return;
    }
    setShowLabPcModal(true);
  };

  // [南面] 換気ダクト (鎖で巻かれたダクト)
  const handleLabVentClick = () => {
    if (labVentMelted()) {
      setMessage('溶解した換気口。中は空っぽだ。');
      return;
    }

    if (selectedItemId() === 'acid_bottle') {
      sound.playVictory();
      removeItem('acid_bottle');
      setLabVentMelted(true);
      addItem({
        id: 'card_key',
        name: 'マスターセキュリティカード',
        description: '扉の電子認証スロットを通すための最高権限カード。',
        icon: '💳',
      });
      setMessage('ジュウウッ！溶解液で鉄鎖が溶け落ちた！中から【マスターセキュリティカード】を発見！');
    } else {
      sound.playPop(300);
      setMessage('換気口に頑丈な鉄鎖が巻き付いている。普通の道具では切断できない。金属を溶かすような薬品があれば…');
    }
  };

  // [北面] 扉
  const handleLabDoorClick = () => {
    if (isEscaped()) return;

    if (labDoorUnlocked()) {
      sound.playVictory();
      setIsEscaped(true);
      setMessage('プシューッ！重い気密扉が開き、研究室からの脱出に成功した！');
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      return;
    }

    if (!labPowerRestored()) {
      sound.playPop(300);
      setMessage('気密扉のカードリーダー。停電のため通電していない。');
      return;
    }

    if (selectedItemId() === 'card_key') {
      sound.playVictory();
      removeItem('card_key');
      setLabDoorUnlocked(true);
      setMessage('ピピピッ！「認証成功：ロック解除」。扉をクリックして外へ脱出しよう！');
    } else {
      sound.playPop(300);
      setMessage('扉の認証端末が青く点滅している。「マスターセキュリティカード」をかざす必要がある。');
    }
  };

  // =============================================================
  // シナリオ2: 洋館書斎 (Mansion) クリック処理
  // =============================================================

  // [南面] ソファ＆ダストボックス
  const handleMansionTrashClick = () => {
    if (!hasItem('paper_piece1') && !hasItem('restored_diary')) {
      addItem({
        id: 'paper_piece1',
        name: '破かれた紙片(左半分)',
        description: '何かの日誌が破り取られた紙片。右半分が欠けている。',
        icon: '📜',
        detailContent: '「……時計の針が……\n……指す時、獅子は……」',
        combinableWith: 'paper_piece2',
        combinedResultId: 'restored_diary',
      });
      setMessage('ダストボックスの底から【破かれた紙片(左半分)】を見つけた！');
    } else {
      setMessage('アンティークのダストボックス。他には何もない。');
    }
  };

  const handleMansionSofaClick = () => {
    if (!hasItem('tweezer')) {
      addItem({
        id: 'tweezer',
        name: '細身のピンセット',
        description: '狭い隙間のものを挟み取ることができる工具。',
        icon: '🥢',
      });
      setMessage('革張りソファの座面の隙間から【細身のピンセット】を拾った！');
    } else {
      setMessage('使い込まれた上質な革張りソファ。座り心地が良さそうだ。');
    }
  };

  // [東面] 額縁絵画
  const handleMansionPaintingClick = () => {
    if (!hasItem('small_brass_key') && !mansionDeskUnlocked()) {
      if (selectedItemId() === 'tweezer') {
        sound.playMatch(5);
        addItem({
          id: 'small_brass_key',
          name: '真鍮の小鍵',
          description: '机の引き出しに合いそうな精巧な小鍵。',
          icon: '🗝️',
        });
        setMessage('ピンセットを使って、額縁の裏の狭い隙間から【真鍮の小鍵】を取り出した！');
      } else {
        sound.playPop(350);
        setMessage('額縁の裏側の木枠の隙間に小さな金属が挟まっている。指では届かない…細い道具があれば。');
      }
    } else {
      setMessage('貴婦人の肖像画。右下に「3本の赤い薔薇」が描かれている。');
    }
  };

  // [西面] 重厚なライティングデスク
  const handleMansionDeskClick = () => {
    if (!mansionDeskUnlocked()) {
      if (selectedItemId() === 'small_brass_key') {
        sound.playMatch(5);
        removeItem('small_brass_key');
        setMansionDeskUnlocked(true);
        addItem({
          id: 'paper_piece2',
          name: '破かれた紙片(右半分)',
          description: '日誌の右半分の紙片。左半分と組み合わせると読めそうだ。',
          icon: '📜',
          detailContent: '「……3時45分を……\n……眠りから覚める。」',
          combinableWith: 'paper_piece1',
          combinedResultId: 'restored_diary',
        });
        setMessage('カチリ！引き出しが開いた！【破かれた紙片(右半分)】を見つけた！（持ち物欄で左半分と合成できます）');
      } else {
        sound.playPop(300);
        setMessage('引き出しには鍵がかかっている。「真鍮の小鍵」が必要だ。');
      }
    } else {
      setMessage('ライティングデスクの天板。暖炉の火の粉の跡が「5つ」刻まれている。');
    }
  };

  // [北面] 柱時計
  const handleMansionClockClick = () => {
    if (mansionClockSet()) {
      setMessage('時計は3時45分で止まり、仕掛けが作動している。');
      return;
    }
    setShowMansionClockModal(true);
  };

  // [東面] 本棚
  const handleMansionBookshelfClick = () => {
    if (!mansionBookInserted()) {
      if (selectedItemId() === 'golden_book') {
        sound.playVictory();
        removeItem('golden_book');
        setMansionBookInserted(true);
        setMessage('カチッ！金箔の本を隙間に差し込むと、本棚がスライドして奥から「隠し金庫」が現れた！');
      } else {
        sound.playPop(300);
        setMessage('本棚の中段にちょうど1冊分だけ空いた隙間がある。ぴったりの本を差し込めば仕掛けが動きそうだ。');
      }
    } else if (!mansionSafeUnlocked()) {
      setShowMansionSafeModal(true);
    } else {
      setMessage('開いた隠し金庫。中は空だ。');
    }
  };

  // [北面] 扉
  const handleMansionDoorClick = () => {
    if (isEscaped()) return;

    if (mansionDoorUnlocked()) {
      sound.playVictory();
      setIsEscaped(true);
      setMessage('ギギギ…と重厚な扉が開き、洋館からの脱出に成功した！');
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      return;
    }

    if (selectedItemId() === 'mansion_master_key') {
      sound.playVictory();
      removeItem('mansion_master_key');
      setMansionDoorUnlocked(true);
      setMessage('ガチャリ！マスターキーで本錠が解錠された！扉をクリックして外へ！');
    } else {
      sound.playPop(300);
      setMessage('重厚な洋館の脱出扉。金庫にある「マスターキー」が必要だ。');
    }
  };

  // =============================================================
  // シナリオ3: 古代天文台 (Observatory) クリック処理
  // =============================================================

  // [西面] 天文学者の作業机
  const handleObsDeskClick = () => {
    if (!hasItem('hex_wrench')) {
      addItem({
        id: 'hex_wrench',
        name: '六角レンチ',
        description: 'ボルトを緩めるための工具。',
        icon: '🔧',
      });
      setMessage('作業机から【六角レンチ】を手に入れた！');
    } else {
      setMessage('星図盤が広げられた机。「天の光は東の台座で屈折し、北の石扉に宿る」と記されている。');
    }
  };

  // [南面] 天体望遠鏡
  const handleObsTelescopeClick = () => {
    if (obsTelescopeUnbolted()) {
      setMessage('レンズが外された天体望遠鏡。夜空の星々が見える。');
      return;
    }

    if (selectedItemId() === 'hex_wrench') {
      sound.playMatch(5);
      setObsTelescopeUnbolted(true);
      addItem({
        id: 'prism_lens',
        name: '集光クリスタルプリズム',
        description: '光を鋭く屈折・集光する特殊な多面体ガラス。',
        icon: '💎',
      });
      setMessage('六角レンチで望遠鏡の固定ボルトを外し、【集光クリスタルプリズム】を取り外した！');
    } else {
      sound.playPop(300);
      setMessage('大型天体望遠鏡。レンズ筒は「六角ボルト」でしっかりと固定されている。');
    }
  };

  // [東面] 集光台座 & 天球儀
  const handleObsPedestalClick = () => {
    if (!obsPrismPlaced()) {
      if (selectedItemId() === 'prism_lens') {
        sound.playVictory();
        removeItem('prism_lens');
        setObsPrismPlaced(true);
        setMessage('ピカーッ！クリスタルを台座に置くと、月光が屈折して北の石扉のレリーフを直射した！');
      } else {
        sound.playPop(300);
        setMessage('大理石の台座。上空の天窓から一筋の月光がまっすぐ落ちている。ここに光を集めるものがあれば…');
      }
    } else {
      setMessage('まばゆい光が屈折し、北の石扉を一直線に照らし出している！');
    }
  };

  const handleObsGlobeClick = () => {
    if (!hasItem('stone_plate')) {
      addItem({
        id: 'stone_plate',
        name: '4星座の石板コア',
        description: '石扉の中央にはめ込む星の鍵石。',
        icon: '🪨',
      });
      setMessage('真鍮の天球儀の底面に隠されていた【4星座の石板コア】を発見した！');
    } else {
      setMessage('黄金に輝く天球儀。美しく回転している。');
    }
  };

  // [北面] 石扉
  const handleObsDoorClick = () => {
    if (isEscaped()) return;

    if (obsDoorUnlocked()) {
      sound.playVictory();
      setIsEscaped(true);
      setMessage('ゴゴゴ…！古代の石扉が左右に開き、満天の星空の下へ脱出した！');
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      return;
    }

    if (!obsPrismPlaced()) {
      sound.playPop(300);
      setMessage('北の石扉。刻まれた星座レリーフが暗くて読み取れない。東の台座に光を集めよう。');
      return;
    }

    if (!obsPlatePlaced()) {
      if (selectedItemId() === 'stone_plate') {
        sound.playMatch(5);
        removeItem('stone_plate');
        setObsPlatePlaced(true);
        setMessage('カチリ！扉の中央に石板コアをはめ込んだ！4つの星座リングが回転可能になった！');
      } else {
        sound.playPop(300);
        setMessage('石扉の中央にくぼみがある。「石板コア」をはめ込む必要がある。');
      }
    } else {
      // 星座リングを回転させて解く
      // 正解コード: [2, 0, 3, 1] (太陽, 牡牛, 獅子, 白鳥)
      const cur = obsDoorSymbols();
      const next = [...cur];
      next[0] = (next[0] + 1) % 4;
      setObsDoorSymbols(next);
      sound.playPop(480);

      if (next[0] === 2 && next[1] === 0 && next[2] === 3 && next[3] === 1) {
        sound.playVictory();
        setObsDoorUnlocked(true);
        setMessage('ゴゴゴ…！星座の配置が一致し、石扉のロックが解錠された！扉をクリックして脱出！');
      }
    }
  };

  // アイテム合成処理
  const combineItem = (item1: InventoryItem, item2: InventoryItem) => {
    if (
      (item1.combinableWith === item2.id || item2.combinableWith === item1.id) &&
      (item1.combinedResultId || item2.combinedResultId)
    ) {
      sound.playVictory();
      removeItem(item1.id);
      removeItem(item2.id);

      if (selectedScenario() === 'mansion') {
        addItem({
          id: 'restored_diary',
          name: '修復された日誌',
          description: '破れた紙片を完全に貼り合わせた古い日誌。',
          icon: '📖',
          detailContent:
            '【当主の日誌】\n「時計の針が【3時45分】を指す時、柱時計の獅子が眠りから覚め、金箔の本を差し出すであろう。暖炉の炎（3本）と机の傷（5つ）と薔薇（8輪）が隠し扉を拓く。」',
        });
        setMessage('キラーン！【破かれた紙片】を組み合わせ、完全な【修復された日誌】が完成した！');
      }
    } else {
      sound.playPop(280);
      setMessage('このアイテム同士は組み合わせられない。');
    }
  };

  // アイテム選択・使用
  const handleItemClick = (item: InventoryItem) => {
    const cur = selectedItemId();
    if (cur === item.id) {
      // 同じアイテムを再度タップ -> 詳細閲覧モーダルを開く
      setInspectingItem(item);
      sound.playPop(500);
    } else if (cur) {
      // 別アイテムを選択中にタップ -> 合成試行
      const firstItem = inventory().find((i) => i.id === cur);
      if (firstItem) {
        combineItem(firstItem, item);
      }
    } else {
      setSelectedItemId(item.id);
      sound.playPop(420);
    }
  };

  onSettled(() => {
    initGame('laboratory');
    timerId = window.setInterval(() => {
      if (!isEscaped()) {
        setElapsedSec(Math.floor((Date.now() - startTime()) / 1000));
      }
    }, 1000);
  });

  onCleanup(() => {
    if (timerId) clearInterval(timerId);
  });

  const instructions = [
    '部屋の4面（北・東・南・西）を左右の◀ ▶ボタンで切り替えて探索する本格脱出アドベンチャーです。',
    '【シナリオごとに脱出の流れが根本から変化】：電源復旧・薬品調合、古文書修復・仕掛け時計、光の屈折・星座開門など多彩！',
    'アイテム欄でアイテムをタップして選択し、怪しい場所に使用できます。',
    'アイテム同士を連続タップすると「合成（合体）」できるものもあります！',
    '頭脳とひらめきを駆使して、完全脱出を目指しましょう！',
  ];

  return (
    <GameShell
      id="room-escape"
      title="Room Escape (本格脱出ゲーム)"
      score={isEscaped() ? Math.max(500, 6000 - elapsedSec() * 15) : 0}
      isGameOver={false}
      isVictory={isEscaped()}
      onRestart={() => initGame(selectedScenario())}
      instructions={instructions}
      extraControls={
        <div class="flex flex-col sm:flex-row items-center gap-2 w-full max-w-md">
          {/* シナリオ選択タブ */}
          <div class="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs w-full justify-between">
            <button
              onClick={() => {
                sound.playPop(440);
                initGame('laboratory');
              }}
              class={`flex-1 py-1 px-1.5 rounded-xl font-bold transition-all text-center text-[11px] truncate ${
                selectedScenario() === 'laboratory'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🧪 秘密研究室
            </button>
            <button
              onClick={() => {
                sound.playPop(440);
                initGame('mansion');
              }}
              class={`flex-1 py-1 px-1.5 rounded-xl font-bold transition-all text-center text-[11px] truncate ${
                selectedScenario() === 'mansion'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🕰️ 洋館の書斎
            </button>
            <button
              onClick={() => {
                sound.playPop(440);
                initGame('observatory');
              }}
              class={`flex-1 py-1 px-1.5 rounded-xl font-bold transition-all text-center text-[11px] truncate ${
                selectedScenario() === 'observatory'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🔭 古代天文台
            </button>
          </div>
        </div>
      }
    >
      <div class="flex flex-col items-center gap-2 w-full max-w-lg select-none">
        {/* メッセージバー */}
        <div class="w-full bg-slate-900/90 text-slate-100 px-4 py-2 rounded-2xl border border-slate-700/80 text-xs shadow-sm min-h-[42px] flex items-center justify-between">
          <p class="leading-relaxed font-medium">{message()}</p>
          <span class="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
            ⏱️ {Math.floor(elapsedSec() / 60)}:{(elapsedSec() % 60).toString().padStart(2, '0')}
          </span>
        </div>

        {/* 部屋の360°ビューワー (4面視点) */}
        <div
          class="w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 relative transition-all duration-300 flex flex-col justify-between p-3"
          style={{
            'background-color': scenario().bgColors[direction()],
          }}
        >
          {/* 上部: 現在の方位表示 */}
          <div class="w-full flex items-center justify-between z-10">
            <span class="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold border border-white/20 shadow-xs">
              🧭 {dirNames[direction()]}
            </span>
            <span class="bg-black/40 px-2.5 py-0.5 rounded-full text-slate-300 text-[10px]">
              {scenario().name}
            </span>
          </div>

          {/* ======================================================= */}
          {/* シナリオ別・面別のオブジェクト描画 */}
          {/* ======================================================= */}
          <div class="absolute inset-0 flex items-center justify-center p-6">
            {/* ---------------- 1. 研究室 (Laboratory) ---------------- */}
            <Show when={selectedScenario() === 'laboratory'}>
              {/* 北面 (0): 気密扉 */}
              <Show when={direction() === 0}>
                <div
                  onClick={handleLabDoorClick}
                  class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-98"
                >
                  <div
                    class={`w-40 h-56 rounded-t-3xl border-4 transition-all flex flex-col items-center justify-center relative shadow-2xl ${
                      labDoorUnlocked()
                        ? 'border-emerald-400 bg-emerald-950/40'
                        : 'border-slate-500 bg-slate-800'
                    }`}
                  >
                    <div class="w-12 h-12 rounded-full border-2 border-slate-600 flex items-center justify-center text-xl mb-4">
                      {labDoorUnlocked() ? '🔓' : '🔒'}
                    </div>
                    {/* カードリーダースロット */}
                    <div
                      class={`px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                        labPowerRestored()
                          ? labDoorUnlocked()
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400'
                            : 'bg-blue-500/20 text-blue-400 border-blue-400 animate-pulse'
                          : 'bg-slate-900 text-slate-500 border-slate-700'
                      }`}
                    >
                      <span>💳</span>
                      <span>{labPowerRestored() ? (labDoorUnlocked() ? 'OPEN' : 'READY') : 'NO POWER'}</span>
                    </div>
                  </div>
                  <span class="text-xs font-bold text-slate-300 group-hover:text-white">
                    電子ロック式 気密扉
                  </span>
                </div>
              </Show>

              {/* 東面 (1): 薬品保管棚 */}
              <Show when={direction() === 1}>
                <div
                  onClick={handleLabChemicalClick}
                  class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-98"
                >
                  <div class="w-52 h-52 bg-slate-800/90 rounded-2xl border-4 border-slate-600 p-3 shadow-xl grid grid-cols-3 gap-2">
                    <div class="bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center text-2xl border border-slate-700">
                      🧪
                      <span class="text-[9px] text-rose-400 font-bold mt-1">試薬A</span>
                    </div>
                    <div class="bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center text-2xl border border-slate-700">
                      🧴
                      <span class="text-[9px] text-sky-400 font-bold mt-1">試薬B</span>
                    </div>
                    <div class="bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center text-2xl border border-slate-700">
                      🧪
                      <span class="text-[9px] text-amber-400 font-bold mt-1">試薬C</span>
                    </div>
                  </div>
                  <span class="text-xs font-bold text-slate-300 group-hover:text-white">
                    薬品キャビネット
                  </span>
                </div>
              </Show>

              {/* 南面 (2): 配電盤 & 換気ダクト */}
              <Show when={direction() === 2}>
                <div class="flex items-center justify-around w-full gap-4">
                  {/* 配電盤 */}
                  <div
                    onClick={handleLabBreakerClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div
                      class={`w-28 h-40 rounded-xl border-4 flex flex-col items-center justify-center p-2 shadow-xl ${
                        labPowerRestored()
                          ? 'border-emerald-500 bg-emerald-950/40'
                          : labBreakerOpened()
                          ? 'border-amber-500 bg-amber-950/40'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      <span class="text-3xl mb-2">⚡</span>
                      <span
                        class={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          labPowerRestored()
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white animate-pulse'
                        }`}
                      >
                        {labPowerRestored() ? '通電中' : labBreakerOpened() ? 'ヒューズ破損' : 'ネジ止め'}
                      </span>
                    </div>
                    <span class="text-xs font-bold text-slate-300 group-hover:text-white">
                      高圧配電盤
                    </span>
                  </div>

                  {/* 換気ダクト */}
                  <div
                    onClick={handleLabVentClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-28 h-28 rounded-full border-4 border-slate-600 bg-slate-900 flex items-center justify-center text-3xl shadow-xl relative">
                      <span>💨</span>
                      <Show when={!labVentMelted()}>
                        <div class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full text-base font-bold text-rose-400">
                          ⛓️ 鎖固定
                        </div>
                      </Show>
                    </div>
                    <span class="text-xs font-bold text-slate-300 group-hover:text-white">
                      排気口ダクト
                    </span>
                  </div>
                </div>
              </Show>

              {/* 西面 (3): 作業デスク & PCモニター */}
              <Show when={direction() === 3}>
                <div class="flex items-center justify-around w-full gap-4">
                  <div
                    onClick={handleLabPcClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div
                      class={`w-36 h-28 rounded-2xl border-4 flex flex-col items-center justify-center shadow-xl ${
                        labPowerRestored()
                          ? 'border-blue-400 bg-blue-950/60 shadow-blue-500/20'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      <span class="text-3xl mb-1">{labPowerRestored() ? '💻' : '🖥️'}</span>
                      <span class="text-[10px] font-mono text-slate-300">
                        {labPowerRestored() ? (labPcUnlocked() ? 'AUTH OK' : 'LOGIN NEEDED') : 'OFFLINE'}
                      </span>
                    </div>
                    <span class="text-xs font-bold text-slate-300 group-hover:text-white">
                      解析端末PC
                    </span>
                  </div>

                  <div
                    onClick={handleLabDeskClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-32 h-24 rounded-2xl border-4 border-slate-600 bg-slate-800 flex items-center justify-center text-3xl shadow-xl">
                      🛠️
                    </div>
                    <span class="text-xs font-bold text-slate-300 group-hover:text-white">
                      作業机の引き出し
                    </span>
                  </div>
                </div>
              </Show>
            </Show>

            {/* ---------------- 2. 洋館の書斎 (Mansion) ---------------- */}
            <Show when={selectedScenario() === 'mansion'}>
              {/* 北面 (0): 重厚な木製扉 & 柱時計 */}
              <Show when={direction() === 0}>
                <div class="flex items-center justify-around w-full gap-4">
                  <div
                    onClick={handleMansionDoorClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-98"
                  >
                    <div
                      class={`w-36 h-56 rounded-t-3xl border-4 flex flex-col items-center justify-center shadow-2xl ${
                        mansionDoorUnlocked()
                          ? 'border-amber-400 bg-amber-950/40'
                          : 'border-amber-800 bg-[#3d271d]'
                      }`}
                    >
                      <span class="text-3xl mb-2">{mansionDoorUnlocked() ? '🚪' : '🦁'}</span>
                      <span class="text-[10px] font-bold text-amber-200">
                        {mansionDoorUnlocked() ? '解錠済み' : '施錠中'}
                      </span>
                    </div>
                    <span class="text-xs font-bold text-amber-200 group-hover:text-white">
                      獅子の重厚扉
                    </span>
                  </div>

                  <div
                    onClick={handleMansionClockClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-24 h-52 bg-[#2d1b13] border-4 border-amber-900 rounded-2xl flex flex-col items-center justify-center p-2 shadow-xl">
                      <span class="text-3xl mb-2">🕰️</span>
                      <span class="text-[10px] text-amber-300 font-mono font-bold">
                        {mansionClockSet() ? '3:45' : '???'}
                      </span>
                    </div>
                    <span class="text-xs font-bold text-amber-200 group-hover:text-white">
                      大きな柱時計
                    </span>
                  </div>
                </div>
              </Show>

              {/* 東面 (1): 本棚 & 絵画 */}
              <Show when={direction() === 1}>
                <div class="flex items-center justify-around w-full gap-4">
                  <div
                    onClick={handleMansionBookshelfClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-40 h-52 bg-[#331f16] border-4 border-amber-900 rounded-2xl p-2 flex flex-col justify-around shadow-xl">
                      <div class="flex gap-1 text-lg">📚📕📗📘</div>
                      <div
                        class={`h-8 rounded border flex items-center justify-center text-xs font-bold ${
                          mansionBookInserted()
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                            : 'bg-black/40 text-amber-500/60 border-dashed border-amber-500/50'
                        }`}
                      >
                        {mansionBookInserted() ? '金庫出現！' : '本1冊分の隙間'}
                      </div>
                      <div class="flex gap-1 text-lg">📙📘📕📗</div>
                    </div>
                    <span class="text-xs font-bold text-amber-200 group-hover:text-white">
                      アンティーク本棚
                    </span>
                  </div>

                  <div
                    onClick={handleMansionPaintingClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-32 h-40 bg-amber-950 border-4 border-amber-600 rounded-xl flex items-center justify-center text-4xl shadow-xl">
                      🖼️
                    </div>
                    <span class="text-xs font-bold text-amber-200 group-hover:text-white">
                      貴婦人の肖像画
                    </span>
                  </div>
                </div>
              </Show>

              {/* 南面 (2): ソファ & ダストボックス */}
              <Show when={direction() === 2}>
                <div class="flex items-center justify-around w-full gap-4">
                  <div
                    onClick={handleMansionSofaClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-44 h-28 bg-[#4a2e1b] border-4 border-amber-950 rounded-3xl flex items-center justify-center text-4xl shadow-xl">
                      🛋️
                    </div>
                    <span class="text-xs font-bold text-amber-200 group-hover:text-white">
                      革張りソファ
                    </span>
                  </div>

                  <div
                    onClick={handleMansionTrashClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-24 h-28 bg-stone-800 border-4 border-stone-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl">
                      🗑️
                    </div>
                    <span class="text-xs font-bold text-amber-200 group-hover:text-white">
                      ダストボックス
                    </span>
                  </div>
                </div>
              </Show>

              {/* 西面 (3): デスク */}
              <Show when={direction() === 3}>
                <div
                  onClick={handleMansionDeskClick}
                  class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  <div class="w-56 h-36 bg-[#3d271d] border-4 border-amber-900 rounded-2xl p-3 flex flex-col justify-between shadow-2xl">
                    <div class="flex justify-between items-center text-xl">
                      <span>🕯️</span>
                      <span class="text-xs text-amber-300 font-mono">5つの火の粉</span>
                    </div>
                    <div class="w-full bg-black/40 rounded-xl p-2 text-center text-xs font-bold text-amber-200">
                      {mansionDeskUnlocked() ? '引き出し: 開放' : '🗝️ 引き出し施錠中'}
                    </div>
                  </div>
                  <span class="text-xs font-bold text-amber-200 group-hover:text-white">
                    ライティングデスク
                  </span>
                </div>
              </Show>
            </Show>

            {/* ---------------- 3. 古代天文台 (Observatory) ---------------- */}
            <Show when={selectedScenario() === 'observatory'}>
              {/* 北面 (0): 古代石扉 */}
              <Show when={direction() === 0}>
                <div
                  onClick={handleObsDoorClick}
                  class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-98"
                >
                  <div
                    class={`w-48 h-60 rounded-t-3xl border-4 flex flex-col items-center justify-center p-3 shadow-2xl relative ${
                      obsDoorUnlocked()
                        ? 'border-indigo-400 bg-indigo-950/40 shadow-indigo-500/20'
                        : 'border-slate-600 bg-slate-900'
                    }`}
                  >
                    <span class="text-3xl mb-2">{obsDoorUnlocked() ? '🚪' : '🏛️'}</span>
                    <div class="grid grid-cols-2 gap-1.5 p-2 bg-black/50 rounded-xl border border-indigo-500/30">
                      <span class="text-lg text-amber-300 text-center">
                        {['☀️', '🐂', '🦢', '🦁'][obsDoorSymbols()[0]]}
                      </span>
                      <span class="text-lg text-amber-300 text-center">
                        {['☀️', '🐂', '🦢', '🦁'][obsDoorSymbols()[1]]}
                      </span>
                      <span class="text-lg text-amber-300 text-center">
                        {['☀️', '🐂', '🦢', '🦁'][obsDoorSymbols()[2]]}
                      </span>
                      <span class="text-lg text-amber-300 text-center">
                        {['☀️', '🐂', '🦢', '🦁'][obsDoorSymbols()[3]]}
                      </span>
                    </div>
                    <Show when={obsPrismPlaced()}>
                      <div class="absolute inset-0 border-2 border-indigo-400/60 rounded-t-3xl animate-pulse pointer-events-none" />
                    </Show>
                  </div>
                  <span class="text-xs font-bold text-indigo-200 group-hover:text-white">
                    星座刻印の石扉
                  </span>
                </div>
              </Show>

              {/* 東面 (1): 集光台座 & 天球儀 */}
              <Show when={direction() === 1}>
                <div class="flex items-center justify-around w-full gap-4">
                  <div
                    onClick={handleObsPedestalClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div
                      class={`w-36 h-44 rounded-2xl border-4 flex flex-col items-center justify-center p-3 shadow-xl ${
                        obsPrismPlaced()
                          ? 'border-indigo-400 bg-indigo-950/60 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span class="text-4xl mb-2">{obsPrismPlaced() ? '💎' : '🏛️'}</span>
                      <span class="text-[10px] font-bold text-indigo-300">
                        {obsPrismPlaced() ? '集光ビーム照射中' : '月光の台座'}
                      </span>
                    </div>
                    <span class="text-xs font-bold text-indigo-200 group-hover:text-white">
                      大理石の集光台座
                    </span>
                  </div>

                  <div
                    onClick={handleObsGlobeClick}
                    class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                  >
                    <div class="w-28 h-36 bg-slate-900 border-4 border-amber-600 rounded-2xl flex items-center justify-center text-4xl shadow-xl">
                      🪐
                    </div>
                    <span class="text-xs font-bold text-indigo-200 group-hover:text-white">
                      真鍮の天球儀
                    </span>
                  </div>
                </div>
              </Show>

              {/* 南面 (2): 天体望遠鏡 */}
              <Show when={direction() === 2}>
                <div
                  onClick={handleObsTelescopeClick}
                  class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  <div class="w-52 h-44 bg-slate-800/90 border-4 border-slate-600 rounded-3xl p-4 flex flex-col items-center justify-center shadow-xl">
                    <span class="text-5xl mb-2">🔭</span>
                    <span class="text-[10px] font-bold text-indigo-300">
                      {obsTelescopeUnbolted() ? 'レンズ取り外し済み' : '六角ボルト固定'}
                    </span>
                  </div>
                  <span class="text-xs font-bold text-indigo-200 group-hover:text-white">
                    大型屈折望遠鏡
                  </span>
                </div>
              </Show>

              {/* 西面 (3): 作業机 */}
              <Show when={direction() === 3}>
                <div
                  onClick={handleObsDeskClick}
                  class="cursor-pointer group flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  <div class="w-52 h-36 bg-slate-900 border-4 border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xl">
                    <span class="text-4xl mb-2">📜</span>
                    <span class="text-xs text-indigo-300 font-bold">星図盤と工具</span>
                  </div>
                  <span class="text-xs font-bold text-indigo-200 group-hover:text-white">
                    天文学者の作業机
                  </span>
                </div>
              </Show>
            </Show>
          </div>

          {/* 下部: 左右の視点回転ボタン */}
          <div class="w-full flex items-center justify-between z-10 px-2">
            <button
              onClick={rotateLeft}
              class="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-lg font-bold flex items-center justify-center border border-white/20 shadow-lg active:scale-90 transition-all cursor-pointer"
              title="左を向く"
            >
              ◀
            </button>
            <span class="text-[11px] text-white/70 font-semibold bg-black/40 px-3 py-1 rounded-full">
              左右の矢印で部屋を見渡す
            </span>
            <button
              onClick={rotateRight}
              class="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-lg font-bold flex items-center justify-center border border-white/20 shadow-lg active:scale-90 transition-all cursor-pointer"
              title="右を向く"
            >
              ▶
            </button>
          </div>
        </div>

        {/* インベントリ (持ち物スロット) */}
        <div class="w-full bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>持ち物 (タップで選択 / 2回タップで拡大・合成):</span>
            <span class="text-[10px] text-slate-400">{inventory().length} 個所持</span>
          </div>

          <div class="flex items-center gap-2 overflow-x-auto min-h-[58px] py-1">
            <For each={inventory()}>
              {(item) => {
                const isSelected = () => selectedItemId() === item.id;
                return (
                  <button
                    onClick={() => handleItemClick(item)}
                    class={`p-2 rounded-xl flex flex-col items-center justify-center min-w-[54px] transition-all border shrink-0 ${
                      isSelected()
                        ? 'bg-rose-500/20 border-rose-500 shadow-sm scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:scale-102'
                    }`}
                  >
                    <span class="text-2xl">{item.icon}</span>
                    <span class="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[50px] mt-0.5">
                      {item.name}
                    </span>
                  </button>
                );
              }}
            </For>
            <Show when={inventory().length === 0}>
              <span class="text-xs text-slate-400 italic">アイテムは持っていません</span>
            </Show>
          </div>
        </div>

        {/* ---------------- モーダル類 ---------------- */}

        {/* PCログインモーダル (研究室) */}
        <Show when={showLabPcModal()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl">
              <h3 class="text-base font-bold mb-2 flex items-center gap-2">
                <span>💻</span>
                <span>研究端末 認証コンソール</span>
              </h3>
              <p class="text-xs text-slate-400 mb-4">
                ヒント: 「試薬の番号（3・1・2）」
              </p>
              <input
                type="text"
                placeholder="パスワードを入力..."
                value={labPcInput()}
                onInput={(e) => setLabPcInput(e.currentTarget.value)}
                class="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm mb-4 font-mono text-center"
              />
              <div class="flex gap-2">
                <button
                  onClick={() => {
                    if (labPcInput().trim() === '312') {
                      sound.playVictory();
                      setLabPcUnlocked(true);
                      setShowLabPcModal(false);
                      setMessage('ログイン成功！薬品保管棚の遠隔解除コードを送信しました！');
                    } else {
                      sound.playPop(250);
                      setMessage('パスワードが違います。');
                    }
                  }}
                  class="flex-1 py-2 rounded-xl bg-blue-600 font-bold text-xs hover:bg-blue-500"
                >
                  認証実行
                </button>
                <button
                  onClick={() => setShowLabPcModal(false)}
                  class="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* 時計合わせモーダル (洋館) */}
        <Show when={showMansionClockModal()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div class="bg-stone-900 border border-amber-800 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl flex flex-col items-center">
              <h3 class="text-base font-bold mb-2 text-amber-300">🕰️ 柱時計の針を合わせる</h3>
              <p class="text-xs text-slate-400 mb-4 text-center">
                修復された日誌の日時に時刻を合わせよう。
              </p>
              <div class="flex items-center gap-4 text-3xl font-mono font-black my-2">
                <button
                  onClick={() => setMansionClockHour((h) => ((h % 12) + 1))}
                  class="p-2 bg-stone-800 rounded-xl"
                >
                  {mansionClockHour()}時
                </button>
                <span>:</span>
                <button
                  onClick={() => setMansionClockMinute((m) => (m + 15) % 60)}
                  class="p-2 bg-stone-800 rounded-xl"
                >
                  {mansionClockMinute().toString().padStart(2, '0')}分
                </button>
              </div>
              <div class="flex gap-2 w-full mt-4">
                <button
                  onClick={() => {
                    if (mansionClockHour() === 3 && mansionClockMinute() === 45) {
                      sound.playVictory();
                      setMansionClockSet(true);
                      setShowMansionClockModal(false);
                      addItem({
                        id: 'golden_book',
                        name: '金箔装丁の重厚な書物',
                        description: '本棚の中央にぴたりとはまりそうな特製の本。',
                        icon: '📕',
                      });
                      setMessage('ゴゴゴ…！時計から隠し引き出しが露出し、【金箔装丁の書物】を入手！');
                    } else {
                      sound.playPop(250);
                      setMessage('何も起こらない。時刻が違うようだ。');
                    }
                  }}
                  class="flex-1 py-2 rounded-xl bg-amber-600 font-bold text-xs hover:bg-amber-500"
                >
                  決定
                </button>
                <button
                  onClick={() => setShowMansionClockModal(false)}
                  class="px-4 py-2 rounded-xl bg-stone-800 text-xs font-bold"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* 金庫モーダル (洋館) */}
        <Show when={showMansionSafeModal()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div class="bg-stone-900 border border-amber-800 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl flex flex-col items-center">
              <h3 class="text-base font-bold mb-2 text-amber-300">🔐 隠し金庫のダイヤル</h3>
              <p class="text-xs text-slate-400 mb-4 text-center">
                薔薇の数(3)、机の傷(5)、絵画の薔薇(8)
              </p>
              <div class="flex gap-3 my-2">
                <For each={mansionSafeCode()}>
                  {(digit, idx) => (
                    <button
                      onClick={() => {
                        sound.playPop(480);
                        const next = [...mansionSafeCode()];
                        next[idx()] = ((parseInt(next[idx()], 10) + 1) % 10).toString();
                        setMansionSafeCode(next);
                      }}
                      class="w-12 h-14 bg-stone-800 border border-amber-600 rounded-xl text-2xl font-bold font-mono"
                    >
                      {digit}
                    </button>
                  )}
                </For>
              </div>
              <div class="flex gap-2 w-full mt-4">
                <button
                  onClick={() => {
                    if (mansionSafeCode().join('') === '358') {
                      sound.playVictory();
                      setMansionSafeUnlocked(true);
                      setShowMansionSafeModal(false);
                      addItem({
                        id: 'mansion_master_key',
                        name: '洋館のマスターキー',
                        description: '獅子の重厚扉を解錠できる真鍮のマスターキー。',
                        icon: '🔑',
                      });
                      setMessage('ガチャリ！金庫が開いた！【洋館のマスターキー】を入手！');
                    } else {
                      sound.playPop(250);
                      setMessage('暗号が違います。');
                    }
                  }}
                  class="flex-1 py-2 rounded-xl bg-amber-600 font-bold text-xs hover:bg-amber-500"
                >
                  解錠
                </button>
                <button
                  onClick={() => setShowMansionSafeModal(false)}
                  class="px-4 py-2 rounded-xl bg-stone-800 text-xs font-bold"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </Show>
        {/* アイテム詳細・鑑定モーダル */}
        <Show when={inspectingItem()}>
          {(item) => (
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
              <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl flex flex-col items-center">
                <div class="text-5xl mb-3">{item().icon}</div>
                <h3 class="text-base font-bold mb-1 text-slate-100">{item().name}</h3>
                <p class="text-xs text-slate-400 mb-4 text-center leading-relaxed">
                  {item().description}
                </p>

                <Show when={item().detailContent}>
                  <div class="w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs text-amber-200/90 whitespace-pre-wrap leading-relaxed font-serif mb-4">
                    {item().detailContent}
                  </div>
                </Show>

                <button
                  onClick={() => setInspectingItem(null)}
                  class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </Show>
      </div>
    </GameShell>
  );
};