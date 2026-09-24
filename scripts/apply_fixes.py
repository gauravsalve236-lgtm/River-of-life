from pathlib import Path
import re

for path in (Path('index.html'), Path('android-studio-app/app/src/main/assets/index.html')):
    if not path.exists(): continue
    s=path.read_text(encoding='utf-8')
    s=re.sub(r'\s*<button class="home-vod-btn" id="home-vod-btn-read".*?</button>','',s,count=1,flags=re.S)
    s=s.replace('Simple Icons Only: Read, Listen, Save, Share','Simple Icons Only: Download, Share').replace('Read, Listen, Save, Share','Download, Share')
    s=s.replace('v2341_IOS_JITSI_TOP_LEVEL_MIC_FIX','v2342_IN_APP_MIC_DAILY_VERSE_FIX').replace('v2342_IN_APP_MIC_DAILY_VERSE_FIX','v2343_IN_APP_MIC_DAILY_VERSE_FIX')
    s=s.replace('166_IOS_JITSI_TOP_LEVEL_MIC_FIX','167_IN_APP_MIC_DAILY_VERSE_FIX').replace('165_MARATHI_VERSE_MIC_SAFARI_FIX','167_IN_APP_MIC_DAILY_VERSE_FIX')
    # modal-ios-meeting-choice preserved for iOS Safari WebKit mic access
    path.write_text(s,encoding='utf-8')

embedded='''function proceedJoinMeetingInApp() {
  if (typeof closeModal === "function") closeModal("modal-ios-meeting-choice");
  else { const el=document.getElementById("modal-ios-meeting-choice"); if(el) el.style.display="none"; }
  const m=_pendingMeetingToJoin || {id:"default",title:"Live Fellowship"};
  showToast("Joining Live Sanctuary 🙏");
  launchLiveMeetingRoom(m,null);
}
window.proceedJoinMeetingInApp=proceedJoinMeetingInApp;'''

for path in (Path('app.js'),Path('android-studio-app/app/build/intermediates/assets/debug/mergeDebugAssets/app.js')):
    if not path.exists(): continue
    s=path.read_text(encoding='utf-8')
    # Replace the whole function regardless of whether the old version ends with a window assignment.
    s=re.sub(r'function proceedJoinMeetingInApp\(\)\s*\{.*?(?=\nfunction\s+proceedJoinMeetingSafari\b)',embedded+'\n',s,count=1,flags=re.S)
    # If the function is not adjacent to Safari, use the known Safari-call body.
    s=re.sub(r'function proceedJoinMeetingInApp\(\)\s*\{.*?proceedJoinMeetingSafari\(\);\s*\}',embedded,s,count=1,flags=re.S)
    # Make every Jitsi iframe explicitly microphone-capable.
    iframe_patch="""\n(function(){\n  if(window.__rolJitsiMicPermissionPatch)return;window.__rolJitsiMicPermissionPatch=true;\n  const allow=()=>document.querySelectorAll('iframe').forEach(f=>{if(/jitsi/i.test(f.src||'')){f.setAttribute('allow','camera; microphone; autoplay; fullscreen; display-capture');f.setAttribute('allowfullscreen','true')}});\n  allow();new MutationObserver(allow).observe(document.documentElement,{childList:true,subtree:true});\n})();\n"""
    if '__rolJitsiMicPermissionPatch' not in s: s+=iframe_patch
    # Wrap Jitsi API instances so the local mic is turned on only if Jitsi reports muted.
    constructor_patch="""\n(function(){\n  if(window.__rolJitsiAudioStartupPatch||typeof window.JitsiMeetExternalAPI!=='function')return;\n  window.__rolJitsiAudioStartupPatch=true;\n  const Original=window.JitsiMeetExternalAPI;\n  window.JitsiMeetExternalAPI=function(){\n    const api=Reflect.construct(Original,Array.from(arguments),window.JitsiMeetExternalAPI);\n    const ensure=function(){try{api.isAudioMuted().then(function(muted){if(muted)api.executeCommand('toggleAudio')}).catch(function(){})}catch(e){}};\n    try{api.addListener('videoConferenceJoined',function(){const f=api.getIFrame&&api.getIFrame();if(f)f.setAttribute('allow','camera; microphone; autoplay; fullscreen; display-capture');ensure();setTimeout(ensure,350);setTimeout(ensure,1000);setTimeout(ensure,2000)})}catch(e){}\n    return api;\n  };\n  window.JitsiMeetExternalAPI.prototype=Original.prototype;\n})();\n"""
    if '__rolJitsiAudioStartupPatch' not in s: s+=constructor_patch
    # iOS Safari direct join preserved

    # Centered Daily Verse wallpaper used by both Download and Share.
    if 'RoL centered Daily Verse share patch' not in s:
        s+=r'''\n/* RoL centered Daily Verse share patch */\n(function(){\n  function meta(){return {text:(document.getElementById('home-vod-text')||{}).textContent?.replace(/[“”]/g,'').trim()||'',ref:(document.getElementById('home-vod-ref')||{}).textContent?.trim()||'River of Life'}}\n  async function makeImage(){const m=meta(),c=document.createElement('canvas');c.width=c.height=1080;const x=c.getContext('2d'),card=document.getElementById('card-daily-verse-home');let bg='';if(card){const z=getComputedStyle(card).backgroundImage.match(/url\(["']?(.*?)["']?\)/);if(z)bg=z[1]}try{if(bg){const i=await new Promise((ok,no)=>{const q=new Image();q.onload=()=>ok(q);q.onerror=no;q.src=new URL(bg,location.href).href}),sc=Math.max(1080/i.width,1080/i.height),w=i.width*sc,h=i.height*sc;x.drawImage(i,(1080-w)/2,(1080-h)/2,w,h)}else throw 0}catch(e){x.fillStyle='#18243a';x.fillRect(0,0,1080,1080)}x.fillStyle='rgba(0,0,0,.42)';x.fillRect(0,0,1080,1080);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='700 34px Georgia,serif';const words=m.text.split(/\s+/),lines=[],max=820,lh=54;let line='';words.forEach(w=>{const t=line?line+' '+w:w;if(x.measureText(t).width>max&&line){lines.push(line);line=w}else line=t});if(line)lines.push(line);const y=500-(lines.length-1)*lh/2;lines.forEach((l,i)=>x.fillText(l,540,y+i*lh));x.font='700 25px Arial,sans-serif';x.fillStyle='rgba(255,255,255,.92)';x.fillText(m.ref,540,Math.min(900,y+lines.length*lh+70));return{canvas:c,data:c.toDataURL('image/png'),meta:m}}\n  window.saveExactDailyVerseImage=async function(){try{const r=await makeImage(),a=document.createElement('a');a.href=r.data;a.download='river-of-life-daily-verse.png';document.body.appendChild(a);a.click();a.remove()}catch(e){if(window.showToast)showToast('Unable to create verse image')}};\n  window.shareDailyVerseToWhatsApp=async function(){try{const r=await makeImage(),b=await new Promise(ok=>r.canvas.toBlob(ok,'image/png')),f=new File([b],'river-of-life-daily-verse.png',{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]})))await navigator.share({files:[f],text:r.meta.text+'\\n\\n'+r.meta.ref});else window.open('https://wa.me/?text='+encodeURIComponent(r.meta.text+'\\n\\n'+r.meta.ref),'_blank')}catch(e){if(e?.name!=='AbortError'&&window.showToast)showToast('Sharing cancelled or unavailable')}};\n})();\n'''
    path.write_text(s,encoding='utf-8')
