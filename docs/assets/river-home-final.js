(function(){
  'use strict';

  var HOME = new Set(['', '#', '#/', '#/home', '#/today', '#/dashboard']);
  var LOGO = 'assets/icons/river-logo.png?v=20260821-logo-v2';
  var LOGO_FALLBACK = 'assets/icons/icon-192.png?v=20260821-logo-fallback';
  var lastLanguage = null;
  var lastVerseKey = null;

  var VOD_IMAGES = [
    'assets/images/mountains.png',
    'assets/images/sunrise.png',
    'assets/images/forest.png',
    'assets/images/ocean.png',
    'assets/images/stars.png',
    'assets/images/mist.png',
    'assets/images/path.png'
  ];

  function isHome(){ return HOME.has((location.hash || '').toLowerCase().trim()); }
  function mount(){ var v=document.getElementById('view-home'); return v ? v.querySelector('.view-scroll-content') : null; }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function logoImg(cls,alt,extra){ return '<img class="'+cls+'" src="'+LOGO+'" alt="'+alt+'" onerror="this.onerror=null;this.src=\''+LOGO_FALLBACK+'\';"'+(extra||'')+'>'; }

  function currentLanguage(){
    try { return (typeof state !== 'undefined' && state.translation === 'eng') ? 'eng' : 'mar'; }
    catch(e){ return 'mar'; }
  }

  function currentVOD(){
    try {
      if (typeof getCurrentVOD === 'function') return getCurrentVOD().vod;
    } catch(e){}

    var fallback=[
      {ref:'स्तोत्रसंहिता ११९:१०५',engRef:'Psalm 119:105',text:'तुझे वचन माझ्या पावलांसाठी दिवा आणि माझ्या मार्गासाठी प्रकाश आहे.',engText:'Your word is a lamp to my feet and a light to my path.'},
      {ref:'स्तोत्रसंहिता २३:१',engRef:'Psalm 23:1',text:'परमेश्वर माझा मेंढपाळ आहे; मला काहीही कमी पडणार नाही.',engText:'The LORD is my shepherd; I shall not want.'},
      {ref:'नीतिसूत्रे ३:५',engRef:'Proverbs 3:5',text:'संपूर्ण अंतःकरणाने परमेश्वरावर भाव ठेव आणि तुझ्या स्वतःच्या आकलनावर अवलंबून राहू नको.',engText:'Trust in the LORD with all your heart, and do not lean on your own understanding.'},
      {ref:'स्तोत्रसंहिता ४६:१',engRef:'Psalm 46:1',text:'देव आपला आश्रय व सामर्थ्य आहे, संकटात तो अति सहज मिळणारा साहाय्यकर्ता आहे.',engText:'God is our refuge and strength, a very present help in trouble.'}
    ];
    var d=new Date(), n=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
    return fallback[Math.abs(n)%fallback.length];
  }

  function dayIndex(){
    var d=new Date();
    var start=new Date(d.getFullYear(),0,0);
    var day=Math.floor((d-start)/(1000*60*60*24));
    try { day += (typeof state !== 'undefined' ? (state.vodDayOffset || 0) : 0); } catch(e){}
    return Math.abs(day);
  }

  function verseImage(){ return VOD_IMAGES[dayIndex()%VOD_IMAGES.length]; }

  function ensureCss(){
    if(document.getElementById('rol-daily-verse-upgrade-css')) return;
    var s=document.createElement('style');
    s.id='rol-daily-verse-upgrade-css';
    s.textContent=`
      .rol-daily-verse-feature{position:relative;overflow:hidden;border-radius:24px;min-height:360px;margin-top:16px;box-shadow:0 16px 40px rgba(15,23,42,.16);background:#0f172a;color:#fff;isolation:isolate}
      .rol-daily-verse-feature:before{content:"";position:absolute;inset:0;background:var(--dv-bg) center/cover no-repeat;z-index:-3;transform:scale(1.02)}
      .rol-daily-verse-feature:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,6,23,.24) 0%,rgba(2,6,23,.58) 58%,rgba(2,6,23,.9) 100%);z-index:-2}
      .rol-dv-inner{min-height:360px;padding:28px 22px 20px;display:flex;flex-direction:column;justify-content:flex-end;box-sizing:border-box}
      .rol-dv-badge{display:inline-flex;align-self:flex-start;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(8px);font-size:11px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;margin-bottom:auto}
      .rol-dv-title{font-family:var(--font-ui,Inter,sans-serif);font-size:22px;line-height:1.25;font-weight:800;margin:0 0 12px;color:#fff}
      .rol-dv-text{font-family:var(--font-body,Lora,serif);font-size:20px;line-height:1.55;font-weight:500;margin:0;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.3)}
      .rol-dv-ref{font-size:13px;font-weight:800;margin-top:12px;color:rgba(255,255,255,.9)}
      .rol-dv-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:20px}
      .rol-dv-btn{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.13);color:#fff;border-radius:12px;padding:11px 8px;font-weight:800;font-size:11.5px;cursor:pointer;backdrop-filter:blur(8px)}
      .rol-dv-btn.primary{background:#fff;color:#0f172a;border-color:#fff}
      .rol-dv-status{margin-top:14px;padding:14px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0}
      .rol-dv-status-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .rol-dv-status-title{font-size:13px;font-weight:800;color:#0f172a}
      .rol-dv-status-preview{position:relative;width:min(100%,260px);aspect-ratio:9/16;margin:0 auto;border-radius:18px;overflow:hidden;background:#0f172a center/cover no-repeat;box-shadow:0 10px 24px rgba(15,23,42,.18);display:flex;align-items:center;justify-content:center;padding:28px 20px;box-sizing:border-box;text-align:center}
      .rol-dv-status-preview:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,6,23,.18),rgba(2,6,23,.82))}
      .rol-dv-status-content{position:relative;z-index:1;color:#fff}
      .rol-dv-status-content .brand{font-size:10px;letter-spacing:1.5px;font-weight:900;margin-bottom:22px}
      .rol-dv-status-content .quote{font-family:var(--font-body,Lora,serif);font-size:17px;line-height:1.55;font-weight:600}
      .rol-dv-status-content .source{font-size:10px;font-weight:800;margin-top:16px;opacity:.9}
      .rol-dv-status-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
      @media(max-width:430px){.rol-dv-text{font-size:18px}.rol-dv-inner{padding:24px 18px 18px}.rol-dv-actions{grid-template-columns:1fr 1fr}.rol-dv-btn:last-child{grid-column:1/-1}}
    `;
    document.head.appendChild(s);
  }

  function saveVerse(v){
    try{
      localStorage.setItem('riverSavedDailyVerse',JSON.stringify({verse:v.text,englishVerse:v.engText,reference:v.ref,englishReference:v.engRef,savedAt:new Date().toISOString()}));
      if(typeof showToast==='function') showToast(currentLanguage()==='eng'?'Verse saved':'वचन जतन केले');
    }catch(e){}
  }

  function shareText(v){
    var eng=currentLanguage()==='eng';
    var text=(eng?v.engText:v.text)+'\n— '+(eng?v.engRef:v.ref)+'\n\n🙏 River of Life';
    if(navigator.share){ navigator.share({title:eng?'Daily Bible Verse':'आजचे बायबल वचन',text:text}).catch(function(){}); }
    else { window.open('https://wa.me/?text='+encodeURIComponent('🙏 '+(eng?'Daily Bible Verse':'आजचे बायबल वचन')+'\n\n“'+(eng?v.engText:v.text)+'”\n— '+(eng?v.engRef:v.ref)+'\n\nRiver of Life'),'_blank'); }
  }

  function canvasStatus(v){
    var eng=currentLanguage()==='eng';
    var text=eng?v.engText:v.text;
    var ref=eng?v.engRef:v.ref;
    var imgUrl=verseImage();
    var canvas=document.createElement('canvas'); canvas.width=1080; canvas.height=1920;
    var ctx=canvas.getContext('2d');
    var img=new Image(); img.crossOrigin='anonymous';
    img.onload=function(){
      var scale=Math.max(canvas.width/img.width,canvas.height/img.height);
      var w=img.width*scale,h=img.height*scale;
      ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      var grad=ctx.createLinearGradient(0,0,0,canvas.height); grad.addColorStop(0,'rgba(2,6,23,.18)');grad.addColorStop(.55,'rgba(2,6,23,.42)');grad.addColorStop(1,'rgba(2,6,23,.9)');ctx.fillStyle=grad;ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='rgba(255,255,255,.95)';ctx.textAlign='center';ctx.font='800 30px Arial';ctx.fillText('RIVER OF LIFE',canvas.width/2,190);
      ctx.font='600 58px Georgia';
      var words=text.split(/\s+/),lines=[],line='',max=850;
      words.forEach(function(word){var test=line?line+' '+word:word;if(ctx.measureText(test).width>max&&line){lines.push(line);line=word}else line=test}); if(line)lines.push(line);
      var lineH=82,startY=canvas.height/2-(lines.length*lineH)/2;
      lines.forEach(function(l,i){ctx.fillText('“'+l+'”',canvas.width/2,startY+i*lineH)});
      ctx.font='800 30px Arial';ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillText('— '+ref,canvas.width/2,startY+lines.length*lineH+50);
      ctx.font='700 22px Arial';ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillText(eng?'DAILY BIBLE VERSE':'आजचे बायबल वचन',canvas.width/2,canvas.height-170);
      canvas.toBlob(function(blob){
        if(!blob)return;
        var file=new File([blob],'river-of-life-verse-status.png',{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){ navigator.share({title:eng?'Daily Bible Verse':'आजचे बायबल वचन',files:[file]}).catch(function(){}); }
        else { var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='river-of-life-verse-status.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000); }
      },'image/png');
    };
    img.onerror=function(){ if(typeof showToast==='function')showToast(eng?'Background image could not be loaded':'पार्श्वभूमी प्रतिमा लोड झाली नाही'); };
    img.src=imgUrl;
  }

  function downloadStatus(v){
    var eng=currentLanguage()==='eng';
    var text=eng?v.engText:v.text, ref=eng?v.engRef:v.ref, imgUrl=verseImage();
    var canvas=document.createElement('canvas'); canvas.width=1080; canvas.height=1920;
    var ctx=canvas.getContext('2d'), img=new Image(); img.crossOrigin='anonymous';
    img.onload=function(){
      var scale=Math.max(canvas.width/img.width,canvas.height/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      var grad=ctx.createLinearGradient(0,0,0,canvas.height);grad.addColorStop(0,'rgba(2,6,23,.12)');grad.addColorStop(.52,'rgba(2,6,23,.4)');grad.addColorStop(1,'rgba(2,6,23,.92)');ctx.fillStyle=grad;ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 30px Arial';ctx.fillText('RIVER OF LIFE',540,180);
      ctx.font='600 58px Georgia';var words=text.split(/\s+/),lines=[],line='';words.forEach(function(word){var test=line?line+' '+word:word;if(ctx.measureText(test).width>850&&line){lines.push(line);line=word}else line=test});if(line)lines.push(line);
      var lh=82,y=960-(lines.length*lh)/2;lines.forEach(function(l,i){ctx.fillText('“'+l+'”',540,y+i*lh)});
      ctx.font='800 30px Arial';ctx.fillStyle='rgba(255,255,255,.92)';ctx.fillText('— '+ref,540,y+lines.length*lh+45);
      ctx.font='700 22px Arial';ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText(eng?'DAILY BIBLE VERSE':'आजचे बायबल वचन',540,1740);
      canvas.toBlob(function(blob){if(!blob)return;var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='river-of-life-verse-status.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000);if(typeof showToast==='function')showToast(eng?'Status image downloaded':'स्टेटस प्रतिमा डाउनलोड झाली');},'image/png');
    };
    img.onerror=function(){if(typeof showToast==='function')showToast(eng?'Background image could not be loaded':'पार्श्वभूमी प्रतिमा लोड झाली नाही');};
    img.src=imgUrl;
  }

  function render(){
    if(!isHome())return;
    var m=mount();if(!m)return;
    ensureCss();
    var v=currentVOD(),eng=currentLanguage()==='eng',d=new Date(),h=d.getHours(),g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    var name='Gaurav';
    try{for(var k of ['riverUser','currentUser','loggedInUser','user']){var u=JSON.parse(localStorage.getItem(k)||'null');var nn=u&&(u.fullName||u.name||u.displayName||u.firstName);if(nn){name=String(nn).trim().split(/\s+/)[0];break;}}}catch(e){}
    var text=eng?v.engText:v.text,ref=eng?v.engRef:v.ref,img=verseImage();
    lastLanguage=eng?'eng':'mar';lastVerseKey=ref;
    m.innerHTML=`
      <main class="rol-authority-home" aria-label="River of Life Home">
        <div class="rol-authority-shell">
          <header class="rol-authority-header"><div class="rol-authority-brand">${logoImg('rol-authority-logo','River of Life logo')}<div><strong>RIVER OF LIFE</strong><small>READ • PRAY • GROW • SERVE</small></div></div><div class="rol-authority-actions"><button class="rol-authority-icon" aria-label="Notifications" onclick="typeof showToast==='function'?showToast('No new notifications'):alert('No new notifications')">🔔</button><button class="rol-authority-profile-btn" aria-label="Profile" onclick="location.hash='#/you'">${logoImg('rol-profile-logo','Profile',' style="width:28px;height:28px;border-radius:50%;object-fit:contain;background:#fff;"')}</button></div></header>
          <section class="rol-authority-hero"><div class="rol-authority-hero-inner"><div><div class="rol-authority-kicker">WELCOME BACK</div><h1>${g}, ${esc(name)} 👋</h1><p>${eng?'So glad you\'re here. Keep walking in His grace!':'तुम्ही येथे आहात याचा आनंद आहे. त्याच्या कृपेत चालत राहा!'}</p></div>${logoImg('rol-authority-hero-logo','River of Life logo')}</div></section>

          <section class="rol-daily-verse-feature" style="--dv-bg:url('${img}')">
            <div class="rol-dv-inner">
              <div class="rol-dv-badge">📖 ${eng?'VERSE OF THE DAY':'आजचे बायबल वचन'}</div>
              <div><h2 class="rol-dv-title">${eng?'Daily Bible Verse':'दैनिक बायबल वचन'}</h2><blockquote class="rol-dv-text">“${esc(text)}”</blockquote><div class="rol-dv-ref">— ${esc(ref)}</div>
                <div class="rol-dv-actions"><button class="rol-dv-btn" id="rol-dv-save">♡ ${eng?'Save':'जतन करा'}</button><button class="rol-dv-btn" id="rol-dv-share">↗ ${eng?'Share':'शेअर'}</button><button class="rol-dv-btn primary" id="rol-dv-status">▣ ${eng?'Status':'स्टेटस'}</button></div>
              </div>
            </div>
          </section>

          <section class="rol-dv-status" id="rol-dv-status-panel" style="display:none"><div class="rol-dv-status-head"><span class="rol-dv-status-title">${eng?'Create your Verse Status':'वचनाचा स्टेटस तयार करा'}</span><button class="rol-dv-btn" id="rol-dv-status-close" style="color:#0f172a;background:#fff;border-color:#e2e8f0;padding:7px 10px">✕</button></div><div class="rol-dv-status-preview" style="background-image:url('${img}')"><div class="rol-dv-status-content"><div class="brand">RIVER OF LIFE</div><div class="quote">“${esc(text)}”</div><div class="source">— ${esc(ref)}</div></div></div><div class="rol-dv-status-actions"><button class="rol-dv-btn primary" id="rol-dv-download" style="color:#0f172a;background:#fff;border-color:#e2e8f0">⬇ ${eng?'Download':'डाउनलोड'}</button><button class="rol-dv-btn primary" id="rol-dv-share-image" style="color:#0f172a;background:#fff;border-color:#e2e8f0">↗ ${eng?'Share Status':'स्टेटस शेअर करा'}</button></div></section>

          <h2 class="rol-authority-section-title">${eng?'Continue Reading':'वाचन सुरू ठेवा'}</h2><section class="rol-authority-journey"><button class="rol-authority-journey-card" onclick="location.hash='#/reader'"><div class="ico">📖</div><div style="text-align:left;flex:1;"><strong style="display:block;font-size:1rem;color:#0f172a;">John</strong><span style="font-size:.855rem;color:#64748b;">${eng?'Chapter 3 • Last read: Verse 16':'अध्याय ३ • शेवटचे वाचन: वचन १६'}</span></div><span class="rol-authority-btn primary" style="padding:6px 14px;font-size:.85rem;border-radius:20px;">${eng?'Continue ›':'पुढे ›'}</span></button></section>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;margin-bottom:10px;"><h2 class="rol-authority-section-title" style="margin:0;">${eng?'Quick Access':'जलद प्रवेश'}</h2><span style="font-size:.85rem;color:#0284c7;cursor:pointer;font-weight:600;" onclick="location.hash='#/you'">${eng?'View All':'सर्व पहा'}</span></div>
          <section class="rol-authority-grid"><button class="rol-authority-card" onclick="location.hash='#/reader'"><div class="ico">📖</div><strong>${eng?'Bible':'बायबल'}</strong><span>${eng?'Read Word':'वचन वाचा'}</span></button><button class="rol-authority-card" onclick="location.hash='#/meetings'"><div class="ico">🎥</div><strong>${eng?'Prayer Meeting':'प्रार्थना सभा'}</strong><span>${eng?'Join live':'थेट सहभागी व्हा'}</span></button><button class="rol-authority-card" onclick="location.hash='#/prayers'"><div class="ico">🙏</div><strong>${eng?'Prayer Requests':'प्रार्थना विनंत्या'}</strong><span>${eng?'Share needs':'गरजा सांगा'}</span></button><button class="rol-authority-card" onclick="location.hash='#/churches'"><div class="ico">⛪</div><strong>${eng?'Churches':'चर्चेस'}</strong><span>${eng?'Find fellowship':'संगती शोधा'}</span></button></section>
          <h2 class="rol-authority-section-title" style="margin-top:24px;">${eng?'Upcoming Prayer Meeting':'आगामी प्रार्थना सभा'}</h2><section class="rol-authority-verse" style="background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border:1px solid #e2e8f0;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong style="font-size:1.05rem;color:#0f172a;">${eng?'Evening Prayer & Worship':'संध्याकाळची प्रार्थना व उपासना'}</strong><span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:700;">${eng?'Live Soon':'लवकरच थेट'}</span></div><p style="margin:4px 0;font-size:.875rem;color:#475569;">📅 ${eng?'Today, 8:00 PM':'आज, रात्री ८:००'} &nbsp;|&nbsp; 💻 ${eng?'Online Meeting':'ऑनलाइन सभा'}</p><div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;"><span style="font-size:.8rem;color:#64748b;">👥 24 ${eng?'going':'जण सहभागी'}</span><button class="rol-authority-btn primary" onclick="location.hash='#/meetings'">${eng?'Join Meeting ›':'सभेत सामील व्हा ›'}</button></div></section>
        </div>
      </main>`;

    document.getElementById('rol-dv-save').onclick=function(){saveVerse(v);};
    document.getElementById('rol-dv-share').onclick=function(){shareText(v);};
    document.getElementById('rol-dv-status').onclick=function(){document.getElementById('rol-dv-status-panel').style.display='block';};
    document.getElementById('rol-dv-status-close').onclick=function(){document.getElementById('rol-dv-status-panel').style.display='none';};
    document.getElementById('rol-dv-download').onclick=function(){downloadStatus(v);};
    document.getElementById('rol-dv-share-image').onclick=function(){canvasStatus(v);};
  }

  function boot(){if(isHome()){ensureCss();render();}}
  document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,250);});
  window.addEventListener('load',function(){setTimeout(boot,500);});
  window.addEventListener('hashchange',function(){setTimeout(boot,100);});
  setInterval(function(){
    if(!isHome()) return;
    var lang=currentLanguage(), v=currentVOD(), key=lang+'|'+(v.engRef||v.ref);
    if(lastLanguage!==lang || lastVerseKey!== (v.engRef||v.ref) || !document.querySelector('#view-home .rol-authority-home')) render();
  },1000);
})();
