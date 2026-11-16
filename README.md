# WASM Camera Studio

ブラウザ上の WebRTC (`getUserMedia`) と WebAssembly (`FFmpeg.wasm`) のみで動作する静的（Static）Web カメラアプリです。写真撮影・動画録画・フォーマット変換・フィルター処理はすべてクライアントサイドで完結し、映像や撮影データが外部サーバーへ送信されることはありません。

## 主な機能

- **リア / フロントカメラ切り替え & マルチカメラ対応**:
  - ワンタップでリアカメラ (`environment`) とフロントカメラ (`user`) を切り替え可能。
  - 複数の背面カメラ（超広角・広角・望遠など）や外付け USB Web カメラを接続したマルチカメラ端末向けに、`enumerateDevices()` による全カメラデバイス一覧からの直接選択・切り替えに対応。
  - `devicechange` イベント監視によるカメラ接続/切断の自動反映、カメラ切り替え時の確実なトラック解放 (`track.stop()`) を実装。
- **写真撮影 & リアルタイム / WASM フィルター**:
  - プレビューミラー反転（フロントカメラ自動対応 + 手動切替）、3x3 グリッド / センタークロス表示、セルフタイマー（OFF / 3s / 5s / 10s）、解像度選択（Auto / 4K / 1080p / 720p / 480p）。
  - フィルタープリセット（Normal / Vivid / Mono / Warm / Cool / Vintage）をプレビュー＆撮影に反映。
  - WASM による写真フォーマット変換（PNG / JPEG / WebP）やリサイズに対応。
- **動画録画 & WASM トランスコード**:
  - `MediaRecorder` による録画（マイク音声 ON/OFF 切替、一時停止/再開、録画タイマー）。
  - `FFmpeg.wasm` によるクライアントサイド変換（WebM → **MP4 (H.264)** / **高品質アニメーション GIF** / WebM）。
- **撮影ギャラリー & ZIP 一括保存**:
  - 撮影した写真・動画をギャラリーで即時プレビュー、個別保存、WASM 再変換、依存ゼロの UTF-8 対応 ZIP 一括ダウンロードに対応。

## ディレクトリ構成

```
├── index.html
├── licenses.html
├── css/
│   ├── tokens.css                  # デザインシステム・カラー・タイポグラフィ変数
│   ├── base.css                    # ベーススタイル・リセット
│   ├── layout.css                  # アプリシェル・レスポンシブレイアウト
│   ├── components.css              # ファインダー・カメラ操作・ギャラリーカード
│   └── modals.css                  # プレビュー / WASM変換モーダル・トースト
├── js/
│   ├── main.js                     # エントリーポイント・アプリ初期化
│   ├── constants/
│   │   └── cameraConfig.js         # 解像度・フィルター・WASM出力形式定義
│   ├── state/
│   │   └── store.js                # リアクティブな状態管理ストア
│   ├── services/
│   │   ├── cameraService.js        # getUserMedia・enumerateDevices・マルチカメラ切替
│   │   ├── wasmService.js          # FFmpeg.wasm ローダー・キュー・画像/動画変換
│   │   └── downloadService.js      # 単体ダウンロード・ZIP一括ダウンロード
│   ├── components/
│   │   ├── viewfinder.js           # ビデオプレビュー・グリッド・タイマー・フラッシュ
│   │   ├── cameraControls.js       # カメラ切替・解像度・モード・フィルターUI
│   │   ├── gallery.js              # 撮影ギャラリー・アクション
│   │   └── previewModal.js         # 拡大プレビュー＆WASMフォーマット変換モーダル
│   ├── i18n/
│   │   ├── i18n.js                 # 日英バイリンガルサービス
│   │   └── translations.js         # 翻訳辞書 (ja / en)
│   └── utils/
│       ├── formatters.js           # サイズ・時間・ファイル名整形
│       ├── zipBuilder.js           # 依存ゼロのUTF-8対応ZIPビルダー
│       └── toast.js                # トースト通知
└── vendor/                         # FFmpeg.wasm ローカルバンドル (CDNフォールバック対応)
```

## ローカル実行方法

カメラ API (`getUserMedia`) はセキュリティ上 `https://` または `http://localhost` でのみ動作します。

```bash
npm run serve
# または
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開いてください。GitHub Pages などの静的ホスティングにもそのままデプロイできます。

## ライセンス

ソースコードは [MIT License](LICENSE) のもとで公開されています。使用ライブラリの詳細は [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) および [licenses.html](licenses.html) をご参照ください。
