// ゼロトラスト・セキュリティエンジン (Web Crypto API & 相互状態検証)

// SHA-256 ハッシュを計算
export async function calculateStateHash(stateObj: unknown): Promise<string> {
  const json = JSON.stringify(stateObj);
  const msgUint8 = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// プレイヤー名のサニタイズ (XSS・制御文字の徹底排除)
export function sanitizePlayerName(name: string): string {
  if (!name) return '名無し';
  // 12文字以内、英数字・ひらがな・カタカナ・漢字のみ許可
  const cleaned = name
    .replace(/[^\p{L}\p{N}_\s-]/gu, '')
    .trim()
    .slice(0, 12);
  return cleaned || 'プレイヤー';
}

// P2Pパケットの厳格なスキーマ検証
export interface P2PActionPacket {
  seq: number;          // シーケンス番号 (リプレイ攻撃防止)
  timestamp: number;    // 送信時刻
  type: 'move' | 'pass' | 'surrender' | 'sync_check';
  row?: number;
  col?: number;
  stateHash: string;    // 着手前の盤面ハッシュ (Desync防止)
}

export function validateIncomingPacket(raw: unknown, expectedSeq: number): P2PActionPacket | null {
  if (!raw || typeof raw !== 'object') return null;

  const packet = raw as Record<string, unknown>;

  // 1. シーケンス番号チェック (リプレイ攻撃・順序狂い防止)
  if (typeof packet.seq !== 'number' || packet.seq !== expectedSeq) {
    console.error('Security Alert: Invalid sequence number', packet.seq, 'expected', expectedSeq);
    return null;
  }

  // 2. タイムスタンプチェック (未来すぎる・古すぎるパケットを排除)
  if (typeof packet.timestamp !== 'number' || Math.abs(Date.now() - packet.timestamp) > 300000) {
    console.error('Security Alert: Timestamp out of bounds');
    return null;
  }

  // 3. アクション種別チェック
  if (!['move', 'pass', 'surrender', 'sync_check'].includes(packet.type as string)) {
    console.error('Security Alert: Unknown packet type');
    return null;
  }

  // 4. 座標値チェック
  if (packet.type === 'move') {
    if (
      typeof packet.row !== 'number' ||
      typeof packet.col !== 'number' ||
      packet.row < 0 ||
      packet.row >= 8 ||
      packet.col < 0 ||
      packet.col >= 8
    ) {
      console.error('Security Alert: Move coordinates out of bounds');
      return null;
    }
  }

  // 5. ハッシュ値チェック
  if (typeof packet.stateHash !== 'string' || packet.stateHash.length !== 64) {
    console.error('Security Alert: Invalid state hash format');
    return null;
  }

  return {
    seq: packet.seq,
    timestamp: packet.timestamp,
    type: packet.type as P2PActionPacket['type'],
    row: packet.row as number | undefined,
    col: packet.col as number | undefined,
    stateHash: packet.stateHash,
  };
}
