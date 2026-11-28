export const hatchStyles = `
.egg-dialog{--glow:#fbebc1;--edge:#987d4f;--beam:.09;--aura:.29;--wave-opacity:.43;--hatch-time:1450ms;text-align:center;width:min(440px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:clamp(16px,5vw,30px);border:1px solid color-mix(in srgb,var(--glow) 48%,#29203e);border-radius:24px;background:radial-gradient(ellipse at 50% 46%,#29213e,#171322 72%);color:#fff8ec;box-shadow:0 16px 65px #080411ad;overflow:auto}
.egg-dialog::backdrop{background:#100b21d1}
.egg-dialog h2{margin-bottom:.6rem;color:#fff8ec}
.egg-dialog [data-hatch-result]{min-height:1.4em;margin:.8rem 0;font-weight:850;color:var(--hatch-name,#FFFFFF)}
.egg-purchase-options{display:flex;flex-wrap:wrap;gap:.5rem}
.egg-summary{padding:0;margin:.75rem 0;list-style:none;max-height:54vh;overflow:auto}
.egg-summary li{display:grid;grid-template-columns:36px 1fr auto;gap:.65rem;align-items:center;text-align:left;padding:.25rem .4rem}
.egg-summary li strong{color:var(--hatch-name,#FFFFFF)}
.egg-summary [data-rarity=rare]{--hatch-name:#3B82F6}
.egg-summary [data-rarity=epic]{--hatch-name:#A855F7}
.egg-summary [data-rarity=legendary]{--hatch-name:#EAB308}
.egg-rarity{display:inline-block;margin:0;padding:.28rem .77rem;border-radius:999px;border:1px solid var(--edge);color:var(--glow);background:#151023;font-weight:850;font-size:.77rem;letter-spacing:.08em;text-transform:uppercase}
.egg-rarity[hidden]{display:none}
.egg-dialog[data-rarity=rare]{--hatch-name:#3B82F6;--glow:#8edfff;--edge:#489cdb;--beam:.54;--aura:.57;--wave-opacity:.66}
.egg-dialog[data-rarity=epic]{--hatch-name:#A855F7;--glow:#eac0ff;--edge:#ac6ceb;--beam:.68;--aura:.68;--wave-opacity:.8}
.egg-dialog[data-rarity=legendary]{--hatch-name:#EAB308;--glow:#ffe391;--edge:#ffc752;--beam:.91;--aura:.91;--wave-opacity:.95;border-color:#ffd477;box-shadow:0 0 24px #ffbd57a0,0 0 90px #9f55ff63,0 19px 82px #070012c0}
.egg-stage{height:clamp(154px,36dvh,270px);position:relative;display:grid;place-items:center;border-radius:18px;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 50% 65%,#3c3159 0%,#211930 42%,#100b18 78%)}
.egg-aura,.egg-rays,.egg-waves,.egg-particles{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.egg-aura{inset:10%;background:radial-gradient(circle,var(--glow),transparent 62%);opacity:0;animation:egg-aura var(--hatch-time) both}
.egg-rays{inset:auto;width:min(350px,110%);aspect-ratio:1;background:repeating-conic-gradient(from 5deg,var(--glow) 0deg 7deg,transparent 12deg 29deg);mask-image:radial-gradient(black,transparent 69%);opacity:0;animation:egg-beams var(--hatch-time) both}
.egg-dialog[data-rarity=epic] .egg-rays{background:repeating-conic-gradient(from 5deg,#f2d5ff 0deg 9deg,transparent 14deg 24deg,#9c6bfa 28deg 34deg,transparent 40deg 48deg)}
.egg-dialog[data-rarity=legendary] .egg-rays{width:min(440px,130%);background:repeating-conic-gradient(from 5deg,#fff1ac 0deg 7deg,#ff9d50 9deg 11deg,transparent 14deg 22deg,#de9aff 26deg 31deg,transparent 35deg 45deg)}
.egg-waves i{grid-area:1/1;width:43%;aspect-ratio:1;border:2px solid var(--glow);border-radius:50%;opacity:0;transform:scale(.13);box-shadow:0 0 18px var(--glow),inset 0 0 10px var(--glow);animation:egg-wave var(--hatch-time) ease-out both}
.egg-waves i+i{width:54%;animation-delay:130ms;font-size:0}
.egg-dialog[data-rarity=common] .egg-waves i+i{display:none}
.egg-shell{position:relative;width:clamp(100px,33vw,145px);aspect-ratio:1;filter:drop-shadow(0 0 14px var(--glow));animation:egg-charge var(--hatch-time) both}
.egg-shell i{position:absolute;inset:0;background:url('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/egg.png') center 51%/300% no-repeat;image-rendering:pixelated}
.egg-shell i:first-child{clip-path:polygon(0 0,100% 0,100% 51%,68% 49%,57% 57%,43% 46%,30% 54%,0 48%);animation:egg-top var(--hatch-time) both}
.egg-shell i:nth-child(2){clip-path:polygon(0 48%,30% 54%,43% 46%,57% 57%,68% 49%,100% 51%,100% 100%,0 100%);animation:egg-bottom var(--hatch-time) both}
.egg-shell b{position:absolute;inset:0;background:var(--glow);clip-path:polygon(24% 51%,38% 48%,45% 52%,51% 47%,57% 55%,67% 49%,77% 51%,66% 52%,56% 59%,51% 51%,45% 55%,38% 50%);opacity:0;filter:drop-shadow(0 0 7px var(--glow));animation:egg-crack var(--hatch-time) both}
.egg-particles{z-index:1}
.egg-particles i{grid-area:1/1;width:var(--size);aspect-ratio:1;background:var(--glow);box-shadow:0 0 9px var(--glow);opacity:0;transform:rotate(45deg) scale(.15);animation:egg-particle var(--hatch-time) var(--delay) ease-out both}
.egg-dialog[data-rarity=legendary] .egg-particles i:nth-child(3n){background:#e4a5ff;box-shadow:0 0 11px #df9aff}
.egg-stage img{position:absolute;opacity:0;width:clamp(100px,34vw,148px);height:auto;image-rendering:pixelated;filter:drop-shadow(0 0 15px var(--glow))}
.egg-dialog.hatched .egg-stage img{opacity:1;animation:egg-reveal .52s cubic-bezier(.17,.76,.26,1) both}
.egg-dialog.hatched .egg-shell{visibility:hidden}
.egg-dialog.hatched .egg-aura{animation:egg-after .6s ease-out both}
@keyframes egg-charge{0%,18%{transform:translateY(7px)}31%{transform:translateY(-9px) rotate(-7deg)}42%{transform:translateY(1px) rotate(8deg)}55%{transform:translateY(-10px) rotate(-11deg)}65%{transform:translateY(-2px) rotate(9deg)}77%{transform:translateY(-11px) rotate(-7deg) scale(1.13)}to{transform:translateY(0) scale(1.09)}}
@keyframes egg-top{0%,53%{transform:none}75%{transform:translate(-4px,-7px) rotate(-4deg);opacity:1}to{transform:translate(-46px,-61px) rotate(-42deg);opacity:0}}
@keyframes egg-bottom{0%,57%{transform:none}76%{transform:translate(3px,5px) rotate(4deg);opacity:1}to{transform:translate(45px,54px) rotate(32deg);opacity:0}}
@keyframes egg-crack{0%,16%,100%{opacity:0}30%{opacity:.35}54%{opacity:.6}81%{opacity:1}}
@keyframes egg-beams{0%,30%{opacity:0;transform:scale(.3) rotate(-35deg)}76%{opacity:var(--beam)}to{opacity:calc(var(--beam)*.85);transform:scale(1.23) rotate(24deg)}}
@keyframes egg-aura{0%{opacity:0;transform:scale(.4)}62%{opacity:calc(var(--aura)*.7)}88%{opacity:var(--aura);transform:scale(1.38)}to{opacity:calc(var(--aura)*.62);transform:scale(1.07)}}
@keyframes egg-wave{0%,70%{opacity:0;transform:scale(.13)}76%{opacity:var(--wave-opacity)}to{opacity:0;transform:scale(1.8)}}
@keyframes egg-particle{0%,64%{opacity:0;transform:rotate(45deg) scale(.15)}77%{opacity:1}to{opacity:.2;transform:translate(var(--x),var(--y)) rotate(145deg) scale(.78)}}
@keyframes egg-reveal{0%{opacity:0;transform:translateY(11px) scale(.67)}69%{transform:translateY(-3px) scale(1.18)}to{opacity:1;transform:none}}
@keyframes egg-after{from{opacity:calc(var(--aura)*.62);transform:scale(1.07)}to{opacity:calc(var(--aura)*.43);transform:scale(.97)}}
@media(prefers-reduced-motion:reduce){.egg-dialog *{animation:none!important}.egg-dialog.hatched .egg-aura{opacity:calc(var(--aura)*.43)}.egg-dialog.hatched .egg-rays{opacity:calc(var(--beam)*.4)}}
.hatch-space-active{background:#0b0b22}
.hatch-space-active .egg-shell,.hatch-space-active .egg-aura,.hatch-space-active .egg-rays,.hatch-space-active .egg-waves,.hatch-space-active .egg-particles{display:none}
.hatch-space-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
.hatch-space-active img{position:relative;z-index:1;filter:drop-shadow(0 0 16px var(--glow))}
.egg-dialog.hatched .hatch-space-active img{animation:hatch-space-reveal .52s ease-out both}
@keyframes hatch-space-reveal{from{opacity:0;transform:scale(.78);filter:brightness(2.5) drop-shadow(0 0 14px var(--glow))}to{opacity:1;transform:scale(1)}}
.hatch-celebration{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:hidden;background:transparent;pointer-events:none}
.hatch-celebration i{position:absolute;top:-16px;width:var(--size);height:calc(var(--size) * 1.5);border-radius:1px;box-shadow:0 0 5px currentColor;animation:hatch-confetti-fall var(--fall) var(--delay) linear both}
.hatch-celebration i:nth-child(3n){border-radius:50%;height:var(--size)}
@keyframes hatch-confetti-fall{0%{opacity:0;transform:translate3d(0,0,0) rotate3d(1,1,.3,0deg)}9%,75%{opacity:.95}100%{opacity:0;transform:translate3d(var(--drift),106dvh,0) rotate3d(1,1,.3,680deg)}}

@media(prefers-reduced-motion:reduce){.hatch-celebration{display:none}}
`
