# vpsmon（VPS Monitor）

PicoCalc の `mt5mon`（MT5 の状況・AI 日報・攻撃の記録）と `vpschat`（VPS の Claude との会話）を 1 つにまとめた iPhone 版。
元は `D:\github\picoclac\apps\net\`（C 言語）。読むだけで売買はしない。例外は攻撃の画面の永久ブロック・解除。

## 画面

| タブ | 元 | 内容 |
|---|---|---|
| 相場 | mt5mon メイン | bid/ask・状態（LIVE / STALE / MT5切断 / 停止 / 取得失敗）・ローソク足（M1/M5/M15、キリ値・現在値・建値）・口座・建玉／EA の一覧・急な値動きのチャイム |
| AI 日報 | mt5mon の N | 監督の判断の要約（/sup.json、60 秒ごと）と日報の全文（/nippo.md、5 分ごと） |
| 攻撃 | mt5mon の B | 見張りごとの数・上位 IP・永久ブロック・記録・国別（/f2b.json 30 秒ごと、/stats.json）。行を押して永久ブロック／解除（確認あり） |
| 会話 | vpschat | VPS の Claude（読むだけ）と話す。考え中は 3 秒・普段は 15 秒ごとに /chat.json |
| 設定 | | 接続先 URL・見本モード・取得間隔・チャイム（幅 pips・時間 分・音量） |

日本語入力は iPhone のキーボードに任せるので、PicoCalc の IME（ローマ字変換・辞書）は持ち込まない。

## 通信

VPS の `status_server.py`（`http://10.8.0.1:8080`）は WireGuard の内側でしか待ち受けていない。
iPhone の **WireGuard アプリ**でトンネルを ON にしてからこのアプリを使う。鍵は PicoCalc と同じ（10.8.0.3）で、PicoCalc とは同時につながない。

iPhone 用の設定と QR コードは PC で作る（`local\` は git 管理外）:

```powershell
python -m pip install qrcode
python local\make_wg_qr.py
```

`local\iphone-wg-qr.png` を WireGuard アプリの「QR コードから作成」で読み取る。

## 動かす

```powershell
cd apps\vpsmon
npm install
npm start
```

iPhone の Expo Go で QR を読む(カメラアプリで読むと Expo Go が開く)。VPN が無くても「設定 → 見本データで動かす」で画面は確かめられる。

`npm start` は**トンネル方式**(`expo start --tunnel`)。PC と iPhone が別の Wi-Fi でも、PC に LAN が複数あってもつながる。
PC の LAN が 1 本で同じ Wi-Fi なら `npm run start:lan` の方が速い。

## 作り

- `src/app/` … 画面（expo-router。`(tabs)/` に 5 つのタブ）
- `src/lib/api.ts` … HTTP（8 秒で時間切れ）。`demo.ts` は見本データ
- `src/lib/bars.ts` … 足の組み立て（M5・M15 は VPS の /bars.json を土台に、直近 2 時間を status の M1 で上書き）
- `src/lib/health.ts` … 止まり方 3 通りの見分け（stale / gen_jst が 20 秒進まない / 取得失敗）
- `src/lib/alert.ts` … 急な値動きの検知。`sound.ts` … チャイム（`assets/sounds/*.wav` は Python で作った A5→E6 の 2 音）
- `src/components/CandleChart.tsx` … ローソク足（react-native-svg）
- `src/fixtures/` … 見本データ（実データではなく形だけ合わせた作り物）
