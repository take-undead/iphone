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

## スマホ(iPhone)とタブレット(iPad)の違いによる注意

Expo のアプリは 1 つのコードで iPhone と iPad の両方に入れられる(ユニバーサル)。違いが出るのは次の点。

**このリポジトリの方針: まず iPhone で形を作り、iPad は後でチューニングする。** 新しいアプリは `supportsTablet: false` で始め、iPad に対応するときに `true` に変えて以下の点を整える。

### 1. `app.json` の `ios.supportsTablet`

| 値 | iPad での動き | 使いどころ |
|---|---|---|
| `false` | iPhone 用の画面を iPad が拡大して表示する(互換モード)。Expo Go での開発中は影響しない | iPhone 専用のつもりで作るとき。`apps/vpsmon` はこれ |
| `true`(テンプレートの既定) | iPad の画面サイズそのままで動く。横向き・画面分割(Split View / Stage Manager)にも対応が要る | iPad でも使うとき。`apps/sample-app` はこれ |

- 新しいアプリを作ったら、まずこの値をどちらにするか決める。`true` のままにすると、EAS Build で作ったものを iPad に入れたとき横幅いっぱいに伸びた画面になる。
- `true` のときに縦向き固定(`"orientation": "portrait"`)にしたい場合は `ios.requireFullScreen: true` も入れる。Apple の規則では、iPad の画面分割に対応するアプリは全方向の回転に対応していなければならず、縦固定だけだとストア提出時に弾かれる(規則は Apple のドキュメントによる。実際の提出で未確認)。

### 2. 画面の作り方

- 幅は `useWindowDimensions()` で取り、固定の px で決めない。`apps/vpsmon` のチャートはこの方法(`width - 32`)。
- iPad は画面分割で**動作中に幅が変わる**。`Dimensions.get()` を 1 回読むだけの作りだと追従しないので `useWindowDimensions()` を使う。
- iPad では 1 行が長くなりすぎる。`supportsTablet: true` にするなら、カードの最大幅(例: 600px)を決めて中央に寄せるか、2 列にする。
- iPadOS 18 以降はタブバーが画面上部に出る。expo-router の `Tabs` は OS の標準に従うので、タブバーの位置を前提にした配置(下に重ねる帯など)は避ける。
- `Alert.alert` は iPad でも同じに出る。`ActionSheetIOS` は iPad では表示位置(anchor)の指定が要るので、使うなら iPad で確認する。

### 3. 開発・配布

- Expo Go は iPad にも入る。QR の読み取り・動作確認の手順は iPhone と同じ。
- EAS Build で作る `.ipa` は iPhone と iPad の両方に同じものを入れる(別々には作らない)。
- App Store に出すとき、`supportsTablet: true` なら iPad 用のスクリーンショットも App Store Connect に要る。
- `supportsTablet` を後から変えると「iPad 対応をやめる」方向の変更はストア審査で断られることがある。最初に決めておく。

## 新しいアプリを追加する

```powershell
cd apps
npx create-expo-app@latest <アプリ名>
```

生成後、`app.json` の `name` / `slug` / `scheme` と `package.json` の `name` をアプリ名に合わせる。
