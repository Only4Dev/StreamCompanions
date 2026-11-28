import { hatchStyles } from '../ui/hatch-style.js'
export const portalStyles = ":root{color-scheme:light;--ink:#222840;--muted:#555e76;--paper:#fff9e9;--line:#29304a;--mint:#b6edc8;--shadow:4px 5px 0 var(--line);font:16px system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#eee8ff;background-image:radial-gradient(#cfc3eb 1px,transparent 1px);background-size:19px 19px}main{max-width:1040px;margin:auto;padding:24px clamp(16px,5vw,48px) 64px}.mast{display:flex;align-items:center;gap:10px;margin:0 0 30px;font-weight:850}.mark{display:grid;place-items:center;width:34px;height:34px;background:#ffcb78;border:2px solid var(--line);border-radius:11px;box-shadow:2px 2px 0 var(--line)}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(2.45rem,7vw,5rem);letter-spacing:-.07em;line-height:.99;margin-bottom:16px}h2{font-size:1.55rem;letter-spacing:-.035em}h3{font-size:1.08rem;margin-bottom:8px}.hero,.sheet{border:2px solid var(--line);border-radius:24px;box-shadow:var(--shadow);background:var(--paper);padding:clamp(22px,5vw,46px);margin-bottom:22px}.hero{display:grid;grid-template-columns:1.25fr .75fr;align-items:center;gap:18px;overflow:hidden}.hero p{max-width:34ch;font-size:1.08rem;line-height:1.55;color:var(--muted)}.art{position:relative;min-height:230px;display:grid;place-items:center;isolation:isolate}.art:before{content:\"\";position:absolute;width:220px;height:220px;border-radius:50%;background:#fbd682;z-index:-1}.mascot{position:relative;width:155px;height:122px;border:3px solid var(--line);background:#a4e6c1;border-radius:49% 52% 42% 46%;box-shadow:5px 7px 0 var(--line);transform:rotate(-7deg);display:grid;place-items:center;font-size:2rem;letter-spacing:.25em;padding-left:.25em}.mascot:before,.mascot:after{content:\"\";position:absolute;width:39px;height:55px;background:#a4e6c1;border:3px solid var(--line);border-radius:50% 50% 36% 36%;top:-37px;z-index:-1}.mascot:before{left:18px;transform:rotate(-23deg)}.mascot:after{right:18px;transform:rotate(23deg)}.stars{position:absolute;inset:0;display:flex;justify-content:space-around;align-items:center;font-size:2rem;color:#784aba;pointer-events:none}.stars span:first-child{transform:translateY(-48px)}.stars span:last-child{transform:translateY(57px)}a{color:#442493}button,.button{font:inherit;font-weight:760;border:2px solid var(--line);padding:10px 16px;border-radius:12px;display:inline-block;box-shadow:2px 3px 0 var(--line);color:var(--ink);background:var(--mint);text-decoration:none;cursor:pointer}.button.twitch{background:#6740aa;color:white}button:hover,.button:hover{filter:brightness(.94)}:focus-visible{outline:3px solid #7b4be2;outline-offset:4px}.sheet{padding:24px}.toolbar,.toolbar form{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.toolbar{justify-content:space-between;margin-bottom:20px}.toolbar h1{font-size:clamp(2rem,6vw,3.7rem);margin:0}.toolbar form{margin:0}select{font:inherit;background:white;color:var(--ink);border:2px solid var(--line);border-radius:10px;padding:8px 10px;max-width:100%}.items,.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;list-style:none;margin:0;padding:0}.items li,.cards li{border:2px solid var(--line);border-radius:16px;padding:14px;background:#fff}.items li{display:grid;gap:3px;background:#f4edff}.items strong{font-size:1.7rem}.cards li{background:#e8f7ee;display:grid;grid-template-columns:1fr auto;gap:6px 8px;align-items:center}.cards li.shiny{background:#ffefb9}.variant{color:var(--muted);font-size:.89rem;grid-column:1/-1}.level{font-size:.82rem;font-weight:800;border:1px solid var(--line);border-radius:20px;padding:3px 7px;white-space:nowrap}.meta{color:var(--muted);font-size:.9rem;margin:0}.empty{padding:16px;border:2px dashed #aa94cf;border-radius:14px}.logout button{background:white}@media(max-width:620px){.hero{grid-template-columns:1fr}.art{min-height:200px}.art:before{width:180px;height:180px}.sheet{padding:17px}.toolbar{align-items:flex-start}}"

export const dexStyles = `
.tabs{display:flex;gap:10px;margin:0 0 16px}.tabs a{border:2px solid var(--line);background:#fff;color:var(--ink);padding:8px 16px;border-radius:12px;text-decoration:none;font-weight:800}.tabs a[aria-current="page"]{background:var(--mint);box-shadow:2px 3px 0 var(--line)}
.dex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(115px,1fr));gap:12px;list-style:none;margin:0;padding:0}.slot{border:2px solid var(--line);border-radius:14px;background:#ccefd9;padding:8px;display:grid;justify-items:center;text-align:center;min-width:0;box-shadow:2px 3px 0 var(--line)}.slot.locked{background:#e3e2ea;border-color:#858598;box-shadow:none;color:#55576b}.slot.locked img{filter:grayscale(1);opacity:.55}.slot img{object-fit:contain;image-rendering:pixelated;max-width:100%}.dex-number{justify-self:start;font-size:.8rem;font-weight:800}.variants{display:grid;gap:3px;margin-top:6px;font-size:.78rem;justify-items:center}.shiny-tag{background:#fff0a3;color:#603920;border-radius:6px;padding:2px 4px;font-weight:800}
@media(max-width:450px){.dex-grid{grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}}
.community-list,.bag{display:grid;gap:10px;list-style:none;padding:0;margin:0}.community-list{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}.community-list .button{display:block}.album-actions{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.community-label{margin-bottom:15px}.generations{margin-bottom:18px}.generations a{padding:4px 12px;font-size:.9rem}.bag{max-width:380px;padding:12px;border:2px solid var(--line);border-radius:16px;background:#f2deb0}.bag-slot{display:flex;align-items:center;justify-content:space-between;min-height:57px;background:#fff9e9;border:2px solid #7b684a;border-radius:10px;padding:8px 16px}.bag-slot strong{font-size:1.2rem;font-variant-numeric:tabular-nums}.bag-icon{width:40px;height:40px;object-fit:contain}.bag-slot{display:grid;grid-template-columns:40px 1fr auto;gap:12px}.generations{flex-wrap:wrap}
`

export const providerStyles = `
.providers{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}.provider{display:inline-flex;align-items:center;gap:8px}.provider-icon{display:grid;place-items:center;min-width:25px;height:25px;border:1px solid currentColor;border-radius:6px;font-weight:900}.provider.kick{background:#53fc18;color:#172b15}.provider.unavailable{background:#e6e6e9;color:#555965;cursor:default}.provider small{font-size:.72rem}.hero .provider-hint{font-size:.9rem;margin-bottom:0}
`

export const languageStyles = `
.web-language{margin-left:auto;display:flex;gap:6px}.web-language a{padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:white;color:var(--ink);text-decoration:none}.web-language a[aria-current="true"]{background:var(--mint)}

.flag{position:relative;display:inline-block;width:20px;height:13px;vertical-align:-1px;border-radius:2px;box-shadow:0 0 0 1px #22284030;overflow:hidden}.flag-es{background:linear-gradient(#aa151b 25%,#f1bf00 25% 75%,#aa151b 75%)}.flag-us{background:repeating-linear-gradient(#b31942 0 1px,#fff 1px 2px)}.flag-us:before{content:"";position:absolute;top:0;left:0;width:8px;height:7px;background:#3c3b6e}
`

export const helpStyles = `
.family-forms{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 8px}.family-form{display:inline-block;border:1px solid var(--line);border-radius:9px;background:#f7f1ed;color:var(--ink);padding:6px 10px;text-decoration:none}.family-form[aria-current]{background:#c4ebcf;font-weight:800}.family-form.locked{opacity:.58}.dex-entry{display:grid;justify-items:center;text-decoration:none;color:inherit}
.summary-profile{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:24px}.summary-profile h1{font-size:clamp(2rem,5vw,3.4rem);margin-bottom:8px}.summary-profile p{margin-bottom:6px}.creature-summary fieldset{border:0;padding:0;margin:0 0 16px}.creature-summary legend{margin-bottom:10px;color:var(--muted)}.move-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:8px}.move-options label{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:9px;background:#f9efda}.move-options input{accent-color:#437358}.variants a{color:inherit;text-underline-offset:.22em}
.overview-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:12px;margin:0}.overview-stats>div{border:2px solid var(--line);border-radius:14px;background:#f1e9ff;padding:14px 16px}.overview-stats dt{font-weight:750;color:var(--muted)}.overview-stats dd{margin:8px 0 0;font-size:clamp(1.35rem,3vw,2rem);font-weight:850}
.help-title{font-size:clamp(2.5rem,6vw,4rem);margin-top:22px}.help-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;list-style:none;padding:0;margin:20px 0}.help-steps li{background:#cbefda;border:2px solid var(--line);border-radius:18px;padding:16px;box-shadow:2px 3px 0 var(--line)}.help-steps li:nth-child(even){background:#ffedbe}.help-steps p,.command-sheet p{line-height:1.48;color:var(--muted);margin:0}.help-note{background:#f9f2ff;border-left:4px solid #8355bf;padding:12px 16px;margin:24px 0;line-height:1.5}.help-commands{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:14px}.command-sheet{margin:0}.command-sheet ul{list-style:none;margin:0;padding:0;display:grid;gap:14px}.command-sheet li+li{border-top:1px dashed #b6a5c8;padding-top:12px}.command-sheet code{display:inline-block;font-size:.84rem;background:#eae2ff;border-radius:6px;padding:3px 6px;margin:0 4px 5px 0;overflow-wrap:anywhere}.web-language{flex-wrap:wrap;justify-content:flex-end}
`
export const liveReactionStyles = `
.live-reaction { min-block-size: 2.65rem; display: grid; align-items: start; justify-items: center; }
.live-reaction-badge { --feedback: #7554ba; display: inline-flex; align-items: center; gap: .6rem; border: 1px solid var(--feedback); border-radius: 10px; padding: .3rem .7rem; background: var(--paper); color: var(--ink); font-size: .9rem; font-weight: 750; max-width: 100%; }
.live-reaction-badge[data-effect=catch],.live-reaction-badge[data-effect=success] { --feedback: #2c9a70; }
.live-reaction-badge[data-effect=miss],.live-reaction-badge[data-effect=warning] { --feedback: #bf6b45; }
.live-reaction-symbol { font-size: 1.15rem; line-height: 1; }
.live-reaction-ball { position: relative; flex: 0 0 22px; width: 22px; height: 22px; border: 2px solid #262135; border-radius: 50%; background: linear-gradient(#ef535f 0 42%,#262135 42% 58%,#fff 58%); }
.live-reaction-ball::before { content: ''; position: absolute; inset: 6px; border: 1px solid #262135; border-radius: 50%; background: white; }
[data-effect=catch] .live-reaction-ball { animation: live-ball-pop .48s ease-out both; }
[data-effect=catch] .live-reaction-ball::after { content: '✦'; color: #ffcb69; position: absolute; inset: 0; text-align: center; text-shadow: -14px 2px #b997ff, 10px -8px #f6bd62, 7px 12px #b997ff; animation: live-ball-spark .95s ease-out both; }
[data-effect=miss] .live-reaction-ball { animation: live-ball-miss .55s ease-out both; }
.live-game-status[data-feedback] { border-inline-start: 4px solid #bf6b45; padding: .55rem .65rem; background: var(--paper); font-weight: 750; }
.live-game-status[data-feedback=catch],.live-game-status[data-feedback=success] { border-color: #2c9a70; }
@media (max-width: 700px), (max-width: 1100px) and (orientation: portrait) {
  .live-reaction { position: fixed; inset: 0; z-index: 20; place-items: center; padding: 1rem; pointer-events: none; }
  .live-reaction-badge { padding: .7rem .9rem; text-align: center; box-shadow: 0 6px 24px #0006; animation: live-feedback-fade 4.2s ease both; }
}
@keyframes live-feedback-fade { 0%,100% { opacity: 0; } 8%,86% { opacity: 1; } }
@keyframes live-ball-pop { from { transform: scale(.65) rotate(-25deg); } 65% { transform: scale(1.26) rotate(8deg); } to { transform: none; } }
@keyframes live-ball-spark { from { opacity: 0; transform: scale(.6); } 25% { opacity: 1; } to { opacity: 0; transform: scale(1.65); } }
@keyframes live-ball-miss { 20%,60% { transform: translateX(-3px) rotate(-14deg); } 40%,80% { transform: translateX(3px) rotate(14deg); } }
@media (prefers-reduced-motion: reduce) { .live-reaction-badge,.live-reaction-ball,.live-reaction-ball::after { animation: none !important; } [data-effect=catch] .live-reaction-ball::after { opacity: 1; } }
`

export const mobileStyles = `
.live-mobile-channel { display: none; }

@media (max-width: 700px), (max-width: 1100px) and (orientation: portrait) {
  main, main:has(.live-layout) {
    padding: 14px max(12px, env(safe-area-inset-right)) max(28px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  }
  .mast { flex-wrap: wrap; margin-bottom: 14px; }
  .mast .web-language { width: 100%; margin: 0; justify-content: flex-start; }
  .web-language a { min-height: 36px; display: inline-flex; align-items: center; }
  .sheet, .hero { padding: clamp(12px, 3vw, 22px); margin-bottom: 14px; border-radius: 16px; }
  .toolbar { gap: .65rem; margin-bottom: 12px; }
  .toolbar h1 { font-size: clamp(1.85rem, 7vw, 3.1rem); }
  .album-actions { gap: .5rem; }
  .tabs { flex-wrap: wrap; gap: .4rem; }
  .tabs a, .live-platforms span[aria-disabled] { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
  .community-tabs { gap: .4rem; margin-bottom: .85rem; }
  .community-tabs a { flex: 1 0 auto; white-space: nowrap; padding: .4rem .6rem; font-size: .88rem; }
  .generations a { padding: .35rem .55rem; min-height: 40px; }
  .live-layout { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .live-layout .live-watch { position: static; padding: clamp(12px, 3vw, 22px); }
  .live-watch h1 { font-size: clamp(1.65rem, 6vw, 3rem); letter-spacing: -.045em; margin-bottom: .8rem; }
  .live-platforms > *, .live-sections > * { flex: 1 1 0; text-align: center; }
  .live-player { container-type: inline-size; width: 100%; }
  .live-player iframe { width: 100%; }
  .live-mobile-channel { display: inline-flex; align-items: center; min-height: 44px; margin-top: .25rem; }
  .live-layout #play-web { padding: clamp(12px, 3vw, 22px); }
  .live-game-card select, .live-game-card button { min-height: 44px; }
  .live-game-card form button { justify-self: stretch; }
  .live-companion { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; }
  .live-companion select { width: 100%; }
  .live-ball { min-height: 56px; }
  .live-game-status:not(:empty) { margin: .5rem 0 .85rem; }
  .shop-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 138px), 1fr)); }
  .shop-grid li { min-width: 0; }
  .shop-grid button, .shop-quantity input { min-height: 44px; }
  .shop-quantity input { width: 4rem; font-size: 16px; }
  .dex-heading { flex-wrap: wrap; }
  .bag { width: 100%; }
}
@supports (zoom: calc(100px / 100px)) {
  @container (max-width: 533px) {
    .live-player iframe { width: 534px; height: 300px; zoom: calc(100cqw / 534px); }
  }
}
`

export const darkStyles = `
.danger-action{color:#b12242;text-decoration:underline}[data-theme=dark] .danger-action{color:#ff9bb0}
.account-card{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;border:2px solid var(--line);border-radius:12px}
.account-handle{padding:5px 10px;border-radius:8px;background:var(--mint);font-weight:750;overflow-wrap:anywhere}
.summary-meta,.move-title{display:flex;align-items:center;gap:7px}.type-icon{flex:none;object-fit:contain}
.xp-track{width:min(100%,350px);margin-top:14px}.xp-track label{display:flex;justify-content:space-between;gap:12px;font-size:.88rem}
.xp-track progress{width:100%;height:12px;accent-color:#23a998}.xp-track progress::-webkit-progress-bar{background:#9a91ae44;border-radius:12px}.xp-track progress::-webkit-progress-value{background:#2cbaa6;border-radius:12px}
.battle-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(64px,1fr));gap:8px;margin:0 0 24px}.battle-stats div{border:1px solid var(--line);border-radius:10px;padding:8px;text-align:center}.battle-stats dt{font-size:.8rem;color:var(--muted)}.battle-stats dd{margin:3px 0 0;font-weight:850}
.move-options .move-card{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:4px 8px;padding:11px;align-content:start;cursor:pointer}.move-card input{margin:0;align-self:center}.move-card small{grid-column:2 / -1;color:var(--muted)}
.move-options .move-card:has(input:checked){background:#d0efdf;border-color:#458362}.moveset-form button:disabled{background:var(--paper);color:var(--muted);box-shadow:none;cursor:not-allowed;opacity:.62}.move-limits{grid-column:3;grid-row:1;justify-self:end;white-space:nowrap;color:var(--muted);font-size:.8rem}.section-with-help{display:flex;align-items:center;gap:.5rem}.portal-hint{position:relative;display:inline-block}.portal-hint summary{display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid var(--line);border-radius:50%;font-size:.8rem;font-weight:700;cursor:pointer;list-style:none}.portal-hint summary::-webkit-details-marker{display:none}.portal-hint p{position:absolute;z-index:3;right:0;width:min(15rem,70vw);padding:.6rem;margin:.4rem 0;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-radius:.5rem;box-shadow:0 3px 8px #0004}.move-card:has(input:disabled){opacity:.62;cursor:default}
.tabs.pockets{flex-wrap:wrap}.variants a.shiny-tag{color:#4f2d16}
.summary-profile{align-items:flex-start}.summary-equipment{margin-left:auto}.summary-equipment .held-frame{display:grid;justify-items:center;min-width:110px;min-height:92px;text-align:center;margin:0}
.move-options{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr}.move-options>.move-card{min-height:94px;border:1px solid var(--line);border-radius:8px}.move-options>.move-locked{filter:grayscale(1);opacity:.67;cursor:default}.move-card:not(:has(input)) .move-title{grid-column:2}.ultimate-slot select{max-width:100%}
@media(max-width:480px){.move-options{grid-template-columns:1fr}.summary-equipment{margin-left:0}}
.held-frame{width:fit-content;display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:0 0 23px;padding:9px 13px;border:1px solid var(--line);border-radius:10px}.held-frame span{color:var(--muted)}
.held-picker{max-width:min(480px,90vw);max-height:75vh;background:var(--paper);color:var(--ink);border:2px solid var(--line);border-radius:16px;padding:18px}.held-picker::backdrop{background:#150f2580}.held-picker form,.held-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:10px}.held-grid{list-style:none;margin:0;padding:0}.held-grid li,.held-picker button{display:grid;justify-items:center;align-content:center;text-align:center;min-height:70px;border:1px solid var(--line);border-radius:10px;padding:8px}.live-layout{display:grid;gap:1rem;align-items:start}.live-layout>.sheet{min-width:0}.live-layout .live-game-grid{grid-template-columns:1fr}.live-layout #play-web{padding:18px}.live-layout .live-game-card{padding:.75rem}main:has(.live-layout){max-width:1460px}@media(min-width:980px){.live-layout{grid-template-columns:minmax(0,1fr) minmax(330px,390px)}.live-layout .live-watch{position:sticky;top:1rem}}.community-tabs,.shop-sections{flex-wrap:wrap}.community-tabs a,.shop-sections a{padding:.45rem .65rem}.live-activity{margin-top:1rem}.live-activity ol{max-height:12rem;overflow:auto;padding-left:1.25rem}.live-activity li{margin:.35rem 0;overflow-wrap:anywhere}@media(max-width:600px){.mast{flex-wrap:wrap}.mast .web-language{width:100%;margin-left:0;justify-content:flex-start}.live-layout #play-web,.live-layout .live-watch{padding:.75rem} .sheet .shop-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,135px),1fr))}.community-tabs{gap:.4rem}}.live-platforms,.live-sections{flex-wrap:wrap}.live-platforms span[aria-disabled]{padding:8px 16px;color:var(--muted);border:1px solid var(--line);border-radius:12px}.live-player{overflow:auto;border-radius:12px;background:#111}.live-player iframe{display:block;width:100%;min-width:534px;min-height:300px;height:auto;aspect-ratio:16/9;border:0}.live-communities{margin-top:1rem}.live-game-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:1rem}.live-game-card{border:1px solid var(--line);border-radius:12px;padding:1rem}.live-game-card form{display:grid;gap:.65rem;align-content:start}.live-game-card form button{justify-self:start}.live-game-card button:disabled{opacity:.55;cursor:not-allowed}.live-game-card label{display:grid;gap:.35rem}.live-game-status:empty{display:none}.live-balls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem;border:0;margin:.5rem 0;padding:0}.live-balls legend{margin-bottom:.5rem}.live-balls .live-ball{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.2rem .35rem;padding:.45rem;border:1px solid var(--line);border-radius:8px;cursor:pointer}.live-ball img{width:24px;height:24px}.live-ball span{grid-column:1/-1;font-size:.85rem}.live-ball:has(input:checked){outline:2px solid #299d79;outline-offset:-2px}.live-ball:has(input:disabled){opacity:.55}.live-companion{display:flex;align-items:end;flex-wrap:wrap;gap:.65rem}.live-secondary{background:var(--paper)}.live-candy{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line)}.live-candy input{width:5rem}.announcement-feed{display:grid;gap:.45rem;max-height:13rem;overflow:auto;padding:0;list-style:none;margin:0}.announcement-feed li{border-bottom:1px solid var(--line);padding:.5rem 0;overflow-wrap:anywhere}.shop-grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}.shop-grid li{align-content:start;gap:.25rem;padding:12px}.shop-grid form{display:grid;gap:.5rem;width:100%;margin-top:auto}.shop-quantity{display:grid;gap:.4rem;text-align:left}.shop-quantity label,.shop-quantity>span{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.shop-quantity input{width:4.5rem;box-sizing:border-box;padding:.3rem;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:.4rem}.shop-count{font-size:.85rem;color:var(--muted)}[data-shop-buy] button:disabled{opacity:.55;cursor:not-allowed}.dex-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.75rem}.dex-heading h2{margin:0}.dex-new{position:absolute;z-index:1;top:-.4rem;right:.35rem;background:#fff0a3;color:#33204e;border:1px solid #7c4a16;border-radius:999px;padding:.15rem .4rem;font-size:.67rem;font-weight:900;box-shadow:0 0 12px #ffc452;animation:dex-new-glow 1.4s ease-in-out infinite alternate}.dex-new[hidden]{display:none}.dex-grid .slot:has(.dex-new){position:relative}@keyframes dex-new-glow{to{box-shadow:0 0 18px 3px #ffb840}}@media(prefers-reduced-motion:reduce){.dex-new{animation:none}}.held-picker .chosen{outline:2px solid #299d79;outline-offset:-3px}
.bag-icon{width:30px;height:30px;justify-self:center}
.shop-grid .egg-shop-icon{width:75px;height:75px}
.description-hint{display:grid;max-width:100%;min-width:0;justify-items:center}
button.description-trigger{background:none;box-shadow:none;border:0;padding:0;color:inherit;display:inline-grid;justify-items:center}
.training{margin:1rem 0;padding:.75rem;border:1px solid var(--line);border-radius:12px}.training-actions{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}.training ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));list-style:none;padding:0;gap:.35rem}.training button{padding:.25rem .55rem}.training button:disabled,.training input:disabled{opacity:.45;cursor:not-allowed}.training [data-training-feedback]:empty{display:none}.training li{display:grid;gap:.35rem;justify-items:start;padding:.4rem}.training fieldset{min-width:0;border:0;padding:0;margin:0}.training input[type=number]{width:4rem}.training [data-step]{min-width:2rem}
.summary-abilities{margin:.5rem 0;min-width:0}
.summary-abilities p{margin:.2rem 0 0;color:var(--muted);font-size:.85rem;overflow-wrap:anywhere}
button.description-trigger{cursor:pointer}
button.description-trigger[aria-expanded=true]{outline:2px solid var(--line);outline-offset:3px;border-radius:.3rem}
.description-slot:not([hidden]){display:block;margin-top:.4rem;font-size:.8rem;color:var(--muted);overflow-wrap:anywhere}
.bag-slot:has(.description-slot:not([hidden])) .description-hint{display:contents}
.bag-slot .description-slot:not([hidden]){grid-column:1/-1;grid-row:2}
.bag-slot:has(.description-hint){grid-template-columns:minmax(0,1fr) auto}.bag-slot .description-hint{justify-items:start}.bag-slot button.description-trigger{grid-template-columns:40px minmax(0,1fr);align-items:center;gap:.6rem;text-align:left;justify-items:start}
.held-choice{display:grid;grid-template-columns:1fr auto;gap:.5rem;align-items:center}
.dex-ability{font-size:.74rem;color:var(--muted);overflow-wrap:anywhere}
.team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:.8rem;margin:1rem 0}
.team-card{min-width:0;display:grid;gap:.7rem;padding:.75rem;border:1px solid var(--line);border-radius:14px}
.team-card details{min-width:0}.team-card summary{cursor:pointer}.team-card [data-team-moves] .move-options{grid-template-columns:1fr}.team-portrait{display:grid;place-items:center;height:112px;border-radius:10px;background:color-mix(in srgb,var(--mint) 20%,var(--paper));text-align:center;padding:.4rem;font-size:.85rem;color:var(--muted)}
.team-portrait img{object-fit:contain;image-rendering:pixelated}
.team-card label{display:grid;gap:.35rem;font-weight:700}
.team-card select{width:100%}
.capture-heading{display:grid;grid-template-columns:minmax(0,1fr) 78px;gap:.75rem;align-items:center;margin-bottom:.55rem}
.capture-portrait-frame{display:grid;place-items:center;width:78px;height:78px;border:1px solid var(--line);border-radius:12px;background:var(--paper)}
[data-encounter-portrait]:not([hidden]){display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
[data-theme=dark]{color-scheme:dark;--ink:#f3eefb;--muted:#c5bfd7;--paper:#262238;--line:#50486b;--mint:#234b3f;--shadow:4px 5px 0 #0c0a14}
[data-theme=dark] body{background-color:#171424;background-image:radial-gradient(#37304b 1px,transparent 1px)}
[data-theme=dark] a{color:#dbc9ff}
[data-theme=dark] .mark,[data-theme=dark] .mascot{color:#242136}
[data-theme=dark] button,[data-theme=dark] .button:not(.kick),[data-theme=dark] .tabs a,[data-theme=dark] .web-language a,[data-theme=dark] select{color:var(--ink)}
[data-theme=dark] .tabs a,[data-theme=dark] .web-language a,[data-theme=dark] select,[data-theme=dark] .logout button{background:#302b44}
[data-theme=dark] .tabs a[aria-current=page],[data-theme=dark] .web-language a[aria-current=true],[data-theme=dark] .slot,[data-theme=dark] .help-steps li,[data-theme=dark] .family-form[aria-current]{background:#24483e;color:#f3eefb}
[data-theme=dark] .slot.locked{background:#302c40;color:#c5bfd7;border-color:#524c64}
[data-theme=dark] .overview-stats>div,[data-theme=dark] .help-note,[data-theme=dark] .family-form,[data-theme=dark] .command-sheet code{background:#342c4d;color:var(--ink)}
[data-theme=dark] .bag{background:#393040}
[data-theme=dark] .bag-slot,[data-theme=dark] .move-options label,[data-theme=dark] .help-steps li:nth-child(even){background:#443748;border-color:var(--line)}
[data-theme=dark] .move-options .move-card:has(input:checked){background:#24483e;border-color:#63b58d}
[data-theme=dark] .variants a.shiny-tag{color:#2d1e08;background:#ffe590}
.live-item-count{display:flex;align-items:center;gap:.45rem}.admin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:1rem;margin:1rem 0}.admin-command,.admin-command label{display:grid;gap:.4rem}.admin-command{margin:0 0 1rem}.admin-command input,.admin-command select{font:inherit;min-width:0;max-width:100%;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:.45rem;padding:.4rem}.admin-command button{justify-self:start}
${hatchStyles}
.dex-search{margin-bottom:.75rem}.dex-search label{display:grid;gap:.35rem;max-width:32rem}.dex-search input{width:100%;box-sizing:border-box;padding:.55rem .7rem;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:.6rem}.dex-search-status:empty{display:none}
.move-support{display:inline-flex;width:fit-content;padding:.1rem .4rem;border:1px solid #48a589;border-radius:.45rem;color:var(--ink);font-weight:750}
.wiki-filters{display:flex;flex-wrap:wrap;gap:.75rem;align-items:end;margin:1rem 0}
.wiki-filters label{display:grid;gap:.25rem}.wiki-filters input,.wiki-filters select{min-height:2.2rem;padding:.35rem .5rem;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:.45rem}
.wiki-move{border-bottom:1px solid var(--line);padding:.7rem 0}.wiki-move summary{cursor:pointer}.wiki-move summary span{margin-left:.75rem;color:var(--muted);font-size:.9rem}
.wiki-move-stats{display:flex;flex-wrap:wrap;gap:.6rem 1rem}.wiki-move-stats dt{color:var(--muted)}.wiki-move-stats dd{margin:0;font-weight:750}

`
