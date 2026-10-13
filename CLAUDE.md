# iphone リポジトリの指示

複数の iPhone アプリを `apps/<アプリ名>/` に分けて管理するリポジトリ。詳しい手順は README.md を参照。

## 構成ルール

- アプリは必ず `apps/<アプリ名>/` に 1 つずつ置く。ルート直下にアプリのソースは置かない。
- 各アプリは独立した Expo プロジェクト。`npm install` と `npx expo start` はそのアプリのフォルダで実行する。
- 新規アプリは `apps` で `npx create-expo-app@latest <アプリ名>` で作り、`app.json` の `name` / `slug` / `scheme` と `package.json` の `name` をアプリ名に合わせる。
- フォルダ構成はシンプルに保つ。ルートには `apps/`、`local/`(機密、git 管理外)、README.md、CLAUDE.md、.gitignore 以外を増やさない。
- 鍵・秘密情報・VPS の実データ(口座残高・攻撃元 IP など)はリポジトリに入れない。見本データは形だけ合わせた作り物にする。
- 新しいアプリを作ったら、最初に `app.json` の `ios.supportsTablet` を決める(iPhone 専用なら `false`、iPad でも使うなら `true` + 回転・幅の対応)。詳細は README.md「スマホ(iPhone)とタブレット(iPad)の違いによる注意」。画面の幅は `useWindowDimensions()` で取り、固定 px にしない。

## 開発環境の前提

- Windows(Xcode なし)。Node 24 / npm 11 を使う。Flutter と .NET SDK は入っていない。
- iPhone 実機では Expo Go で動作確認する。ストア用ビルドは EAS Build を使う。
- VPS(`ssh mt5vps`、WireGuard 10.8.0.1)への接続や `D:\github\vscode-` の鍵フォルダの読み取りは、Claude Code の自動モードの判定で止められる。必要なら利用者に実行を頼むか、権限ルールを足してもらう。

## vpsmon(VPS Monitor)

- 元は `D:\github\picoclac\apps\net\mt5mon` と `vpschat`(C 言語)。仕様の正は `D:\github\picoclac\AGENTS.md` の「mt5mon」「vpschat」の節と、VPS 側の `D:\github\vscode-\MT5\claude_ea\tools\vps\{status_server,attack,chat}.py`。
- JSON の形は `apps/vpsmon/src/lib/types.ts`。変えるときは VPS 側のソースで確かめてから。
- 上げ=赤・下げ=水色、損益は + 緑・− 橙(利用者の指定。PicoCalc と同じ)。
- iPhone の WireGuard は PicoCalc と同じ鍵(10.8.0.3)を使い、同時にはつながない(利用者の決定 2026-10-13)。

## 経験ルール(分かったことを追記していく)

- `npx create-expo-app . ` は、対象フォルダに `.claude` など何かファイルがあると拒否する。空のフォルダに生成するか、一時的に退避する(2026-10-13)。
- `create-expo-app` は作成先のフォルダ名を `app.json` の `name` / `slug` / `scheme` と `package.json` の `name` にそのまま使う。生成後に必ず確認して直す(2026-10-13)。
- 生成直後に `npx tsc --noEmit` を実行すると CSS モジュールと `@/global.css` の型エラーが 2 件出る。原因は `expo-env.d.ts`(tsconfig が include、.gitignore 対象)が未生成なこと。`npx expo start` を一度実行すると生成されてエラー 0 になる(2026-10-13)。
- 非対話で Expo の起動を確認したいときは `CI=1 npx expo start --offline --port <番号>` を `timeout` 付きで実行する。バンドルの確認は `CI=1 npx expo export --platform ios`(2026-10-13)。
- SDK 57 の blank テンプレートに `npx expo install` でパッケージを足すと、`react-dom@19.3.0` が optional peer として引かれて `react@19.2.3` と衝突し `npm install` が ERESOLVE で失敗する。`npx expo install react-dom` で 19.2.3 に固定すると通る(2026-10-13)。
- `@expo/vector-icons` は expo 本体に同梱されない。使うなら `npx expo install @expo/vector-icons` で足す。Tabs の `tabBarIcon` の `color` は `ColorValue` 型(string ではない)(2026-10-13)。
- Bash ツールでの `cd` は次の呼び出しに引き継がれず、作業フォルダが直前の呼び出しの場所に戻ることがある。ファイルを作るコマンドは絶対パスで書く(2026-10-13)。
