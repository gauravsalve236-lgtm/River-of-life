const CACHE_NAME = 'river-of-life-cache-v115-OPPO-CHROME-FORCE-UNMUTED-AUDIO-VIDEO-FIX';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cache) => cache !== CACHE_NAME ? caches.delete(cache) : undefined)
    )).then(() => self.clients.claim())
  );
});

const MEETING_UI_PATCH = `
(function(){
  if (window.__ROL_MEETING_UI_V2__) return;
  window.__ROL_MEETING_UI_V2__ = true;
  const isMeeting = () => /#\\/meetings(?:[/?]|$)/i.test(location.hash);
  const textOf = (el) => ((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+(el.getAttribute('data-tooltip')||'')+' '+(el.textContent||'')).replace(/\\s+/g,' ').trim().toLowerCase();
  const actionOf = (el) => {
    const t=textOf(el);
    if(/raise hand|hand raised|\\bhand\\b/.test(t)) return 'hand';
    if(/chat|message/.test(t)) return 'chat';
    if(/participant|people|attendee/.test(t)) return 'participants';
    if(/setting|preferences/.test(t)) return 'settings';
    if(/screen share|share screen|present/.test(t)) return 'share';
    if(/microphone|\\bmic\\b|mute|unmute/.test(t)) return 'mic';
    if(/camera|video/.test(t)) return 'camera';
    if(/flip|switch camera|facing/.test(t)) return 'flip';
    if(/leave|end call|hang up|end meeting|end room/.test(t)) return 'end';
    if(/more|options|menu|\\.\\.\\.|three dot|kebab/.test(t)) return 'more';
    if(/timer|duration|elapsed|eye|viewer|picture.?in.?picture|pip|focus/.test(t)) return 'top-extra';
    return '';
  };
  const inTop = (el) => { const r=el.getBoundingClientRect(); return r.top < Math.max(180, innerHeight*.36); };
  const inBottom = (el) => { const r=el.getBoundingClientRect(); return r.bottom > innerHeight*.62; };
  const findAction = (action) => [...document.querySelectorAll('button,[role="button"],[aria-label]')].find(el => actionOf(el)===action && !el.closest('#rol-meeting-more-panel'));
  const hide = el => { if(el){el.style.setProperty('display','none','important');el.setAttribute('data-rol-hidden','meeting-ui');} };
  function apply(){
    if(!isMeeting()) return;
    [...document.querySelectorAll('button,[role="button"],[aria-label]')].forEach(el=>{
      const a=actionOf(el);
      if(!a) return;
      if(a==='top-extra' || (['mic','camera','settings'].includes(a) && inTop(el))) hide(el);
      if(['hand','chat','participants','settings'].includes(a) && inBottom(el)) hide(el);
    });
    let more=findAction('more');
    if(more && inTop(more)) hide(more);
    if(!more || !inBottom(more)) createMore();
    else more.setAttribute('data-rol-primary-more','1');
  }
  function createMore(){
    if(document.getElementById('rol-meeting-more-btn')) return;
    const btn=document.createElement('button');
    btn.id='rol-meeting-more-btn'; btn.type='button'; btn.setAttribute('aria-label','More meeting options'); btn.textContent='⋮';
    btn.style.cssText='position:fixed;right:92px;bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483000;width:52px;height:52px;border:0;border-radius:50%;background:rgba(20,27,38,.92);color:#fff;font-size:28px;line-height:1;box-shadow:0 8px 24px rgba(0,0,0,.25);';
    btn.onclick=()=>document.getElementById('rol-meeting-more-panel')?.classList.toggle('open');
    document.body.appendChild(btn);
    const panel=document.createElement('div'); panel.id='rol-meeting-more-panel';
    panel.innerHTML='<div class="rol-more-title">Meeting options</div>'+[['hand','Raise Hand'],['chat','Chat'],['participants','Participants'],['settings','Settings'],['share','Screen Share']].map(([a,l])=>'<button type="button" data-rol-action="'+a+'">'+l+'</button>').join('');
    panel.querySelectorAll('button[data-rol-action]').forEach(b=>b.onclick=()=>{const target=findAction(b.dataset.rolAction);if(target) target.click();panel.classList.remove('open');});
    document.body.appendChild(panel);
    const style=document.createElement('style');style.id='rol-meeting-ui-v2-style';style.textContent='#rol-meeting-more-panel{position:fixed;right:18px;bottom:82px;z-index:2147482999;width:min(280px,calc(100vw - 36px));padding:10px;border-radius:18px;background:rgba(20,27,38,.98);box-shadow:0 18px 50px rgba(0,0,0,.35);display:none;backdrop-filter:blur(16px)}#rol-meeting-more-panel.open{display:block}#rol-meeting-more-panel .rol-more-title{color:#aeb8c8;font:600 12px system-ui;padding:8px 10px;text-transform:uppercase;letter-spacing:.08em}#rol-meeting-more-panel button{display:block;width:100%;border:0;background:transparent;color:#fff;text-align:left;padding:13px 10px;border-radius:10px;font:500 15px system-ui}#rol-meeting-more-panel button:active{background:rgba(255,255,255,.1)}';document.head.appendChild(style);
  }
  const observer=new MutationObserver(apply); observer.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('hashchange',()=>setTimeout(apply,100)); addEventListener('resize',apply); setInterval(apply,1000); setTimeout(apply,300);
})();
`;

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(async (networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        let response = networkResponse;
        if (new URL(event.request.url).pathname.endsWith('/app.js')) {
          const source = await networkResponse.clone().text();
          if (!source.includes('__ROL_MEETING_UI_V2__')) {
            response = new Response(source + '\n' + MEETING_UI_PATCH, {
              status: networkResponse.status,
              statusText: networkResponse.statusText,
              headers: networkResponse.headers
            });
          }
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return response;
      }
      return networkResponse;
    }).catch(() => caches.match(event.request))
  );
});
