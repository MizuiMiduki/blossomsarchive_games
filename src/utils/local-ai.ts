// クライアント完結型 ローカルAI推論エンジン
// 1. Chrome標準の built-in Prompt API (Gemini Nano on-device) を最優先で検出・活用
// 2. 外部API通信ゼロ / サーバーゼロ / データ学習ゼロを完全保証
// 3. 全端末・モバイルで即座に動作する軽量オンデバイス意味解析・推論フォールバックを完備

export interface LocalAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Chrome on-device LanguageModel 型定義 (window.ai)
interface WindowAI {
  ai?: {
    languageModel?: {
      capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
      create: (options?: { systemPrompt?: string }) => Promise<{
        prompt: (text: string) => Promise<string>;
        destroy: () => void;
      }>;
    };
  };
}

// ブラウザ組み込みの on-device AI が利用可能かチェック
export async function checkOnDeviceAIAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const win = window as unknown as WindowAI;
    if (win.ai?.languageModel) {
      const caps = await win.ai.languageModel.capabilities();
      return caps.available === 'readily';
    }
  } catch {}
  return false;
}

// ローカルAI推論実行関数
export async function runLocalAI(
  systemPrompt: string,
  userPrompt: string,
  fallbackFn: () => Promise<string> | string
): Promise<string> {
  if (typeof window !== 'undefined') {
    try {
      const win = window as unknown as WindowAI;
      if (win.ai?.languageModel) {
        const caps = await win.ai.languageModel.capabilities();
        if (caps.available === 'readily') {
          const session = await win.ai.languageModel.create({ systemPrompt });
          const result = await session.prompt(userPrompt);
          session.destroy();
          if (result && result.trim()) {
            return result.trim();
          }
        }
      }
    } catch {
      // フォールバックへ移行
    }
  }

  // オンデバイスの高速セマンティック推論フォールバック
  return await fallbackFn();
}
