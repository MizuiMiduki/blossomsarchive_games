import { Component, createSignal, onCleanup, Show } from 'solid-js';
import { ZeroTrustP2P } from '../../utils/p2p';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

interface TopicPair {
  citizen: string;
  wolf: string;
  category: string;
}

const TOPIC_PAIRS: TopicPair[] = [
  { citizen: 'うどん', wolf: 'そば', category: '麺類' },
  { citizen: 'コーヒー', wolf: '紅茶', category: '飲み物' },
  { citizen: 'リンゴ', wolf: '梨', category: '果物' },
  { citizen: '遊園地', wolf: '水族館', category: 'レジャースポット' },
  { citizen: '新幹線', wolf: '飛行機', category: '乗り物' },
  { citizen: 'マクドナルド', wolf: 'モスバーガー', category: 'ファストフード' },
  { citizen: 'シャーペン', wolf: '鉛筆', category: '文房具' },
  { citizen: 'スキー', wolf: 'スノーボード', category: 'ウィンタースポーツ' },
  { citizen: '映画館', wolf: 'プラネタリウム', category: '施設' },
  { citizen: '犬', wolf: '猫', category: 'ペット' },
  { citizen: '焼肉', wolf: 'すき焼き', category: '肉料理' },
  { citizen: '海', wolf: 'プール', category: '水遊び' },
];

export const WordWolfRoomGame: Component = () => {
  const [mode, setMode] = createSignal<'menu' | 'p2p' | 'pass'>('menu');
  const [role, setRole] = createSignal<'host' | 'client'>('host');
  const [roomCode, setRoomCode] = createSignal('');
  const [inputCode, setInputCode] = createSignal('');
  const [connected, setConnected] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [copiedNotice, setCopiedNotice] = createSignal(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal('');
  const [p2pError, setP2pError] = createSignal('');

  // Game Phases: setup -> reveal -> discuss -> vote -> result
  const [phase, setPhase] = createSignal<'setup' | 'reveal' | 'discuss' | 'vote' | 'result'>('setup');
  const [myTopic, setMyTopic] = createSignal('');
  const [isWordShown, setIsWordShown] = createSignal(false);

  // Pass & Play mode state (1 device)
  const [passPlayerCount, setPassPlayerCount] = createSignal(3);
  const [passCurrentPlayer, setPassCurrentPlayer] = createSignal(0);
  const [passTopics, setPassTopics] = createSignal<string[]>([]);
  const [passWolfIndex, setPassWolfIndex] = createSignal(0);

  // Discussion timer
  const [timerSeconds, setTimerSeconds] = createSignal(180);
  let timerInterval: number | null = null;

  // Voting
  const [myVote, setMyVote] = createSignal<string | null>(null);
  const [oppVote, setOppVote] = createSignal<string | null>(null);
  const [winner, setWinner] = createSignal<'citizen' | 'wolf' | null>(null);
  const [revealedData, setRevealedData] = createSignal<{ citizenWord: string; wolfWord: string; wolfPlayer: string } | null>(null);

  let p2p: ZeroTrustP2P | null = null;

  // Generate QR code helper
  const updateQrCode = async (text: string) => {
    if (!text) {
      setQrCodeDataUrl('');
      return;
    }
    try {
      const url = await QRCode.toDataURL(text, { margin: 2, width: 200 });
      setQrCodeDataUrl(url);
    } catch {
      setQrCodeDataUrl('');
    }
  };

  const copyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  // Host starts a new game (P2P)
  const hostStartGame = () => {
    const pair = TOPIC_PAIRS[Math.floor(Math.random() * TOPIC_PAIRS.length)];
    const hostIsWolf = Math.random() < 0.5;

    const hostWord = hostIsWolf ? pair.wolf : pair.citizen;
    const clientWord = hostIsWolf ? pair.citizen : pair.wolf;

    setMyTopic(hostWord);
    setRevealedData({
      citizenWord: pair.citizen,
      wolfWord: pair.wolf,
      wolfPlayer: hostIsWolf ? 'ホスト' : 'ゲスト',
    });

    if (p2p) {
      p2p.send({
        type: 'game_init',
        topic: clientWord,
        revealedData: {
          citizenWord: pair.citizen,
          wolfWord: pair.wolf,
          wolfPlayer: hostIsWolf ? 'ホスト' : 'ゲスト',
        },
      });
    }

    setPhase('reveal');
  };

  const startDiscussion = () => {
    setPhase('discuss');
    setTimerSeconds(180);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          goToVote();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (p2p && role() === 'host') {
      p2p.send({ type: 'start_discuss' });
    }
  };

  const goToVote = () => {
    if (timerInterval) clearInterval(timerInterval);
    setPhase('vote');
    if (p2p) {
      p2p.send({ type: 'go_to_vote' });
    }
  };

  const castVote = (target: string) => {
    setMyVote(target);
    if (p2p) {
      p2p.send({ type: 'cast_vote', vote: target });
    }
    checkVotingComplete(target, oppVote());
  };

  const checkVotingComplete = (v1: string | null, v2: string | null) => {
    if (v1 && v2) {
      evaluateResult(v1, v2);
    }
  };

  const evaluateResult = (myV: string, oppV: string) => {
    const data = revealedData();
    if (!data) return;

    const wolfName = data.wolfPlayer;
    let votesOnWolf = 0;
    if (myV === wolfName) votesOnWolf++;
    if (oppV === wolfName) votesOnWolf++;

    if (votesOnWolf > 0) {
      setWinner('citizen');
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } else {
      setWinner('wolf');
    }
    setPhase('result');
  };

  // P2P Setup
  const setupHost = async () => {
    setP2pError('');
    setIsGenerating(true);
    setRoomCode('');
    try {
      p2p = new ZeroTrustP2P({
        onConnected: () => {
          setConnected(true);
        },
        onMessage: (data: unknown) => handleP2PData(data as any),
        onDisconnected: () => {
          setConnected(false);
        },
        onError: (err: string) => setP2pError(err),
      });

      const offer = await p2p.createHostOffer();
      setRoomCode(offer);
      updateQrCode(offer);
    } catch (err: any) {
      setP2pError(err?.message || 'コードの生成に失敗しました。再試行してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const joinClient = async () => {
    const code = inputCode().trim();
    if (!code) {
      setP2pError('ホストの招待コードを貼り付けてください。');
      return;
    }
    setP2pError('');
    setIsGenerating(true);
    setRoomCode('');
    try {
      p2p = new ZeroTrustP2P({
        onConnected: () => {
          setConnected(true);
        },
        onMessage: (data: unknown) => handleP2PData(data as any),
        onDisconnected: () => {
          setConnected(false);
        },
        onError: (err: string) => setP2pError(err),
      });

      const answer = await p2p.joinGuest(code);
      setRoomCode(answer);
      updateQrCode(answer);
    } catch (err: any) {
      setP2pError(err?.message || '招待コードが無効か、応答の生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const finalizeHost = async () => {
    const code = inputCode().trim();
    if (!code || !p2p) {
      setP2pError('相手の応答コードを貼り付けてください。');
      return;
    }
    try {
      await p2p.completeHostConnection(code);
    } catch (err: any) {
      setP2pError(err?.message || '接続の確立に失敗しました。');
    }
  };

  const handleP2PData = (data: any) => {
    if (data.type === 'game_init') {
      setMyTopic(data.topic);
      setRevealedData(data.revealedData);
      setPhase('reveal');
    } else if (data.type === 'start_discuss') {
      startDiscussion();
    } else if (data.type === 'go_to_vote') {
      if (timerInterval) clearInterval(timerInterval);
      setPhase('vote');
    } else if (data.type === 'cast_vote') {
      setOppVote(data.vote);
      checkVotingComplete(myVote(), data.vote);
    }
  };

  // Pass & Play (1 Device) Logic
  const startPassAndPlay = () => {
    const count = passPlayerCount();
    const pair = TOPIC_PAIRS[Math.floor(Math.random() * TOPIC_PAIRS.length)];
    const wolfIdx = Math.floor(Math.random() * count);

    const topics: string[] = [];
    for (let i = 0; i < count; i++) {
      topics.push(i === wolfIdx ? pair.wolf : pair.citizen);
    }

    setPassWolfIndex(wolfIdx);
    setPassTopics(topics);
    setPassCurrentPlayer(0);
    setIsWordShown(false);
    setRevealedData({
      citizenWord: pair.citizen,
      wolfWord: pair.wolf,
      wolfPlayer: `プレイヤー ${wolfIdx + 1}`,
    });
    setMode('pass');
    setPhase('reveal');
  };

  const nextPassPlayer = () => {
    const nextIdx = passCurrentPlayer() + 1;
    if (nextIdx < passPlayerCount()) {
      setPassCurrentPlayer(nextIdx);
      setIsWordShown(false);
    } else {
      // 全員確認完了 -> 話し合いへ
      startDiscussion();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  onCleanup(() => {
    if (timerInterval) clearInterval(timerInterval);
    if (p2p) p2p.close();
  });

  return (
    <div class="flex flex-col items-center w-full max-w-4xl mx-auto p-4 select-none">
      <div class="text-center mb-6">
        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-400">
          Word Wolf Room
        </h2>
        <p class="text-sm text-slate-400">
          スマホやPCを各自の手元で接続！画面にだけ配られる秘密のお題で推理バトル
        </p>
      </div>

      {/* Mode Select */}
      <Show when={mode() === 'menu'}>
        <div class="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <button
            onClick={() => {
              setMode('p2p');
              setupHost();
            }}
            class="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🌐 リモート通信ルーム（手元の端末で遊ぶ）</span>
          </button>

          <div class="border-t border-slate-800 my-1 pt-4 flex flex-col gap-3">
            <span class="text-xs font-bold text-slate-400">または1台の端末を手渡しで遊ぶ：</span>
            <div class="flex items-center justify-between text-xs text-slate-300 px-1">
              <span>参加人数:</span>
              <div class="flex gap-2">
                {[3, 4, 5, 6].map((num) => (
                  <button
                    onClick={() => setPassPlayerCount(num)}
                    class={`w-8 h-8 rounded-lg font-bold transition-all ${
                      passPlayerCount() === num
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={startPassAndPlay}
              class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-transform active:scale-95 cursor-pointer"
            >
              📱 1台で手渡しプレイ開始（{passPlayerCount()}人）
            </button>
          </div>
        </div>
      </Show>

      {/* P2P Lobby */}
      <Show when={mode() === 'p2p' && !connected()}>
        <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
          <div class="flex border-b border-slate-800 pb-2 gap-2">
            <button
              onClick={() => {
                setRole('host');
                setupHost();
              }}
              class={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                role() === 'host' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ホスト（部屋作成）
            </button>
            <button
              onClick={() => {
                setRole('client');
                setRoomCode('');
                setQrCodeDataUrl('');
                setP2pError('');
              }}
              class={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                role() === 'client' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              参加（コード入力）
            </button>
          </div>

          {/* Host Panel */}
          <Show when={role() === 'host'}>
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-slate-300">
                1. 以下の招待コードを参加者に共有：
              </span>
              <button
                onClick={setupHost}
                disabled={isGenerating()}
                class="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer disabled:opacity-50"
              >
                🔄 再生成
              </button>
            </div>

            <div class="flex gap-2">
              <input
                type="text"
                readonly
                value={isGenerating() ? '⏳ 招待コードを生成中...' : roomCode()}
                placeholder="招待コードがここに表示されます"
                class={`flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono select-all ${
                  isGenerating() ? 'text-amber-400 animate-pulse' : 'text-rose-300'
                }`}
              />
              <button
                onClick={() => copyCode(roomCode())}
                disabled={isGenerating() || !roomCode()}
                class="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold rounded-lg text-white cursor-pointer active:scale-95"
              >
                {copiedNotice() ? 'コピー済！' : 'コピー'}
              </button>
            </div>

            <Show when={qrCodeDataUrl()}>
              <div class="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner my-1">
                <img src={qrCodeDataUrl()} alt="Invite QR Code" class="w-36 h-36 block" />
                <span class="text-[10px] text-slate-600 font-bold mt-1">カメラで読み取って接続</span>
              </div>
            </Show>

            <div class="border-t border-slate-800 pt-3">
              <span class="text-xs font-bold text-slate-300 block mb-1">
                2. 相手から返ってきた応答コードを貼り付け：
              </span>
              <div class="flex gap-2">
                <input
                  type="text"
                  placeholder="相手の応答コードを貼り付け"
                  value={inputCode()}
                  onInput={(e) => setInputCode(e.currentTarget.value)}
                  class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-white focus:border-rose-500 focus:outline-none"
                />
                <button
                  onClick={finalizeHost}
                  disabled={!inputCode().trim()}
                  class="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold rounded-lg text-white cursor-pointer active:scale-95"
                >
                  接続
                </button>
              </div>
            </div>
          </Show>

          {/* Client Panel */}
          <Show when={role() === 'client'}>
            <span class="text-xs font-bold text-slate-300">
              1. ホストの招待コードを貼り付けてください：
            </span>
            <div class="flex gap-2">
              <input
                type="text"
                placeholder="ホストの招待コードを貼り付け"
                value={inputCode()}
                onInput={(e) => setInputCode(e.currentTarget.value)}
                class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-white focus:border-rose-500 focus:outline-none"
              />
              <button
                onClick={joinClient}
                disabled={isGenerating() || !inputCode().trim()}
                class="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold rounded-lg text-white cursor-pointer active:scale-95"
              >
                {isGenerating() ? '生成中...' : '応答生成'}
              </button>
            </div>

            <Show when={isGenerating()}>
              <p class="text-xs text-amber-400 animate-pulse text-center">
                ⏳ 応答コードを生成しています...
              </p>
            </Show>

            <Show when={roomCode()}>
              <div class="border-t border-slate-800 pt-3 flex flex-col gap-2">
                <span class="text-xs font-bold text-slate-300">
                  2. 生成された応答コードをホストに送信：
                </span>
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    value={roomCode()}
                    class="flex-1 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-xs font-mono text-rose-300 select-all"
                  />
                  <button
                    onClick={() => copyCode(roomCode())}
                    class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white cursor-pointer active:scale-95"
                  >
                    {copiedNotice() ? 'コピー済！' : 'コピー'}
                  </button>
                </div>
                <p class="text-[11px] text-amber-300 animate-pulse text-center">
                  ホストが接続を完了するのをお待ちください...
                </p>
              </div>
            </Show>
          </Show>

          <Show when={p2pError()}>
            <div class="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300">
              ⚠️ {p2pError()}
            </div>
          </Show>

          <button
            onClick={() => setMode('menu')}
            class="text-xs text-slate-400 hover:text-slate-200 mt-2 text-center cursor-pointer"
          >
            ← メニューに戻る
          </button>
        </div>
      </Show>

      {/* Connected Screen (P2P or Pass & Play) */}
      <Show when={(mode() === 'p2p' && connected()) || mode() === 'pass'}>
        <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-6">
          {/* Phase 1: Setup / Ready (P2P only) */}
          <Show when={phase() === 'setup' && mode() === 'p2p'}>
            <div class="text-center w-full">
              <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                ✓
              </div>
              <h3 class="text-lg font-bold text-white mb-1">通信接続完了！</h3>
              <p class="text-xs text-slate-400 mb-6">
                あなたは「{role() === 'host' ? 'ホスト' : 'ゲスト'}」です。
              </p>
              <Show when={role() === 'host'}>
                <button
                  onClick={hostStartGame}
                  class="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg active:scale-95 cursor-pointer"
                >
                  ゲームを開始する
                </button>
              </Show>
              <Show when={role() === 'client'}>
                <p class="text-sm text-amber-300 animate-pulse">
                  ホストがゲームを開始するのを待っています...
                </p>
              </Show>
            </div>
          </Show>

          {/* Phase 2: Reveal Topic */}
          <Show when={phase() === 'reveal'}>
            <div class="w-full flex flex-col items-center text-center">
              <span class="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">
                Secret Topic
              </span>
              <Show when={mode() === 'pass'}>
                <div class="text-base font-bold text-amber-400 mb-1">
                  【プレイヤー {passCurrentPlayer() + 1} の番】
                </div>
              </Show>
              <p class="text-xs text-slate-400 mb-6">
                {mode() === 'pass'
                  ? '他の人に見られないように確認してください'
                  : '周りの人に見られないように確認してください'}
              </p>

              {/* Reveal card button */}
              <div
                onClick={() => setIsWordShown(!isWordShown())}
                class="w-full py-10 bg-slate-950 border-2 border-dashed border-rose-500/50 rounded-2xl cursor-pointer hover:border-rose-400 transition-colors flex flex-col items-center justify-center gap-2 mb-6 shadow-inner"
              >
                <Show when={!isWordShown()}>
                  <span class="text-3xl">🔒</span>
                  <span class="text-sm text-slate-400">タップしてお題を確認</span>
                </Show>
                <Show when={isWordShown()}>
                  <span class="text-xs text-slate-500">あなたのお題</span>
                  <span class="text-2xl font-black text-rose-400 tracking-wider">
                    {mode() === 'pass' ? passTopics()[passCurrentPlayer()] : myTopic()}
                  </span>
                </Show>
              </div>

              {/* Pass mode next button */}
              <Show when={mode() === 'pass'}>
                <button
                  disabled={!isWordShown()}
                  onClick={nextPassPlayer}
                  class="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg active:scale-95 cursor-pointer"
                >
                  {passCurrentPlayer() + 1 < passPlayerCount()
                    ? `確認完了！次のプレイヤーへ手渡す (${passCurrentPlayer() + 2}人目)`
                    : '全員確認完了！話し合い開始'}
                </button>
              </Show>

              {/* P2P mode button */}
              <Show when={mode() === 'p2p'}>
                <Show when={role() === 'host'}>
                  <button
                    onClick={startDiscussion}
                    class="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg active:scale-95 cursor-pointer"
                  >
                    全員確認完了・話し合い開始
                  </button>
                </Show>
                <Show when={role() === 'client'}>
                  <p class="text-xs text-slate-400 animate-pulse">
                    ホストが話し合いを開始するのを待っています...
                  </p>
                </Show>
              </Show>
            </div>
          </Show>

          {/* Phase 3: Discussion */}
          <Show when={phase() === 'discuss'}>
            <div class="w-full flex flex-col items-center text-center">
              <span class="text-xs text-slate-400 mb-1">話し合いタイム</span>
              <div class="text-5xl font-mono font-black text-rose-400 mb-4 tracking-wider">
                {formatTimer(timerSeconds())}
              </div>

              <Show when={mode() === 'p2p'}>
                <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl w-full mb-6 text-xs text-slate-300">
                  <span>あなたのお題: </span>
                  <span class="font-bold text-white">{myTopic()}</span>
                </div>
              </Show>

              <p class="text-xs text-slate-400 mb-6 leading-relaxed">
                自分のお題を直接言わずに、特徴やエピソードについて質問し合いましょう。少数派（ウルフ）を探し出してください！
              </p>

              <button
                onClick={goToVote}
                class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm cursor-pointer active:scale-95"
              >
                話し合い終了・投票へ進む
              </button>
            </div>
          </Show>

          {/* Phase 4: Voting */}
          <Show when={phase() === 'vote'}>
            <div class="w-full flex flex-col items-center text-center">
              <h3 class="text-lg font-bold text-white mb-2">怪しい人に投票</h3>
              <p class="text-xs text-slate-400 mb-6">
                少数派（ウルフ）だと思うプレイヤーを選択してください
              </p>

              <Show when={mode() === 'p2p'}>
                <div class="flex flex-col gap-3 w-full mb-6">
                  <button
                    disabled={myVote() !== null}
                    onClick={() => castVote('ホスト')}
                    class={`w-full py-4 rounded-xl font-bold border transition-all cursor-pointer ${
                      myVote() === 'ホスト'
                        ? 'bg-rose-600 border-rose-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    👤 ホスト
                  </button>
                  <button
                    disabled={myVote() !== null}
                    onClick={() => castVote('ゲスト')}
                    class={`w-full py-4 rounded-xl font-bold border transition-all cursor-pointer ${
                      myVote() === 'ゲスト'
                        ? 'bg-rose-600 border-rose-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    👤 ゲスト
                  </button>
                </div>
                <Show when={myVote() !== null && oppVote() === null}>
                  <p class="text-xs text-amber-300 animate-pulse">
                    相手の投票を待っています...
                  </p>
                </Show>
              </Show>

              <Show when={mode() === 'pass'}>
                <div class="flex flex-col gap-2 w-full mb-6">
                  {Array.from({ length: passPlayerCount() }, (_, i) => (
                    <button
                      onClick={() => {
                        const targetWolf = passWolfIndex();
                        const isWin = i === targetWolf;
                        setWinner(isWin ? 'citizen' : 'wolf');
                        if (isWin) {
                          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
                        }
                        setPhase('result');
                      }}
                      class="w-full py-3 rounded-xl font-bold border border-slate-700 bg-slate-950 text-slate-200 hover:border-rose-500 hover:bg-slate-900 transition-all cursor-pointer"
                    >
                      👤 プレイヤー {i + 1}
                    </button>
                  ))}
                </div>
              </Show>
            </div>
          </Show>

          {/* Phase 5: Result */}
          <Show when={phase() === 'result'}>
            <div class="w-full flex flex-col items-center text-center">
              <span
                class={`text-3xl font-black mb-2 ${
                  winner() === 'citizen' ? 'text-cyan-400' : 'text-rose-400'
                }`}
              >
                {winner() === 'citizen' ? '市民チームの勝利！' : 'ウルフの勝利！'}
              </span>

              <div class="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 my-4 flex flex-col gap-2 text-sm text-left">
                <div class="flex justify-between border-b border-slate-800 pb-2">
                  <span class="text-slate-400">市民のお題:</span>
                  <span class="font-bold text-cyan-400">
                    {revealedData()?.citizenWord}
                  </span>
                </div>
                <div class="flex justify-between border-b border-slate-800 pb-2">
                  <span class="text-slate-400">ウルフのお題:</span>
                  <span class="font-bold text-rose-400">
                    {revealedData()?.wolfWord}
                  </span>
                </div>
                <div class="flex justify-between pt-1">
                  <span class="text-slate-400">ウルフだった人:</span>
                  <span class="font-bold text-amber-300">
                    {revealedData()?.wolfPlayer}
                  </span>
                </div>
              </div>

              <Show when={mode() === 'p2p'}>
                <Show when={role() === 'host'}>
                  <button
                    onClick={() => {
                      setMyVote(null);
                      setOppVote(null);
                      hostStartGame();
                    }}
                    class="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg active:scale-95 cursor-pointer"
                  >
                    もう一度遊ぶ
                  </button>
                </Show>
                <Show when={role() === 'client'}>
                  <p class="text-xs text-slate-400 animate-pulse">
                    ホストが次のゲームを開始するのを待っています...
                  </p>
                </Show>
              </Show>

              <Show when={mode() === 'pass'}>
                <button
                  onClick={startPassAndPlay}
                  class="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg active:scale-95 cursor-pointer"
                >
                  同じ設定でもう一度遊ぶ
                </button>
              </Show>
            </div>
          </Show>

          <button
            onClick={() => {
              if (timerInterval) clearInterval(timerInterval);
              setPhase('setup');
              setMode('menu');
            }}
            class="text-xs text-slate-500 hover:text-slate-300 mt-2 cursor-pointer"
          >
            ← メニューに戻る
          </button>
        </div>
      </Show>
    </div>
  );
};
