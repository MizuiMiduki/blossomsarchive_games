import { TestContext } from '../test-utils.ts';
import { t, setLang, getLang, LANG_OPTIONS, SupportedLang } from '../../src/utils/i18n.ts';
import { GAME_TRANSLATIONS, getLocalizedGame } from '../../src/utils/gameTranslations.ts';
import { GAMES } from '../../src/games/registry.ts';

export async function runI18nUnitTests(): Promise<TestContext> {
  const ctx = new TestContext('Unit - i18n & Game Translations');

  // 1. サポート言語の定義
  const supported: SupportedLang[] = ['ja', 'en', 'ru', 'ko', 'zh-CN', 'zh-TW'];
  ctx.assertEqual(LANG_OPTIONS.length, 6, 'LANG_OPTIONS has 6 supported languages');
  for (const s of supported) {
    ctx.assert(LANG_OPTIONS.some((opt) => opt.code === s), `Language ${s} is registered in LANG_OPTIONS`);
  }

  // 2. 言語切り替えと t() 動作
  setLang('en');
  ctx.assertEqual(getLang(), 'en', 'Current language set to en');
  ctx.assertEqual(t('backToList'), 'Back', 't("backToList") returns English text');
  ctx.assertEqual(t('retryStage'), 'Retry Stage', 't("retryStage") returns English text');

  setLang('ja');
  ctx.assertEqual(getLang(), 'ja', 'Current language set to ja');
  ctx.assertEqual(t('backToList'), '一覧へ', 't("backToList") returns Japanese text');
  ctx.assertEqual(t('retryStage'), 'このステージをもう一度', 't("retryStage") returns Japanese text');

  setLang('ko');
  ctx.assertEqual(t('playNow'), '지금 플레이', 't("playNow") returns Korean text');

  // 3. 全40ゲームの翻訳定義が揃っているか
  ctx.assertEqual(GAMES.length, 40, '40 games found in registry');
  for (const game of GAMES) {
    const trans = GAME_TRANSLATIONS[game.id];
    ctx.assert(Boolean(trans), `Translation map exists for game ${game.id}`);
    if (trans) {
      for (const lang of supported) {
        const item = trans[lang];
        ctx.assert(
          Boolean(item && item.title && item.description),
          `Game ${game.id} has valid title & description for ${lang}`
        );
      }
    }
  }

  // 4. getLocalizedGame フォールバック動作
  setLang('en');
  const localized = getLocalizedGame('blossom-life', {
    id: 'blossom-life',
    title: 'ライフゲーム',
    titleJp: 'ライフゲーム',
    description: 'テスト',
  } as any);
  ctx.assert(Boolean(localized.title), 'getLocalizedGame returns localized title');
  ctx.assert(localized.title !== 'ライフゲーム', 'getLocalizedGame switches to English title in en mode');

  setLang('ja'); // リセット
  return ctx;
}
