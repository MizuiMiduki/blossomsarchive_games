import { createSignal } from 'solid-js';

export type SupportedLang = 'ja' | 'en' | 'ru' | 'ko' | 'zh-CN' | 'zh-TW';

export interface LangOption {
  code: SupportedLang;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LANG_OPTIONS: LangOption[] = [
  { code: 'ja', label: '日本語', nativeLabel: '日本語', flag: '🇯🇵' },
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  { code: 'zh-CN', label: 'Simplified Chinese', nativeLabel: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: 'Traditional Chinese', nativeLabel: '繁體中文', flag: '🇹🇼' },
];

const STORAGE_LANG_KEY = 'blossomsarchive_games_lang';

function detectUserLang(): SupportedLang {
  if (typeof window === 'undefined') return 'ja';
  try {
    const saved = localStorage.getItem(STORAGE_LANG_KEY) as SupportedLang | null;
    if (saved && LANG_OPTIONS.some((o) => o.code === saved)) {
      return saved;
    }
  } catch {}

  const browserLang = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
  const lower = browserLang.toLowerCase();

  if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.includes('hant')) {
    return 'zh-TW';
  }
  if (lower.startsWith('zh')) {
    return 'zh-CN';
  }
  if (lower.startsWith('ko')) {
    return 'ko';
  }
  if (lower.startsWith('ru')) {
    return 'ru';
  }
  if (lower.startsWith('en')) {
    return 'en';
  }
  return 'ja';
}

const [currentLang, setCurrentLangState] = createSignal<SupportedLang>(detectUserLang());

export function getLang(): SupportedLang {
  return currentLang();
}

export function setLang(lang: SupportedLang) {
  setCurrentLangState(lang);
  try {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'zh-CN' ? 'zh-Hans' : lang === 'zh-TW' ? 'zh-Hant' : lang;
    }
  } catch {}
}

export const UI_STRINGS: Record<SupportedLang, Record<string, string>> = {
  ja: {
    // Header
    siteTitle: 'BlossomsArchive',
    siteSubtitle: 'Games',
    dataSync: '端末同期',
    soundMute: 'ミュート',
    soundUnmute: 'ミュート解除',
    themeLight: 'ライトモード',
    themeDark: 'ダークモード',
    selectLang: '言語を選択',

    // Hero
    heroTitle: 'スキマ時間にすぐ遊べる、Webミニゲームポータル。',
    heroDesc: 'インストールの手間も会員登録も不要。QRコードでスマホともデータ同期できる、完全無料・登録不要の軽量ミニゲームコレクション。',
    searchPlaceholder: 'ゲーム名やジャンルで検索...',

    // Categories
    catAll: 'すべて',
    catAr: '📷 AR体感',
    catAi: 'ローカルAI',
    catBoard: 'ボード',
    catPuzzle: 'パズル',
    catCard: 'カード',
    catCasual: 'カジュアル',
    catAction: 'アクション',
    catFavorite: 'お気に入り',
    noGamesFound: '該当するゲームが見つかりませんでした。',

    // Game Card
    highScore: '最高',
    playCount: 'プレイ',
    playTimes: '回',
    playNow: '今すぐ遊ぶ',
    addToFav: 'お気に入りに追加',

    // GameShell
    backToList: '一覧へ',
    score: 'スコア',
    howToPlay: 'の遊び方',
    close: '閉じる',
    gameOver: 'ゲームオーバー',
    victory: 'ステージクリア！',
    retryStage: 'このステージをもう一度',
    playAgain: 'もう一度挑戦してみましょう！',
    clearMessage: '素晴らしい！見事クリアしました！',
    finalScore: '最終スコア',
    newRecord: '新記録達成！',
    nextStage: '次のステージへ進む →',
    shareResult: '結果をシェアする',
    shareCopied: '共有リンクをクリップボードにコピーしました！',
    copyright: '©2017 - {year} BlossomsArchive',

    // Sync Modal
    syncTitle: '端末間データ同期 & バックアップ',
    syncDesc: 'スマホや他のブラウザにハイスコア・お気に入りデータを一瞬で引き継ぎます。',
    qrTab: 'QRコード読み取り',
    backupTab: 'JSONエクスポート/インポート',
    qrInstruction: '引き継ぎ先のスマホカメラでこのQRコードを読み取ると、セーブデータを瞬時に同期できます。',
    exportDesc: '現在のセーブデータをJSONテキストとしてバックアップ・復元できます。',
    exportJson: 'バックアップJSONをコピー',
    importJson: 'JSONから復元',
    importPlaceholder: 'エクスポートしたJSONをここに貼り付け...',
    copySuccess: 'クリップボードにコピーしました！',
    importSuccess: 'データの復元が完了しました！',
    importInvalid: '無効なJSONフォーマットです。',
    syncQrTabRecommend: 'QRコードで同期 (おすすめ)',
    syncJsonTab: 'JSONファイル保存 / 復元',
    copySyncUrl: '同期用URLをコピー',
    copySyncUrlDone: '同期用URLをコピーしました',
    syncFoundTitle: '別端末のデータが見つかりました',
    syncFoundDesc: 'QRコードまたは共有リンクからセーブデータを受信しました。現在の記録と統合して同期しますか？（※ハイスコアは高い方がキープされます）',
    syncAccept: 'データを統合して同期する',
    cancel: 'キャンセル',
  },
  en: {
    siteTitle: 'BlossomsArchive',
    siteSubtitle: 'Games',
    dataSync: 'Sync',
    soundMute: 'Mute',
    soundUnmute: 'Unmute',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    selectLang: 'Select Language',

    heroTitle: 'Instant Web Mini-Games for Quick Breaks.',
    heroDesc: 'No installation or account needed. 100% free, lightweight web mini-games with instant QR data sync across devices.',
    searchPlaceholder: 'Search games or genres...',

    catAll: 'All',
    catAr: '📷 AR Sensory',
    catAi: 'Local AI',
    catBoard: 'Board',
    catPuzzle: 'Puzzle',
    catCard: 'Card',
    catCasual: 'Casual',
    catAction: 'Action',
    catFavorite: 'Favorites',
    noGamesFound: 'No games found matching your search.',

    highScore: 'Best',
    playCount: 'Plays',
    playTimes: '',
    playNow: 'Play Now',
    addToFav: 'Add to favorites',

    backToList: 'Back',
    score: 'Score',
    howToPlay: ' - How to Play',
    close: 'Close',
    gameOver: 'Game Over',
    victory: 'Stage Clear!',
    retryStage: 'Retry Stage',
    playAgain: 'Give it another try!',
    clearMessage: 'Awesome! Stage completed!',
    finalScore: 'Final Score',
    newRecord: 'New High Score!',
    nextStage: 'Next Stage →',
    shareResult: 'Share Result',
    shareCopied: 'Share link copied to clipboard!',
    copyright: '©2017 - {year} BlossomsArchive',

    syncTitle: 'Device Sync & Backup',
    syncDesc: 'Transfer high scores and favorites to your smartphone or other browsers instantly.',
    qrTab: 'Scan QR Code',
    backupTab: 'JSON Export / Import',
    qrInstruction: 'Scan this QR code with your smartphone camera to synchronize your save data immediately.',
    exportDesc: 'Backup or restore your current save data as a JSON text file.',
    exportJson: 'Copy Backup JSON',
    importJson: 'Restore from JSON',
    importPlaceholder: 'Paste exported JSON here...',
    copySuccess: 'Copied to clipboard!',
    importSuccess: 'Save data restored successfully!',
    importInvalid: 'Invalid JSON format.',
    syncQrTabRecommend: 'Sync via QR Code (Recommended)',
    syncJsonTab: 'JSON Save / Restore',
    copySyncUrl: 'Copy Sync URL',
    copySyncUrlDone: 'Sync URL Copied!',
    syncFoundTitle: 'Data from Another Device Detected',
    syncFoundDesc: 'Save data received via QR code or link. Would you like to merge with current records?\n(*Higher scores are preserved)',
    syncAccept: 'Merge & Sync Data',
    cancel: 'Cancel',
  },
  ru: {
    siteTitle: 'BlossomsArchive',
    siteSubtitle: 'Игры',
    dataSync: 'Синхронизация',
    soundMute: 'Без звука',
    soundUnmute: 'Включить звук',
    themeLight: 'Светлая тема',
    themeDark: 'Тёмная тема',
    selectLang: 'Выбрать язык',

    heroTitle: 'Мгновенные веб-игры для приятного отдыха.',
    heroDesc: 'Без установки и регистрации. 100% бесплатные лёгкие мини-игры с быстрой синхронизацией по QR-коду между устройствами.',
    searchPlaceholder: 'Поиск по названию или жанру...',

    catAll: 'Все',
    catAr: '📷 AR',
    catAi: 'Локальный ИИ',
    catBoard: 'Настольные',
    catPuzzle: 'Головоломки',
    catCard: 'Карточные',
    catCasual: 'Казуальные',
    catAction: 'Экшен',
    catFavorite: 'Избранное',
    noGamesFound: 'Игры не найдены.',

    highScore: 'Рекорд',
    playCount: 'Сыграно',
    playTimes: 'раз',
    playNow: 'Играть',
    addToFav: 'В избранное',

    backToList: 'Назад',
    score: 'Счёт',
    howToPlay: ' — Правила игры',
    close: 'Закрыть',
    gameOver: 'Игра окончена',
    victory: 'Уровень пройден!',
    retryStage: 'Попробовать снова',
    playAgain: 'Попробуйте ещё раз!',
    clearMessage: 'Отлично! Уровень успешно пройден!',
    finalScore: 'Итоговый счёт',
    newRecord: 'Новый рекорд!',
    nextStage: 'Следующий уровень →',
    shareResult: 'Поделиться результатом',
    shareCopied: 'Ссылка скопирована в буфер обмена!',
    copyright: '©2017 - {year} BlossomsArchive',

    syncTitle: 'Синхронизация и бэкап данных',
    syncDesc: 'Быстро переносите свои рекорды и избранные игры на смартфон или в другой браузер.',
    qrTab: 'Сканировать QR',
    backupTab: 'Экспорт / Импорт JSON',
    qrInstruction: 'Отсканируйте этот QR-код камерой смартфона для мгновенной синхронизации данных.',
    exportDesc: 'Создайте резервную копию или восстановите данные через JSON.',
    exportJson: 'Скопировать JSON',
    importJson: 'Восстановить из JSON',
    importPlaceholder: 'Вставьте экспортированный JSON сюда...',
    copySuccess: 'Скопировано в буфер обмена!',
    importSuccess: 'Данные успешно восстановлены!',
    importInvalid: 'Неверный формат JSON.',
    syncQrTabRecommend: 'Синхронизация по QR-коду (Рекомендуется)',
    syncJsonTab: 'Сохранение / Восстановление JSON',
    copySyncUrl: 'Скопировать ссылку для синхронизации',
    copySyncUrlDone: 'Ссылка для синхронизации скопирована!',
    syncFoundTitle: 'Обнаружены данные с другого устройства',
    syncFoundDesc: 'Получены данные сохранения по QR-коду или ссылке. Объединить с текущими записями?\n(*Высокие рекорды сохраняются)',
    syncAccept: 'Объединить и синхронизировать',
    cancel: 'Отмена',
  },
  ko: {
    siteTitle: 'BlossomsArchive',
    siteSubtitle: 'Games',
    dataSync: '기기 동기화',
    soundMute: '음소거',
    soundUnmute: '소리 켜기',
    themeLight: '라이트 모드',
    themeDark: '다크 모드',
    selectLang: '언어 선택',

    heroTitle: '자투리 시간에 바로 즐기는 웹 미니게임 포털.',
    heroDesc: '설치나 회원가입 없이 바로 플레이! QR 코드로 스마트폰과 데이터를 간편하게 동기화할 수 있는 완전 무료 경량 미니게임 컬렉션.',
    searchPlaceholder: '게임 이름 또는 장르 검색...',

    catAll: '전체',
    catAr: '📷 AR 체감',
    catAi: '로컬 AI',
    catBoard: '보드',
    catPuzzle: '퍼즐',
    catCard: '카드',
    catCasual: '캐주얼',
    catAction: '액션',
    catFavorite: '즐겨찾기',
    noGamesFound: '해당하는 게임을 찾을 수 없습니다.',

    highScore: '최고',
    playCount: '플레이',
    playTimes: '회',
    playNow: '지금 플레이',
    addToFav: '즐겨찾기에 추가',

    backToList: '목록으로',
    score: '점수',
    howToPlay: ' 게임 방법',
    close: '닫기',
    gameOver: '게임 오버',
    victory: '스테이지 클리어!',
    retryStage: '이 스테이지 다시하기',
    playAgain: '다시 한번 도전해보세요!',
    clearMessage: '멋집니다! 성공적으로 클리어했습니다!',
    finalScore: '최종 점수',
    newRecord: '신기록 달성!',
    nextStage: '다음 스테이지로 →',
    shareResult: '결과 공유하기',
    shareCopied: '공유 링크가 클립보드에 복사되었습니다!',
    copyright: '©2017 - {year} BlossomsArchive',

    syncTitle: '기기 간 데이터 동기화 & 백업',
    syncDesc: '스마트폰이나 다른 브라우저로 최고 점수와 즐겨찾기 데이터를 즉시 전송합니다.',
    qrTab: 'QR 코드 스캔',
    backupTab: 'JSON 내보내기/가져오기',
    qrInstruction: '전송받을 스마트폰 카메라로 이 QR 코드를 스캔하면 세이브 데이터가 즉시 동기화됩니다.',
    exportDesc: '현재 저장 데이터를 JSON 텍스트로 백업하거나 복원할 수 있습니다.',
    exportJson: '백업 JSON 복사',
    importJson: 'JSON에서 복원',
    importPlaceholder: '내보낸 JSON을 여기에 붙여넣으세요...',
    copySuccess: '클립보드에 복사되었습니다!',
    importSuccess: '데이터 복원이 완료되었습니다!',
    importInvalid: '유효하지 않은 JSON 형식입니다.',
    syncQrTabRecommend: 'QR 코드로 동기화 (추천)',
    syncJsonTab: 'JSON 파일 저장 / 복원',
    copySyncUrl: '동기화 URL 복사',
    copySyncUrlDone: '동기화 URL이 복사되었습니다!',
    syncFoundTitle: '다른 기기의 데이터를 발견했습니다',
    syncFoundDesc: 'QR 코드 또는 공유 링크로부터 세이브 데이터를 수신했습니다.\n현재 기록과 병합하여 동기화하시겠습니까?\n(※ 더 높은 점수가 유지됩니다)',
    syncAccept: '데이터를 병합하여 동기화',
    cancel: '취소',
  },
  'zh-CN': {
    siteTitle: 'BlossomsArchive',
    siteSubtitle: 'Games',
    dataSync: '设备同步',
    soundMute: '静音',
    soundUnmute: '开启声音',
    themeLight: '浅色模式',
    themeDark: '深色模式',
    selectLang: '选择语言',

    heroTitle: '碎片时间即开即玩的网页小游戏合集。',
    heroDesc: '无需安装，无需注册。支持二维码跨设备秒级同步存档的完全免费轻量小游戏集合。',
    searchPlaceholder: '搜索游戏名称或分类...',

    catAll: '全部',
    catAr: '📷 AR体感',
    catAi: '本地AI',
    catBoard: '棋盘',
    catPuzzle: '益智',
    catCard: '卡牌',
    catCasual: '休闲',
    catAction: '动作',
    catFavorite: '收藏',
    noGamesFound: '未找到匹配的游戏。',

    highScore: '最高',
    playCount: '已玩',
    playTimes: '次',
    playNow: '立即开始',
    addToFav: '加入收藏',

    backToList: '返回列表',
    score: '得分',
    howToPlay: ' 玩法说明',
    close: '关闭',
    gameOver: '游戏结束',
    victory: '关卡完成！',
    retryStage: '重新挑战本关',
    playAgain: '再试一次吧！',
    clearMessage: '太棒了！顺利通关！',
    finalScore: '最终得分',
    newRecord: '创造新纪录！',
    nextStage: '进入下一关 →',
    shareResult: '分享游戏成绩',
    shareCopied: '分享链接已复制到剪贴板！',
    copyright: '©2017 - {year} BlossomsArchive',

    syncTitle: '跨设备数据同步与备份',
    syncDesc: '将最高分和收藏数据一键同步至手机或其他浏览器。',
    qrTab: '扫描二维码',
    backupTab: 'JSON 导出 / 导入',
    qrInstruction: '使用手机相机扫描此二维码，即可瞬间同步游戏存档。',
    exportDesc: '将当前存档作为 JSON 文本进行备份或恢复。',
    exportJson: '复制备份 JSON',
    importJson: '从 JSON 恢复',
    importPlaceholder: '在此粘贴导出的 JSON 文本...',
    copySuccess: '已成功复制到剪贴板！',
    importSuccess: '数据恢复成功！',
    importInvalid: '无效的 JSON 格式。',
    syncQrTabRecommend: '扫描二维码同步 (推荐)',
    syncJsonTab: 'JSON 文件备份 / 恢复',
    copySyncUrl: '复制同步链接',
    copySyncUrlDone: '已复制同步链接！',
    syncFoundTitle: '发现来自其他设备的数据',
    syncFoundDesc: '已通过二维码或链接接收到存档数据。是否与当前记录合并同步？\n（※最高分将保留较高的一方）',
    syncAccept: '合并并同步数据',
    cancel: '取消',
  },
  'zh-TW': {
    siteTitle: 'BlossomsArchive',
    siteSubtitle: 'Games',
    dataSync: '裝置同步',
    soundMute: '靜音',
    soundUnmute: '開啟聲音',
    themeLight: '淺色模式',
    themeDark: '深色模式',
    selectLang: '選擇語言',

    heroTitle: '碎片時間即開即玩的網頁小遊戲合集。',
    heroDesc: '無需安裝，無需註冊。支援 QR Code 跨裝置秒級同步存檔的完全免費輕量小遊戲集合。',
    searchPlaceholder: '搜尋遊戲名稱或分類...',

    catAll: '全部',
    catAr: '📷 AR體感',
    catAi: '本地AI',
    catBoard: '棋盤',
    catPuzzle: '益智',
    catCard: '卡牌',
    catCasual: '休閒',
    catAction: '動作',
    catFavorite: '收藏',
    noGamesFound: '找不到符合條件的遊戲。',

    highScore: '最高',
    playCount: '遊玩',
    playTimes: '次',
    playNow: '立即遊玩',
    addToFav: '加入收藏',

    backToList: '返回列表',
    score: '得分',
    howToPlay: ' 玩法說明',
    close: '關閉',
    gameOver: '遊戲結束',
    victory: '關卡完成！',
    retryStage: '重新挑戰此關',
    playAgain: '再試一次吧！',
    clearMessage: '太棒了！順利通關！',
    finalScore: '最終得分',
    newRecord: '達成新紀錄！',
    nextStage: '進入下一關 →',
    shareResult: '分享遊戲成績',
    shareCopied: '分享連結已複製到剪貼簿！',
    copyright: '©2017 - {year} BlossomsArchive',

    syncTitle: '跨裝置資料同步與備份',
    syncDesc: '將最高分與收藏資料一秒同步至手機或其他瀏覽器。',
    qrTab: '掃描 QR Code',
    backupTab: 'JSON 匯出 / 匯入',
    qrInstruction: '使用手機相機掃描此 QR Code，即可瞬間同步遊戲存檔。',
    exportDesc: '將目前存檔作為 JSON 文字進行備份或還原。',
    exportJson: '複製備份 JSON',
    importJson: '從 JSON 還原',
    importPlaceholder: '在此貼上匯出的 JSON 文字...',
    copySuccess: '已成功複製到剪貼簿！',
    importSuccess: '資料還原成功！',
    importInvalid: '無效的 JSON 格式。',
    syncQrTabRecommend: '掃描 QR Code 同步 (推薦)',
    syncJsonTab: 'JSON 檔案備份 / 還原',
    copySyncUrl: '複製同步連結',
    copySyncUrlDone: '已複製同步連結！',
    syncFoundTitle: '發現來自其他裝置的資料',
    syncFoundDesc: '已透過 QR Code 或分享連結接收存檔資料。是否與目前紀錄合併同步？\n（※最高分將保留較高者）',
    syncAccept: '合併並同步資料',
    cancel: '取消',
  },
};

export function t(key: string): string {
  const lang = currentLang();
  return UI_STRINGS[lang]?.[key] ?? UI_STRINGS.ja[key] ?? key;
}
