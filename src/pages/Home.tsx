import { Component, createSignal, For, Show, createMemo, onSettled } from 'solid-js';
import { Link } from '../components/Link.tsx';
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
  GamepadIcon,
  SyncIcon,
  CheckIcon,
} from '../components/Icons.tsx';
import { LanguageSelector } from '../components/LanguageSelector.tsx';
import { t, getLang } from '../utils/i18n.ts';
import { getLocalizedGame } from '../utils/gameTranslations.ts';
import { sound } from '../utils/sound.ts';
import {
  loadAppData,
  saveAppData,
  toggleFavorite,
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
import AdSense from '../components/AdSense.tsx';

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

  // 起動時のURL同期チェック ＆ 最新セーブデータ同期
  onSettled(() => {
    setAppData(loadAppData());

    // 旧式ハッシュURL (#/game/...) からの自動リダイレクト対応
    if (window.location.hash.startsWith('#/')) {
      const cleanRoute = window.location.hash.slice(1);
      window.history.replaceState(null, '', cleanRoute);
    }

    let encoded: string | null = null;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('sync')) {
      encoded = searchParams.get('sync');
    } else {
      const hash = window.location.hash;
      const syncIndex = hash.indexOf('sync=');
      if (syncIndex !== -1) {
        encoded = hash.slice(syncIndex + 5).split('&')[0];
      }
    }

    if (encoded) {
      const data = deserializeFromSync(encoded);
      if (data) {
        sound.playVictory();
        setPendingSyncData(data);
        // URLの同期パラメータを消去して履歴をクリーンに保つ
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

    const { merged } = mergeIncomingData(incoming);
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
    getLang(); // 言語シグナルを購読
    const query = searchQuery().toLowerCase().trim();
    const cat = selectedCategory();
    const favs = appData().favorites;

    return GAMES.filter((g) => {
      const loc = getLocalizedGame(g.id, g);
      const matchesSearch =
        !query ||
        g.title.toLowerCase().includes(query) ||
        g.titleJp.includes(query) ||
        g.description.includes(query) ||
        loc.title.toLowerCase().includes(query) ||
        loc.titleSub.toLowerCase().includes(query) ||
        loc.description.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (cat === 'all') return true;
      if (cat === 'favorite') return favs.includes(g.id);
      return g.category === cat;
    });
  });

  // カテゴリタブの多言語リアクティブ対応
  const categoryTabs = createMemo(() => [
    { id: 'all' as const, label: `${t('catAll')} (${GAMES.length})` },
    { id: 'ar' as const, label: t('catAr') },
    { id: 'ai' as const, label: t('catAi') },
    { id: 'board' as const, label: t('catBoard') },
    { id: 'puzzle' as const, label: t('catPuzzle') },
    { id: 'card' as const, label: t('catCard') },
    { id: 'casual' as const, label: t('catCasual') },
    { id: 'action' as const, label: t('catAction') },
    { id: 'favorite' as const, label: t('catFavorite') },
  ]);

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
      setImportStatus(t('importSuccess'));
      setAppData(loadAppData());
      setTimeout(() => setShowDataModal(false), 1200);
    } else {
      setImportStatus(t('importInvalid'));
    }
  };

  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* 共通トップバー */}
      <header class="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-base shadow-2xs">
              <GamepadIcon size={20} />
            </div>
            <div class="flex items-center">
              <span class="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                BlossomsArchive
              </span>
              <span class="text-xs font-semibold uppercase tracking-wider ml-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Games
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            <LanguageSelector />

            <button
              onClick={handleOpenDataModal}
              title={t('dataSync')}
              aria-label={t('dataSync')}
              class="px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <SyncIcon size={14} />
              <span class="hidden sm:inline">{t('dataSync')}</span>
            </button>

            <button
              onClick={toggleSound}
              title={appData().settings.soundMuted ? t('soundUnmute') : t('soundMute')}
              aria-label={appData().settings.soundMuted ? t('soundUnmute') : t('soundMute')}
              class="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Show when={appData().settings.soundMuted} fallback={<VolumeIcon size={20} />}>
                <VolumeXIcon size={20} class="text-slate-400" />
              </Show>
            </button>

            <button
              onClick={toggleTheme}
              title={appData().settings.darkMode ? t('themeLight') : t('themeDark')}
              aria-label={appData().settings.darkMode ? t('themeLight') : t('themeDark')}
              class="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Show when={appData().settings.darkMode} fallback={<MoonIcon size={20} />}>
                <SunIcon size={20} class="text-amber-500" />
              </Show>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main class="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {/* ヒーローセクション */}
        <section class="text-center py-6 sm:py-10 relative overflow-hidden">
          <h2 class="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            {t('heroTitle')}
          </h2>

          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8">
            {t('heroDesc')}
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
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              class="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600 shadow-2xs text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* カテゴリタブ */}
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <For each={categoryTabs()}>
              {(tab) => (
                <button
                  onClick={() => {
                    sound.playPop(460);
                    setSelectedCategory(tab.id);
                  }}
                  class={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory() === tab.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>
        </section>

        {/* ヒーロー直下 AdSense 広告エリア */}
        <AdSense class="my-6" />

        {/* ゲームカードグリッド */}
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
          <For
            each={filteredGames()}
            fallback={
              <div class="col-span-full py-12 text-center text-slate-400 text-sm">
                {t('noGamesFound')}
              </div>
            }
          >
            {(game) => {
              const stats = () =>
                appData().stats[game.id] || {
                  highScore: 0,
                  playCount: 0,
                  clearCount: 0,
                  lastPlayedAt: 0,
                };
              const isFav = () => appData().favorites.includes(game.id);
              const GameIcon = game.icon;

              return (
                <div class="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                  <div>
                    {/* アイコン & バッジ & お気に入り */}
                    <div class="flex items-start justify-between mb-4">
                      <div
                        class={`w-13 h-13 rounded-2xl ${game.color} flex items-center justify-center shadow-2xs`}
                      >
                        <GameIcon size={26} />
                      </div>

                      <div class="flex items-center gap-1.5">
                        <Show when={game.badge}>
                          <span class="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                            {game.badge}
                          </span>
                        </Show>
                        <button
                          onClick={(e) => onToggleFav(game.id, e)}
                          title={t('addToFav')}
                          aria-label={t('addToFav')}
                          class="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <HeartIcon
                            size={18}
                            filled={isFav()}
                            class={isFav() ? 'text-red-500' : ''}
                          />
                        </button>
                      </div>
                    </div>

                    {/* タイトル & 説明 */}
                    <h3 class="text-base font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                      {getLocalizedGame(game.id, game).title}
                    </h3>
                    <div class="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                      {getLocalizedGame(game.id, game).titleSub}
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4">
                      {getLocalizedGame(game.id, game).description}
                    </p>
                  </div>

                  <div>
                    {/* スコア・戦績 */}
                    <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 py-2 border-t border-slate-100 dark:border-slate-800/80 mb-3">
                      <span class="flex items-center gap-1">
                        <AwardIcon size={14} class="text-amber-500" />
                        {t('highScore')}: <strong class="text-slate-700 dark:text-slate-300">{stats().highScore}</strong>
                      </span>
                      <span>{t('playCount')}: {stats().playCount}{t('playTimes')}</span>
                    </div>

                    {/* プレイボタン */}
                    <Link
                      href={`/game/${game.id}`}
                      onClick={() => sound.playPop(520)}
                      class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all"
                    >
                      <PlayIcon size={14} />
                      <span>{t('playNow')}</span>
                    </Link>
                  </div>
                </div>
              );
            }}
          </For>
        </section>

        {/* AdSense 広告エリア */}
        <AdSense class="mt-8" />
      </main>

      {/* 端末同期 & データ管理モーダル */}
      <Show when={showDataModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <SyncIcon size={20} class="text-slate-700 dark:text-slate-300" />
              <span>{t('syncTitle')}</span>
            </h3>

            {/* モーダル内タブ */}
            <div class="flex border-b border-slate-200 dark:border-slate-800 mb-4">
              <button
                onClick={() => setModalTab('qr')}
                class={`flex-1 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab() === 'qr'
                    ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t('syncQrTabRecommend')}
              </button>
              <button
                onClick={() => setModalTab('json')}
                class={`flex-1 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab() === 'json'
                    ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t('syncJsonTab')}
              </button>
            </div>

            {/* タブ1: QRコード同期 */}
            <Show when={modalTab() === 'qr'}>
              <div class="text-center flex flex-col items-center">
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {t('qrInstruction')}
                </p>

                <Show when={qrCodeDataUrl()} fallback={<div class="w-48 h-48 bg-slate-100 animate-pulse rounded-2xl mb-4" />}>
                  <div class="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-4">
                    <img src={qrCodeDataUrl()} alt="QR Code" class="w-48 h-48 block mx-auto" />
                  </div>
                </Show>

                <button
                  onClick={handleCopySyncUrl}
                  class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs mb-3 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Show when={copyStatus()} fallback={<span>{t('copySyncUrl')}</span>}>
                    <CheckIcon size={14} class="text-emerald-600" />
                    <span>{t('copySyncUrlDone')}</span>
                  </Show>
                </button>
              </div>
            </Show>

            {/* タブ2: JSONバックアップ */}
            <Show when={modalTab() === 'json'}>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {t('exportDesc')}
                </p>
                <textarea
                  rows={6}
                  value={backupJsonText()}
                  onInput={(e) => setBackupJsonText(e.currentTarget.value)}
                  placeholder={t('importPlaceholder')}
                  class="w-full font-mono text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 mb-2"
                />
                <Show when={importStatus()}>
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">{importStatus()}</div>
                </Show>
                <button
                  onClick={handleImportJson}
                  class="w-full py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-semibold text-xs mb-3 cursor-pointer"
                >
                  {t('importJson')}
                </button>
              </div>
            </Show>

            <button
              onClick={() => {
                sound.playPop(420);
                setShowDataModal(false);
              }}
              class="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </Show>

      {/* URLからの自動同期受信モーダル */}
      <Show when={pendingSyncData()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in">
          <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
            <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <SyncIcon size={24} />
            </div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white mb-1">
              {t('syncFoundTitle')}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed whitespace-pre-line">
              {t('syncFoundDesc')}
            </p>

            <div class="flex flex-col gap-2">
              <button
                onClick={acceptSync}
                class="w-full py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                {t('syncAccept')}
              </button>
              <button
                onClick={() => setPendingSyncData(null)}
                class="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-semibold cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* フッター */}
      <footer class="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <div class="flex items-center justify-center gap-1.5 mb-1">
          <GamepadIcon size={15} class="text-slate-400" />
          <span class="font-bold text-slate-600 dark:text-slate-300">BlossomsArchive Games</span>
        </div>
        <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          ©2017 - {new Date().getFullYear()} BlossomsArchive
        </div>
      </footer>
    </div>
  );
};
