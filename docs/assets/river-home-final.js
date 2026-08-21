(function(){
  'use strict';
  var HOME = new Set(['', '#', '#/', '#/home', '#/today', '#/dashboard']);
  var LOGO = 'assets/icons/river-logo.png?v=20260821-logo-v2';
  var LOGO_FALLBACK = 'assets/icons/icon-192.png?v=20260821-logo-fallback';
  function isHome() { return HOME.has((location.hash || '').toLowerCase().trim()); }
  function mount() { var v = document.getElementById('view-home'); return v ? v.querySelector('.view-scroll-content') : null; }
  function user() {
    for (var k of ['riverUser', 'currentUser', 'loggedInUser', 'user']) {
      try { var u = JSON.parse(localStorage.getItem(k) || 'null'); var n = u && (u.fullName || u.name || u.displayName || u.firstName); if (n) return String(n).trim().split(/\s+/)[0]; } catch (e) {}
    }
    return 'Gaurav';
  }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function logoImg(cls,alt,extra){ return '<img class="'+cls+'" src="'+LOGO+'" alt="'+alt+'" onerror="this.onerror=null;this.src=\''+LOGO_FALLBACK+'\';"'+(extra||'')+'>'; }
  function verse() {
    var a=[['Your word is a lamp to my feet and a light to my path.','Psalm 119:105'],['The LORD is my shepherd; I shall not want.','Psalm 23:1'],['Trust in the LORD with all your heart, and do not lean on your own understanding.','Proverbs 3:5'],['God is our refuge and strength, a very present help in trouble.','Psalm 46:1']];
    var d=new Date(),n=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000); return a[Math.abs(n)%a.length];
  }
  function loadCss(){if(document.getElementById('rol-selected-home-css'))return;var l=document.createElement('link');l.id='rol-selected-home-css';l.rel='stylesheet';l.href='assets/river-home-authority.css?v=20260821-home-v3';document.head.appendChild(l);}
  function render(){
    if(!isHome())return; var m=mount(); if(!m)return; loadCss();
    var d=verse(),h=new Date().getHours(),g=h<12?'Good morning':h<17?'Good afternoon':'Good evening',n=user();
    m.innerHTML=`
      <main class="rol-authority-home" aria-label="River of Life Home">
        <div class="rol-authority-shell">
          <header class="rol-authority-header">
            <div class="rol-authority-brand">
              ${logoImg('rol-authority-logo','River of Life logo')}
              <div><strong>RIVER OF LIFE</strong><small>READ • PRAY • GROW • SERVE</small></div>
            </div>
            <div class="rol-authority-actions">
              <button class="rol-authority-icon" aria-label="Notifications" onclick="typeof showToast==='function'?showToast('No new notifications'):alert('No new notifications')">🔔</button>
              <button class="rol-authority-profile-btn" aria-label="Profile" onclick="location.hash='#/you'">${logoImg('rol-profile-logo','Profile',' style="width:28px;height:28px;border-radius:50%;object-fit:contain;background:#fff;"')}</button>
            </div>
          </header>
          <section class="rol-authority-hero"><div class="rol-authority-hero-inner"><div><div class="rol-authority-kicker">WELCOME BACK</div><h1>${g}, ${esc(n)} 👋</h1><p>So glad you're here. Keep walking in His grace!</p></div>${logoImg('rol-authority-hero-logo','River of Life logo')}</div></section>
          <section class="rol-authority-verse"><div class="label">📖 Today's Scripture</div><blockquote>“${esc(d[0])}”</blockquote><div class="ref">— ${esc(d[1])}</div><div class="rol-authority-actions-row"><button class="rol-authority-btn" onclick="localStorage.setItem('riverSavedDailyVerse',JSON.stringify({verse:${JSON.stringify(d[0])},reference:${JSON.stringify(d[1])},savedAt:new Date().toISOString()}));typeof showToast==='function'?showToast('Verse saved'):alert('Verse saved')">♡ Save</button><button class="rol-authority-btn primary" onclick="window.open('https://wa.me/?text='+encodeURIComponent('🙏 Daily Bible Verse\\n\\n“'+${JSON.stringify(d[0])}+'”\\n— '+${JSON.stringify(d[1])}+'\\n\\nRiver of Life'),'_blank')">↗ Share WhatsApp</button></div></section>
          <h2 class="rol-authority-section-title">Continue Reading</h2>
          <section class="rol-authority-journey"><button class="rol-authority-journey-card" onclick="location.hash='#/reader'"><div class="ico">📖</div><div style="text-align:left;flex:1;"><strong style="display:block;font-size:1rem;color:#0f172a;">John</strong><span style="font-size:.855rem;color:#64748b;">Chapter 3 • Last read: Verse 16</span></div><span class="rol-authority-btn primary" style="padding:6px 14px;font-size:.85rem;border-radius:20px;">Continue ›</span></button></section>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;margin-bottom:10px;"><h2 class="rol-authority-section-title" style="margin:0;">Quick Access</h2><span style="font-size:.85rem;color:#0284c7;cursor:pointer;font-weight:600;" onclick="location.hash='#/you'">View All</span></div>
          <section class="rol-authority-grid"><button class="rol-authority-card" onclick="location.hash='#/reader'"><div class="ico">📖</div><strong>Bible</strong><span>Read Word</span></button><button class="rol-authority-card" onclick="location.hash='#/meetings'"><div class="ico">🎥</div><strong>Prayer Meeting</strong><span>Join live</span></button><button class="rol-authority-card" onclick="location.hash='#/prayers'"><div class="ico">🙏</div><strong>Prayer Requests</strong><span>Share needs</span></button><button class="rol-authority-card" onclick="location.hash='#/churches'"><div class="ico">⛪</div><strong>Churches</strong><span>Find fellowship</span></button></section>
          <h2 class="rol-authority-section-title" style="margin-top:24px;">Upcoming Prayer Meeting</h2>
          <section class="rol-authority-verse" style="background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border:1px solid #e2e8f0;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong style="font-size:1.05rem;color:#0f172a;">Evening Prayer &amp; Worship</strong><span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:700;">Live Soon</span></div><p style="margin:4px 0;font-size:.875rem;color:#475569;">📅 Today, 8:00 PM &nbsp;|&nbsp; 💻 Online Meeting</p><div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;"><span style="font-size:.8rem;color:#64748b;">👥 24 going</span><button class="rol-authority-btn primary" onclick="location.hash='#/meetings'">Join Meeting ›</button></div></section>
        </div>
      </main>`;
  }
  function boot(){if(isHome()){loadCss();render();}}
  document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,250);}); window.addEventListener('load',function(){setTimeout(boot,500);}); window.addEventListener('hashchange',function(){setTimeout(boot,100);}); setInterval(function(){if(isHome()&&!document.querySelector('#view-home .rol-authority-home'))render();},700);
})();
