# iphone

iPhone アプリをまとめて管理するリポジトリ。アプリごとに `apps/<アプリ名>/` に独立した Expo(React Native)プロジェクトを置く。

## 構成

```
apps/
  sample-app/   # テンプレートから生成した最初のアプリ(expo-router のタブ構成)。動作確認用
  vpsmon/       # VPS Monitor: PicoCalc の mt5mon + vpschat を 1 つにまとめた iPhone 版(詳細は apps/vpsmon/README.md)
local/          # 鍵など機密(git 管理外)。local/make_wg_qr.py で iPhone 用 WireGuard の QR を作る
```

各アプリは独立しており、依存パッケージもアプリごとに `npm install` する。

## 開発環境(Windows)

Windows には Xcode がないため、以下の流れで開発する。

1. iPhone に App Store から **Expo Go** を入れる
2. PC と iPhone を同じ Wi-Fi につなぐ
3. アプリのフォルダで起動する

```powershell
cd apps\vpsmon
npm install
npx expo start
```

4. 表示された QR コードを iPhone のカメラで読み取ると Expo Go で開く

App Store 配布用のビルドは `eas build --platform ios`(EAS Build、クラウド)で Mac なしに作れる。Apple Developer Program への加入が必要。

## 新しいアプリを追加する

```powershell
cd apps
npx create-expo-app@latest <アプリ名>
```

生成後、`app.json` の `name` / `slug` / `scheme` と `package.json` の `name` をアプリ名に合わせる。
