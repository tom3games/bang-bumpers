// なまえの入力（オンラインで参加する時に使う）。長さの上限・使えない言葉の判定・置き換え。DOM に依存しない
import { BANNED } from './banned.js?v=16'
export const NAME_MAX = 8                 // 全角で数えて8字まで
export const FALLBACKS = ['ななしのドライバー', 'ななしのガンナー', 'とおりすがり', 'ななしさん']
// 寄せる: 全角半角・大文字小文字・カタカナをひらがなへ・空白と記号を取る・伸ばす棒を取る
export function normalize(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[ー〜~\-_.,!?！？、。・:;'"`^|\\/*+=<>()\[\]{}\s　]/g, '')
}
const NORMALIZED = BANNED.map(normalize).filter(Boolean)
export function isBanned(name) { const n = normalize(name); return NORMALIZED.some(b => n.includes(b)) }
// 入力を整える。長すぎれば切る・使えない言葉なら置き換える
export function cleanName(raw, fallbackIndex = 0) {
  let s = String(raw ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g, '').trim()
  s = [...s].slice(0, NAME_MAX).join('')
  if (!s || isBanned(s)) return FALLBACKS[fallbackIndex % FALLBACKS.length]
  return s
}
// CPU の車の名前（画面に出す）
export const CPU_NAMES = ['タイヤ兄弟', 'ごりら組', 'ネジ屋', 'ぴよ運送', 'ねこ車', 'さくら便', 'ドンドコ組', 'ボルト工業', 'ぶんぶん号', 'かみなり屋']
export function cpuNames(rng, n = 4) { const a = [...CPU_NAMES], out = []; while (out.length < n) out.push(a.splice((rng() * a.length) | 0, 1)[0]); return out }
