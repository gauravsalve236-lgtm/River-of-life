from pathlib import Path
import re

# Daily verse: keep only Download + Share.
for path in (Path('index.html'), Path('android-studio-app/app/src/main/assets/index.html')):
    if not path.exists():
        continue
    s = path.read_text(encoding='utf-8')
    s = re.sub(r'\s*<button class="home-vod-btn" id="home-vod-btn-read".*?</button>', '', s, count=1, flags=re.S)
    s = s.replace('Simple Icons Only: Read, Listen, Save, Share', 'Simple Icons Only: Download, Share')
    s = s.replace('Read, Listen, Save, Share', 'Download, Share')
    s = s.replace('v2341_IOS_JITSI_TOP_LEVEL_MIC_FIX', 'v2342_IN_APP_MIC_DAILY_VERSE_FIX')
    s = s.replace('165_MARATHI_VERSE_MIC_SAFARI_FIX', '167_IN_APP_MIC_DAILY_VERSE_FIX')
    marker = '<style id="rol-in-app-meeting-fix">#modal-ios-meeting-choice{display:none!important}</style>'
    if marker not in s:
        s = s.replace('</head>', marker + '</head>', 1)
    path.write_text(s, encoding='utf-8')

embedded = '''function proceedJoinMeetingInApp() {
  if (typeof closeModal === "function") closeModal("modal-ios-meeting-choice");
  else { const el = document.getElementById("modal-ios-meeting-choice"); if (el) el.style.display = "none"; }
  const m = _pendingMeetingToJoin || { id: "default", title: "Live Fellowship" };
  showToast("Joining Live Sanctuary 🙏");
  launchLiveMeetingRoom(m, null);
}
window.proceedJoinMeetingInApp = proceedJoinMeetingInApp;'''

mic_callback = '''api.on("videoConferenceJoined", function() {
  try {
    const jf = api.getIFrame && api.getIFrame();
    if (jf) {
      jf.setAttribute("allow", "camera; microphone; autoplay; fullscreen; display-capture");
      jf.setAttribute("allowfullscreen", "true");
    }
    const ensureMicOn = function() {
      api.isAudioMuted().then(function(muted) {
        if (muted) api.executeCommand("toggleAudio");
      }).catch(function() {});
    };
    ensureMicOn();
    setTimeout(ensureMicOn, 350);
    setTimeout(ensureMicOn, 1000);
    setTimeout(ensureMicOn, 2000);
  } catch (e) { console.warn("RoL microphone startup:", e); }
});'''

share_patch = r'''
/* RoL centered Daily Verse share patch */
(function(){
  function meta(){return {text:(document.getElementById('home-vod-text')||{}).textContent?.replace(/[“”]/g,'').trim()||'',ref:(document.getElementById('home-vod-ref')||{}).textContent?.trim()||'River of Life'};}
  async function makeImage(){
    const m=meta(), c=document.createElement('canvas'); c.width=c.height=1080; const x=c.getContext('2d');
    const card=document.getElementById('card-daily-verse-home'); let bg='';
    if(card){const z=getComputedStyle(card).backgroundImage.match(/url\(["']?(.*?)["']?\)/); if(z) bg=z[1];}
    try{if(bg){const i=await new Promise((ok,no)=>{const q=new Image();q.onload=()=>ok(q);q.onerror=no;q.src=new URL(bg,location.href).href});const sc=Math.max(1080/i.width,1080/i.height),w=i.width*sc,h=i.height*sc;x.drawImage(i,(1080-w)/2,(1080-h)/2,w,h)}else throw 0}catch(e){x.fillStyle='#18243a';x.fillRect(0,0,1080,1080)}
    x.fillStyle='rgba(0,0,0,.42)';x.fillRect(0,0,1080,1080);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='700 34px Georgia,serif';
    const words=m.text.split(/\s+/),lines=[],max=820,lh=54;let line='';words.forEach(w=>{const t=line?line+' '+w:w;if(x.measureText(t).width>max&&line){lines.push(line);line=w}else line=t});if(line)lines.push(line);
    const y=500-(lines.length-1)*lh/2;lines.forEach((l,i)=>x.fillText(l,540,y+i*lh));x.font='700 25px Arial,sans-serif';x.fillStyle='rgba(255,255,255,.92)';x.fillText(m.ref,540,Math.min(900,y+lines.length*lh+70));return {canvas:c,data:c.toDataURL('image/png'),meta:m};
  }
  window.saveExactDailyVerseImage=async function(){try{const r=await makeImage(),a=document.createElement('a');a.href=r.data;a.download='river-of-life-daily-verse.png';document.body.appendChild(a);a.click();a.remove()}catch(e){if(window.showToast)showToast('Unable to create verse image')}};
  window.shareDailyVerseToWhatsApp=async function(){try{const r=await makeImage(),b=await new Promise(ok=>r.canvas.toBlob(ok,'image/png')),f=new File([b],'river-of-life-daily-verse.png',{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]})))await navigator.share({files:[f],text:r.meta.text+'\n\n'+r.meta.ref});else window.open('https://wa.me/?text='+encodeURIComponent(r.meta.text+'\n\n'+r.meta.ref),'_blank')}catch(e){if(e?.name!=='AbortError'&&window.showToast)showToast('Sharing cancelled or unavailable')}};
})();
'''

for path in (Path('app.js'), Path('android-studio-app/app/build/intermediates/assets/debug/mergeDebugAssets/app.js')):
    if not path.exists():
        continue
    s = path.read_text(encoding='utf-8')
    s, _ = re.subn(r'function proceedJoinMeetingInApp\(\)\s*\{.*?\n\}\s*window\.proceedJoinMeetingInApp\s*=\s*proceedJoinMeetingInApp;', embedded, s, count=1, flags=re.S)
    s = re.sub(r'api\.on\("videoConferenceJoined", function\(\) \{', mic_callback, s, count=1)
    if 'RoL centered Daily Verse share patch' not in s:
        s += share_patch
    path.write_text(s, encoding='utf-8')

# Patch the iOS join flow after the original function has set its pending meeting.
patch = r'''
/* RoL: iOS stays inside the app; no Safari choice. */
(function(){
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(!ios||window.__rolInAppMeetingPatch)return; window.__rolInAppMeetingPatch=true;
  const original=window.triggerJoinMeetingFlow;
  if(typeof original==='function')window.triggerJoinMeetingFlow=function(id){original(id);setTimeout(()=>{try{proceedJoinMeetingInApp()}catch(e){}},0)};
  const hide=()=>{const e=document.getElementById('modal-ios-meeting-choice');if(e)e.style.display='none'};hide();new MutationObserver(hide).observe(document.documentElement,{childList:true,subtree:true});
})();
(function(){
  if(window.__rolJitsiMicPatch)return;window.__rolJitsiMicPatch=true;
  const allow=()=>document.querySelectorAll('iframe').forEach(f=>{if(/jitsi/i.test(f.src||'')){f.setAttribute('allow','camera; microphone; autoplay; fullscreen; display-capture');f.setAttribute('allowfullscreen','true')}});
  allow();new MutationObserver(allow).observe(document.documentElement,{childList:true,subtree:true});
})();
'''
# Place the iOS/iframe patch after app initialization code so all functions exist.
for path in (Path('app.js'), Path('android-studio-app/app/build/intermediates/assets/debug/mergeDebugAssets/app.js')):
    if path.exists():
        s=path.read_text(encoding='utf-8')
        if 'RoL: iOS stays inside the app' not in s:
            path.write_text(s+'\n'+patch,encoding='utf-8')
