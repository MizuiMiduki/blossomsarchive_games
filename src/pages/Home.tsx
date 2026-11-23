import { Component, createSignal, For, Show, createMemo, onSettled } from 'solid-js';
import confetti from 'canvas-confetti';
import { GAMES, GameCategory } from '../games/registry.ts';
import {
  PlayIcon,
  HeartIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  VolumeIcon,
  VolumeXIcon,
  AwardIcon,
  SparklesIcon,
} from '../components/Icons.tsx';
import { sound } from '../utils/sound.ts';
import {
  loadAppData,
  saveAppData,
  toggleFavorite,
  getGameStats,
  exportBackupJson,
  importBackupJson,
  AppData,
} from '../utils/storage.ts';
import {
  createSyncUrl,
  createQrCodeDataUrl,
  deserializeFromSync,
  mergeIncomingData,
} from '../utils/sync.ts';

export const Home: Component = () => {
  const [appData, setAppData] = createSignal<AppData>(loadAppData());
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<GameCategory | 'favorite'>('all');
  
  // モーダル管理
  const [showDataModal, setShowDataModal] = createSignal(false);
  const [modalTab, setModalTab] = createSignal<'qr' | 'json'>('qr');
  const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal<string>('');
  const [syncUrlText, setSyncUrlText] = createSignal('');
  const [copyStatus, setCopyStatus] = createSignal(false);
  const [backupJsonText, setBackupJsonText] = createSignal('');
  const [importStatus, setImportStatus] = createSignal<string | null>(null);

  // URL経由の自動同期受信モーダル
  const [pendingSyncData, setPendingSyncData] = createSignal<Partial<AppData> | null>(null);

  // 起動時のURLハッシュ同期チェック
  onSettled(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#sync=')) {
      const encoded = hash.slice(6);
      const data = deserializeFromSync(encoded);
      if (data) {
        sound.playVictory();
        setPendingSyncData(data);
        // URLのハッシュを消去して履歴をクリーンに保つ
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  });

  // 同期データの受諾
  const acceptSync = () => {
    const incoming = pendingSyncData();
    if (!incoming) return;

    sound.playVictory();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    const { merged, updatedScoresCount } = mergeIncomingData(incoming);
    setAppData(merged);
    setPendingSyncData(null);
  };

  // ダークモード適用
  const toggleTheme = () => {
    sound.playPop(480);
    const current = appData();
    const nextDark = !current.settings.darkMode;
    const next = {
      ...current,
      settings: { ...current.settings, darkMode: nextDark },
    };
    saveAppData(next);
    setAppData(next);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // サウンドミュート切り替え
  const toggleSound = () => {
    const current = appData();
    const nextMuted = !current.settings.soundMuted;
    const next = {
      ...current,
      settings: { ...current.settings, soundMuted: nextMuted },
    };
    saveAppData(next);
    setAppData(next);
    sound.setMuted(nextMuted);
    sound.playPop(440);
  };

  // お気に入り切り替え
  const onToggleFav = (gameId: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sound.playPop(520);
    toggleFavorite(gameId);
    setAppData(loadAppData());
  };

  // フィルタリング処理
  const filteredGames = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    const cat = selectedCategory();
    const favs = appData().favorites;

    return GAMES.filter((g) => {
      const matchesSearch =
        !query ||
        g.title.toLowerCase().includes(query) ||
        g.titleJp.includes(query) ||
        g.description.includes(query);

      if (!matchesSearch) return false;

      if (cat === 'all') return true;
      if (cat === 'favorite') return favs.includes(g.id);
      return g.category === cat;
    });
  });

  // データ同期モーダルを開く
  const handleOpenDataModal = async () => {
    sound.playPop(440);
    const data = loadAppData();
    const url = createSyncUrl(data);
    setSyncUrlText(url);
    setBackupJsonText(exportBackupJson());
    setImportStatus(null);
    setCopyStatus(false);
    setShowDataModal(true);

    // QRコード生成
    const qr = await createQrCodeDataUrl(url);
    setQrCodeDataUrl(qr);
  };

  // 同期URLをクリップボードにコピー
  const handleCopySyncUrl = async () => {
    sound.playPop(520);
    try {
      await navigator.clipboard.writeText(syncUrlText());
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch {
      // fallback
    }
  };

  // バックアップJSONインポート
  const handleImportJson = () => {
    sound.playPop(480);
    const success = importBackupJson(backupJsonText());
    if (success) {
      setImportStatus('復元が完了しました！');
      setAppData(loadAppData());
      setTimeout(() => setShowDataModal(false), 1200);
    } else {
      setImportStatus('無効なJSONフォーマットです。');
    }
  };

  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* 共通トップバー */}
      <header class="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-rose-100 dark:border-slate-800 transition-colors">
        <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/30 text-white font-black text-lg">
              🌸
            </div>
            <div>
              <span class="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 dark:from-rose-400 dark:via-pink-400 dark:to-amber-300 bg-clip-text text-transparent">
                BlossomsArchive
              </span>
              <span class="text-xs font-semibold uppercase tracking-wider ml-1.5 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300">
                Games
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handleOpenDataModal}
              title="端末同期 ＆ セーブデータ管理"
              class="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-slate-800 bg-rose-50/60 dark:bg-slate-900 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <span>📲 端末間同期</span>
            </button>

            <button
              onClick={toggleSound}
              title={appData().settings.soundMuted ? 'ミュート解除' : 'ミュート'}
              class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Show when={appData().settings.soundMuted} fallback={<VolumeIcon size={20} />}>
                <VolumeXIcon size={20} class="text-rose-400" />
              </Show>
            </button>

            <button
              onClick={toggleTheme}
              title={appData().settings.darkMode ? 'ライトモード' : 'ダークモード'}
              class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Show when={appData().settings.darkMode} fallback={<MoonIcon size={20} />}>
                <SunIcon size={20} class="text-amber-400" />
              </Show>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main class="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {/* ヒーローセクション */}
        <section class="text-center py-6 sm:py-10 relative overflow-hidden">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/80 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-bold mb-4 shadow-2xs">
            <SparklesIcon size={14} />
            <span>完全クライアント完結・DB不要・Solid.js 2.0 駆動</span>
          </div>

          <h2 class="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            スキマ時間に、一輪の花を咲かせる遊びを。
          </h2>

          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8">
            インストールの手間も会員登録も不要。QRコードでスマホともデータ同期できる、全10種の超軽量ミニゲームアーカイブ。
          </p>

          {/* 検索バー */}
          <div class="max-w-md mx-auto relative mb-6">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              placeholder="ゲーム名やジャンルで検索..."
              class="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm text-sm"
            />
          </div>

          {/* カテゴリタブ */}
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'すべて (10)' },
              { id: 'board', label: 'ボード♟️' },
              { id: 'puzzle', label: 'パズル🧩' },
              { id: 'card', label: 'カード🃏' },
              { id: 'casual', label: 'カジュアル🌱' },
              { id: 'action', label: 'アクション🏃' },
              { id: 'favorite', label: 'お気に入り❤️' },
            ].map((tab) => (
              <button
                onClick={() => {
                  sound.playPop(460);
                  setSelectedCategory(tab.id as typeof selectedCategory extends () => infer R ? R : never);
                }}
                class={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory() === tab.id
                    ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/25'
                    : 'bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-rose-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* ゲームカードグリッド */}
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
          <For
            each={filteredGames()}
            fallback={
              <div class="col-span-full py-12 text-center text-slate-400 text-sm">
                該当するゲームが見つかりませんでした。
              </div>
            }
          >
            {(game) => {
              const stats = getGameStats(game.id);
              const isFav = () => appData().favorites.includes(game.id);

              return (
                <div class="group bg-white dark:bg-slate-900 rounded-3xl p-5 border border-rose-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 shadow-sm hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    {/* アイコン & バッジ & お気に入り */}
                    <div class="flex items-start justify-between mb-4">
                      <div
                        class={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${game.color} flex items-center justify-center text-3xl shadow-md text-white`}
                      >
                        {game.icon}
                      </div>

                      <div class="flex items-center gap-1.5">
                        <Show when={game.badge}>
                          <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300">
                            {game.badge}
                          </span>
                        </Show>
                        <button
                          onClick={(e) => onToggleFav(game.id, e)}
                          title="お気に入りに追加"
                          class="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"
                        >
                          <HeartIcon
                            size={18}
                            filled={isFav()}
                            class={isFav() ? 'text-rose-500' : ''}
                          />
                        </button>
                      </div>
                    </div>

                    {/* タイトル & 説明 */}
                    <h3 class="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {game.title}
                    </h3>
                    <div class="text-xs text-rose-500/90 font-medium mb-2">{game.titleJp}</div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                      {game.description}
                    </p>
                  </div>

                  <div>
                    {/* スコア・戦績 */}
                    <div class="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 py-2 border-t border-rose-50 dark:border-slate-800/80 mb-3">
                      <span class="flex items-center gap-1">
                        <AwardIcon size={14} class="text-amber-500" />
                        最高: <strong class="text-slate-700 dark:text-slate-300">{stats.highScore}</strong>
                      </span>
                      <span>プレイ: {stats.playCount}回</span>
                    </div>

                    {/* プレイボタン */}
                    <a
                      href={`/game/${game.id}`}
                      onClick={() => sound.playPop(520)}
                      class="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 active:scale-98 transition-all"
                    >
                      <PlayIcon size={14} />
                      <span>今すぐ遊ぶ</span>
                    </a>
                  </div>
                </div>
              );
            }}
          </For>
        </section>
      </main>

      {/* 端末同期 & データ管理モーダル */}
      <Show when={showDataModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <span>📲 複数端末同期 & セーブデータ</span>
            </h3>

            {/* モーダル内タブ */}
            <div class="flex border-b border-rose-100 dark:border-slate-800 mb-4">
              <button
                onClick={() => setModalTab('qr')}
                class={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                  modalTab() === 'qr'
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                QRコードで同期 (おすすめ)
              </button>
              <button
                onClick={() => setModalTab('json')}
                class={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                  modalTab() === 'json'
                    ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                JSONファイル保存 / 復元
              </button>
            </div>

            {/* タブ1: QRコード同期 */}
            <Show when={modalTab() === 'qr'}>
              <div class="text-center flex flex-col items-center">
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  スマートフォンのカメラで以下のQRコードを読み取るだけで、現在のハイスコアやお気に入りが即座に引き継がれます！
                </p>

                <Show when={qrCodeDataUrl()} fallback={<div class="w-48 h-48 bg-slate-100 animate-pulse rounded-2xl mb-4" />}>
                  <div class="p-3 bg-white rounded-2xl shadow-md border-2 border-rose-100 mb-4">
                    <img src={qrCodeDataUrl()} alt="セーブデータ同期用QRコード" class="w-48 h-48 block mx-auto" />
                  </div>
                </Show>

                <button
                  onClick={handleCopySyncUrl}
                  class="w-full py-2.5 rounded-xl border border-rose-200 dark:border-slate-700 hover:bg-rose-50/50 text-rose-600 dark:text-rose-400 font-semibold text-xs mb-3 transition-all"
                >
                  {copyStatus() ? '✓ 同期用URLをコピーしました！' : '🔗 同期用URLをコピー (LINE等で送る)'}
                </button>
              </div>
            </Show>

            {/* タブ2: JSONバックアップ */}
            <Show when={modalTab() === 'json'}>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  セーブデータの手動バックアップやテキストでの引き継ぎ用です。
                </p>
                <textarea
                  rows={6}
                  value={backupJsonText()}
                  onInput={(e) => setBackupJsonText(e.currentTarget.value)}
                  class="w-full font-mono text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-400 mb-2"
                />
                <Show when={importStatus()}>
                  <div class="text-xs font-bold text-rose-500 mb-2">{importStatus()}</div>
                </Show>
                <button
                  onClick={handleImportJson}
                  class="w-full py-2 rounded-xl bg-slate-800 text-white dark:bg-slate-700 font-semibold text-xs mb-3"
                >
                  JSONテキストから復元
                </button>
              </div>
            </Show>

            <button
              onClick={() => {
                sound.playPop(420);
                setShowDataModal(false);
              }}
              class="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </Show>

      {/* URLからの自動同期受信モーダル */}
      <Show when={pendingSyncData()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-rose-300 text-center animate-in zoom-in-95">
            <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-3xl">
              📲
            </div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-1">
              別端末のデータが見つかりました！
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              QRコードまたは共有リンクからセーブデータを受信しました。<br />
              現在の記録とマージして同期しますか？<br />
              （※ハイスコアは高い方がキープされます）
            </p>

            <div class="flex flex-col gap-2">
              <button
                onClick={acceptSync}
                class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-md shadow-rose-500/25 active:scale-95 transition-all"
              >
                データを統合して同期する
              </button>
              <button
                onClick={() => setPendingSyncData(null)}
                class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-semibold"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* フッター */}
      <footer class="border-t border-rose-100 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <div class="flex items-center justify-center gap-1 mb-1">
          <span>🌸</span>
          <span class="font-bold text-slate-600 dark:text-slate-300">BlossomsArchive Games</span>
        </div>
        <div>No Server-Side Processing / Zero Backend / Powered by Solid.js 2.0</div>
      </footer>
    </div>
  );
};
