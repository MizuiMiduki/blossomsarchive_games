// 完全サーバーレス・ゼロトラスト WebRTC P2P コネクション管理
import QRCode from 'qrcode';

export interface P2PConnectionEvents {
  onConnected: () => void;
  onMessage: (data: unknown) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
}

// SDPをコンパクトなBase64文字列に圧縮
function compressSdp(sdp: RTCSessionDescriptionInit): string {
  const json = JSON.stringify(sdp);
  return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

// Base64からSDPを復元
function decompressSdp(encoded: string): RTCSessionDescriptionInit | null {
  try {
    const json = decodeURIComponent(
      Array.prototype.map
        .call(atob(encoded.trim()), (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export class ZeroTrustP2P {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private events: P2PConnectionEvents;

  constructor(events: P2PConnectionEvents) {
    this.events = events;
  }

  // ホスト側: 部屋を作成し、招待コード (Offer) を生成
  async createHostOffer(): Promise<string> {
    this.close();

    // STUNサーバーのみ使用 (Googleの公開STUN。シグナリングサーバーではなく、自身のNAT解決のみに使用)
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // 暗号化DataChannelを作成
    this.dc = this.pc.createDataChannel('blossom_game_channel', {
      ordered: true, // 順序保証
    });

    this.setupDataChannel(this.dc);

    // ICE Candidate の収集完了を待ってから完全なOfferを返す（最大1000msでフォールバック）
    return new Promise((resolve, reject) => {
      if (!this.pc) return reject(new Error('PeerConnection not initialized'));

      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        if (this.pc?.localDescription) {
          const offerCode = compressSdp(this.pc.localDescription);
          resolve(offerCode);
        } else {
          reject(new Error('SDP generation failed'));
        }
      };

      // STUN到達が遅い環境でも1秒以内に確実に応答コードを生成
      const timeoutId = setTimeout(finish, 1000);

      this.pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeoutId);
          finish();
        }
      };

      this.pc
        .createOffer()
        .then((offer) => this.pc?.setLocalDescription(offer))
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  }

  // ゲスト側: ホストの招待コードを受け取り、応答コード (Answer) を生成
  async joinGuest(offerCode: string): Promise<string> {
    this.close();

    const offer = decompressSdp(offerCode);
    if (!offer) throw new Error('無効な招待コードです。');

    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.pc.ondatachannel = (event) => {
      this.dc = event.channel;
      this.setupDataChannel(this.dc);
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // ICE Candidate の収集完了を待ってから完全なAnswerを返す（最大1000msでフォールバック）
    return new Promise((resolve, reject) => {
      if (!this.pc) return reject(new Error('PeerConnection not initialized'));

      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        if (this.pc?.localDescription) {
          const answerCode = compressSdp(this.pc.localDescription);
          resolve(answerCode);
        } else {
          reject(new Error('Answer SDP generation failed'));
        }
      };

      const timeoutId = setTimeout(finish, 1000);

      this.pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeoutId);
          finish();
        }
      };
    });
  }

  // ホスト側: ゲストの応答コード (Answer) を適用してP2P直結を完了
  async completeHostConnection(answerCode: string): Promise<void> {
    if (!this.pc) throw new Error('接続が初期化されていません。');

    const answer = decompressSdp(answerCode);
    if (!answer) throw new Error('無効な応答コードです。');

    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('ZeroTrust P2P DataChannel Opened!');
      this.events.onConnected();
    };

    channel.onclose = () => {
      console.log('ZeroTrust P2P DataChannel Closed');
      this.events.onDisconnected();
    };

    channel.onerror = (err) => {
      console.error('DataChannel Error:', err);
      this.events.onError('通信エラーが発生しました。');
    };

    channel.onmessage = (event) => {
      try {
        // パケットサイズ上限チェック (16KB)
        if (typeof event.data === 'string' && event.data.length > 16384) {
          console.error('Security Alert: Payload size exceeded');
          return;
        }
        const parsed = JSON.parse(event.data);
        this.events.onMessage(parsed);
      } catch (err) {
        console.error('Security Alert: Malformed message payload', err);
      }
    };
  }

  // メッセージ送信 (暗号化DataChannel経由)
  send(data: unknown): boolean {
    if (!this.dc || this.dc.readyState !== 'open') {
      return false;
    }
    try {
      this.dc.send(JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  // 切断処理
  close() {
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }

  // QRコード生成ヘルパー
  static async toQrCode(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch {
      return '';
    }
  }
}
