# BANG BUMPERS（仮: tagteam-wreck）進み具合

車2人1組×5チームの撃ち合い・ぶつけ合い。CPU 版。通信は後で足す（sim.js は THREE にも DOM にも依存しない）。

## 2026-11-24
- 読んだ: game-rules / bakage / ship / anti-ai-tells / game-ship-checklist。WRECK ISLE は島前提の作りで重いので、動きと壊れ方の考え方だけ参考に、アリーナ専用に新しく書く。three・音・sfx.js は流用
- 音の素材を snd/ に入れた（WRECK ISLE の衝突・爆発・エンジン、ほか pop・shot・spring・paper・splash・BGM）
- 設計: js/arena.js（形と高さ）・js/sim.js（試合の状態と1ステップ。THREE/DOM なし）・js/cpu.js（CPU。人の入力と混ぜる makeInputs）・js/stage.js（絵）・js/main.js（入力・HUD・音）。入力は チームごとに {throttle, steer, boost, aim, fire, reload, use, swap, walkX, walkZ}（通信を足す時は sim.step をサーバーで回して events を配るだけ）
- 名前: BANG BUMPERS（バンバンバンパーズ）。公開予定 slug は bang-bumpers
- 動いた: 5チーム×2人・3台ストック・すり鉢・坂・上の通路・柱と箱・5種の拾い物・歩き→空き車で復活・役交代（止まって3秒）
- 調整: CPU だけの試合 tools/hsim.mjs で平均 約170秒（ダメージ係数 bullet 0.38・ram 0.5）。ブラウザ描画の呼び出し数は静的物を焼き込んで 745→約300（影込み）
- 検査: tools/verify.mjs（キーとタッチ・CPU 戦・サイズ別の重なり）、tools/shot.mjs（撮る）、tools/q.mjs（中身を調べる）
- 公開: https://tom3games.github.io/bang-bumpers/?v=1 （Pages built・og.png 200・音 200）。検査: Chromium は 起動・サイズ3種・PC運転/役交代/射手・スマホ運転〜歩き〜乗り直し・スマホ射手・CPU戦(seed21/23 決着)・英語 が通る、WebKit は同じ一式（CDP タッチ除く）が通る。iOS シミュレーターの Safari で CPU 戦の通し描画（爆発・HUD）を確認
- 次: オンライン化（sim.step をサーバーで回して events と状態差分を配る）
