import { TestContext } from '../test-utils.ts';
import { setLang, getLang, t, SupportedLang } from '../../src/utils/i18n.ts';
import { getLocalizedGame } from '../../src/utils/gameTranslations.ts';
import { GAMES } from '../../src/games/registry.ts';

export async function runLocalizationFlowIntegrationTests(): Promise<TestContext> {
  const ctx = new TestContext('Integration - Multilingual Propagation Pipeline');

  const languages: SupportedLang[] = ['ja', 'en', 'ru', 'ko', 'zh-CN', 'zh-TW'];

  for (const lang of languages) {
    setLang(lang);
    ctx.assertEqual(getLang(), lang, `Language successfully switched to ${lang}`);

    // UI ラベルの検証
    const playNowLabel = t('playNow');
    ctx.assert(Boolean(playNowLabel && playNowLabel.length > 0), `t('playNow') returns valid string in ${lang}`);

    const backLabel = t('backToList');
    ctx.assert(Boolean(backLabel && backLabel.length > 0), `t('backToList') returns valid string in ${lang}`);

    // 代表ゲームのタイトル・説明文の言語連動
    const game = GAMES.find((g) => g.id === 'memory-garden')!;
    const localized = getLocalizedGame(game.id, game);
    ctx.assert(Boolean(localized.title && localized.description), `Game metadata translated for ${lang}`);
    if (lang === 'en') {
      ctx.assertEqual(localized.title, 'Memory Match', 'English title correctly resolved');
    } else if (lang === 'ja') {
      ctx.assertEqual(localized.title, '神経衰弱', 'Japanese title correctly resolved');
    }
  }

  setLang('ja'); // リセット
  return ctx;
}
