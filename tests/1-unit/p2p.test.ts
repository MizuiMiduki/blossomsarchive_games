import { TestContext } from '../test-utils.ts';
import { compressSdp, decompressSdp } from '../../src/utils/p2p.ts';

export async function runP2pUnitTests(): Promise<TestContext> {
  const ctx = new TestContext('Unit - ZeroTrust P2P Data Serialization');

  // 1. 正常な SDP オファーのシリアライズ
  const mockOffer = {
    type: 'offer',
    sdp: 'v=0\r\no=- 4611732007887305988 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel 1024\r\nc=IN IP4 0.0.0.0\r\n',
  };

  const compressed = compressSdp(mockOffer);
  ctx.assert(typeof compressed === 'string' && compressed.length > 0, 'SDP is successfully compressed to string');

  const decompressed = decompressSdp(compressed);
  ctx.assert(Boolean(decompressed), 'Decompressed SDP is not null');
  ctx.assertEqual(decompressed?.type, mockOffer.type, 'Decompressed SDP matches original offer type');
  ctx.assertEqual(decompressed?.sdp, mockOffer.sdp, 'Decompressed SDP matches original offer string');

  // 2. 正常な SDP アンサーのシリアライズ
  const mockAnswer = {
    type: 'answer',
    sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
  };
  const compressedAnswer = compressSdp(mockAnswer);
  const decompressedAnswer = decompressSdp(compressedAnswer);
  ctx.assertEqual(decompressedAnswer?.type, 'answer', 'Decompressed SDP matches original answer type');
  ctx.assertEqual(decompressedAnswer?.sdp, mockAnswer.sdp, 'Decompressed SDP matches original answer string');

  // 3. 不正・改ざんデータの耐障害性テスト (Zero-Crash)
  ctx.assertEqual(decompressSdp(''), null, 'Empty string gracefully returns null');
  ctx.assertEqual(decompressSdp('???not-valid-base64???'), null, 'Invalid base64 characters gracefully return null');
  ctx.assertEqual(decompressSdp('dGVzdA=='), null, 'Non-JSON base64 string gracefully returns null');
  ctx.assertEqual(decompressSdp('e30='), null, 'Empty object without type/sdp gracefully returns null');

  // 4. 極端に巨大な攻撃的入力に対するテスト
  const hugeGarbage = 'A'.repeat(50000);
  ctx.assertEqual(decompressSdp(hugeGarbage), null, 'Huge payload safely rejected without memory leak or crash');

  return ctx;
}
