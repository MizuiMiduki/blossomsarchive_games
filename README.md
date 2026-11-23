# 🌸 BlossomsArchive Games

> **「スキマ時間に、一輪の花を咲かせるような遊び体験を。」**  
> サーバーサイドの処理を一切持たない、完全クライアントサイド完結・超軽量なWebミニゲームポータル。

---

## ✨ 特徴

- ⚡ **Solid.js 2.0 駆動**: 仮想DOMなし・細粒度リアクティビティによる爆速ロード＆60FPSの滑らかな操作性（全10ゲーム入ってJSバンドルわずか約74KB gzip）。
- 🛡️ **Zero Backend (完全静的)**: サーバーサイド処理不要。インフラ費用ゼロで Cloudflare Pages / GitHub Pages / Vercel などに即座にデプロイ可能。
- 🔒 **ゼロトラスト P2P 暗号化対戦**: サーバーを介さずブラウザ同士が直接直結。SHA-256盤面ハッシュ相互検証と二重ルールバリデーションでチート・改ざんを完全防御。
- 🤖 **クライアント完結NPC AI**: オセロ、将棋、チェス、五目並べの思考ルーチンがすべてブラウザ上で高速動作。
- 📲 **QRコード 端末間データ同期**: データベース不要で、PCからスマホへQRコードをかざすだけでセーブデータ（ハイスコア・お気に入り）を一瞬で安全同期。
- 🎵 **プロシージャル効果音**: Web Audio API による合成音（外部mp3ファイルの読み込み不要で軽量）。
- 📱 **レスポンシブ & PWAフレンドリー**: スマートフォンのスワイプ/タッチ操作・PCキーボード両対応。
- 🌓 **テーマ切り替え**: ダークモード / ライトモード対応。
- 📊 **AdSense & GA4 対応**: ユーザーの初期操作までスクリプト読み込みを遅延させ、LCP・Core Web Vitalsを損なわない設計。

---

## 🎮 収録ミニゲーム一覧（全10タイトル）

### ♟️ ボードゲーム（NPC対戦 ＆ サーバーレスP2P対戦）
1. **Petal Reversi (花弁オセロ)**: 椿🌺と桜🌸で挟み合う本格オセロ。初級〜上級NPC対戦 ＆ 🔒暗号化P2Pオンライン対戦対応。
2. **Mini Shogi (5×5 ミニ将棋)**: 王・金・銀・角・飛・歩のミニ将棋。持ち駒や成りも完全対応。
3. **Blossom Chess (チェス)**: 知性的な思考エンジンを搭載したクラシック・チェス。
4. **Gomoku Garden (五目並べ)**: 碁盤の上に石を5つ並べる定番頭脳ゲーム。

### 🧩 パズル
5. **Blossom Drop (花果マージパズル)**: 同じ果物・花を落としてくっつけ、大輪の桜花を目指す2D物理演算パズル（スイカゲーム系）。
6. **Floris 2048**: つぼみ🌱から大輪の奇跡の花束💐 (2048) へと進化させるスライドパズル。Undo機能付き。
7. **Bouquet Block 10×10**: 盤面にブロックを敷き詰めて縦横ラインを消していく思考型脳トレパズル。

### 🃏 カード & カジュアル
8. **Blossom Life (百花繚乱 ライフゲーム)**: 年齢に応じて花が咲き誇るモダナイズド・コンウェイのライフゲーム。グライダー銃やパルサー等の有名プリセット、アンビエントサウンド搭載。
9. **Petal Solitaire**: 美しい花びらトランプで楽しむクラシック・クロンダイク。ワンタップ自動移動対応。
10. **Memory Garden (神経衰弱)**: 美しい花のカードをめくってペアを揃える記憶力ゲーム（3難易度）。

### 🏃 アクション
11. **Petal Dash**: 風に乗る花びらをタップでふわりと操り、障害物をかわして飛ぶ60FPSエンドレスラン。

---

## 🛠️ 技術スタック

- **Framework**: [Solid.js 2.0](https://solidjs.com)
- **Routing**: `@solidjs/router` 2.0
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Bundler**: [Vite 6](https://vitejs.dev)
- **Language**: TypeScript 5.8
- **Audio**: Web Audio API Procedural Synthesizer
- **Physics**: 2D Circle Impulse Physics Engine (自前実装・依存ゼロ)
- **P2P/Security**: WebRTC DataChannel (DTLS) + Web Crypto API (SHA-256)
- **FX**: `canvas-confetti`

---

## ⚙️ 環境変数設定 (.env)

必要に応じて `.env` に設定してください（設定されていない場合は自動的に無効化され、エラーなく動作します）：

```bash
# Google Analytics (GA4) Measurement ID (e.g., G-XXXXXXXXXX)
VITE_GA_MEASUREMENT_ID=

# Google AdSense Client ID (e.g., ca-pub-XXXXXXXXXXXXXXXX)
VITE_ADSENSE_CLIENT_ID=

# Google AdSense default ad slot ID
VITE_ADSENSE_DEFAULT_SLOT=
```

---

## 🚀 クイックスタート

### 開発サーバー起動
```bash
npm run dev
# http://localhost:3000 にアクセス
```

### プロダクションビルド
```bash
npm run build
# dist/ ディレクトリに静的ファイルが出力されます
```
