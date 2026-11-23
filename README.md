# 🌸 BlossomsArchive Games

> **「スキマ時間に、一輪の花を咲かせるような遊び体験を。」**  
> サーバーサイドの処理を一切持たない、完全クライアントサイド完結・超軽量なWebミニゲームポータル。

---

## ✨ 特徴

- ⚡ **Solid.js 2.0 駆動**: 仮想DOMなし・細粒度リアクティビティによる爆速ロード＆60FPSの滑らかな操作性（全10ゲーム入ってJSバンドルわずか約58KB gzip）。
- 🛡️ **Zero Backend (完全静的)**: サーバーサイド処理不要。インフラ費用ゼロで Cloudflare Pages / GitHub Pages / Vercel などに即座にデプロイ可能。
- 🤖 **クライアント完結NPC AI**: オセロ、将棋、チェス、五目並べの思考ルーチンがすべてブラウザ上で高速動作。
- 💾 **セーブデータ永続化**: ハイスコア、プレイ回数、クリア状況、お気に入り設定を `localStorage` に自動保存。バックアップ（JSONエクスポート/インポート）機能つき。
- 🎵 **プロシージャル効果音**: Web Audio API による合成音（外部mp3ファイルの読み込み不要で軽量）。
- 📱 **レスポンシブ & PWAフレンドリー**: スマートフォンのスワイプ/タッチ操作・PCキーボード両対応。
- 🌓 **テーマ切り替え**: ダークモード / ライトモード対応。

---

## 🎮 収録ミニゲーム一覧（全10タイトル）

### ♟️ ボードゲーム（NPC対戦）
1. **Petal Reversi (花弁オセロ)**: 椿🌺と桜🌸で挟み合う本格オセロ。初級〜上級のAlpha-Beta探索AIとヒント機能付き。
2. **Mini Shogi (5×5 ミニ将棋)**: 王・金・銀・角・飛・歩のミニ将棋。持ち駒や成りも完全対応。
3. **Blossom Chess (チェス)**: 知性的な思考エンジンを搭載したクラシック・チェス。
4. **Gomoku Garden (五目並べ)**: 碁盤の上に石を5つ並べる定番頭脳ゲーム。

### 🧩 パズル
5. **Blossom Drop (花果マージパズル)**: 同じ果物・花を落としてくっつけ、大輪の桜花を目指す2D物理演算パズル（スイカゲーム系）。
6. **Floris 2048**: つぼみ🌱から大輪の奇跡の花束💐 (2048) へと進化させるスライドパズル。Undo機能付き。
7. **Bouquet Block 10×10**: 盤面にブロックを敷き詰めて縦横ラインを消していく思考型脳トレパズル。

### 🃏 カード & カジュアル
8. **Petal Solitaire**: 美しい花びらトランプで楽しむクラシック・クロンダイク。ワンタップ自動移動対応。
9. **Memory Garden (神経衰弱)**: 美しい花のカードをめくってペアを揃える記憶力ゲーム（3難易度）。

### 🏃 アクション
10. **Petal Dash**: 風に乗る花びらをタップでふわりと操り、障害物をかわして飛ぶ60FPSエンドレスラン。

---

## 🛠️ 技術スタック

- **Framework**: [Solid.js 2.0](https://solidjs.com)
- **Routing**: `@solidjs/router` 2.0
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Bundler**: [Vite 6](https://vitejs.dev)
- **Language**: TypeScript 5.8
- **Audio**: Web Audio API Procedural Synthesizer
- **Physics**: 2D Circle Impulse Physics Engine (自前実装・依存ゼロ)
- **FX**: `canvas-confetti`

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
