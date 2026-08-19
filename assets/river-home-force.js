(function(){'use strict';
function inject(){
 const root=document.querySelector('#app,main,.app-content,.content'); if(!root)return;
 if(document.querySelector('#rol-home-dashboard'))return;
 const path=location.hash||''; if(path && !/^#\/(home|today)?$/.test(path))return;
 const home=document.createElement('section'); home.id='rol-home-dashboard'; home.className='rol-home-dashboard';
 home.innerHTML=`<header class="rol-home-header"><div class="rol-brand"><div class="rol-logo-mark">✝</div><div><strong>River of Life</strong><small>Bible • Prayer • Community</small></div></div><div class="rol-header-actions"><button type="button" aria-label="Notifications">🔔</button><button type="button" aria-label="Profile">👤</button></div></header>
 <section class="rol-welcome"><div><span>WELCOME BACK</span><h1>Good morning</h1><p>Walk with God today.</p></div><div class="rol-cross">✝</div></section>
 <section class="rol-verse-card"><div class="rol-verse-kicker">✦ VERSE OF THE DAY</div><blockquote>“The LORD is my shepherd; I shall not want.”</blockquote><div class="rol-reference">Psalm 23:1</div><div class="rol-verse-actions"><button type="button" data-rol-save>♡ Save</button><button type="button" data-rol-share>Share to WhatsApp ↗</button></div></section>
 <section><div class="rol-section-heading"><h2>Quick Actions</h2></div><div class="rol-actions-grid"><button type="button" data-route="bible"><span>📖</span><b>Bible</b><small>Read God's Word</small></button><button type="button" data-route="prayer"><span>🙏</span><b>Prayer</b><small>Prayer & requests</small></button><button type="button" data-route="quiz"><span>🧠</span><b>Bible Quiz</b><small>Test your knowledge</small></button><button type="button" data-route="meetings"><span>🎥</span><b>Meetings</b><small>Join a prayer meeting</small></button></div></section>
 <section class="rol-journey"><div class="rol-section-heading"><h2>Continue Your Journey</h2><a href="#/bible">View all →</a></div><div class="rol-journey-grid"><button type="button" data-route="bible"><span>📖</span><div><b>Continue Reading</b><small>Spend time in God's Word</small></div><em>→</em></button><button type="button" data-route="quiz"><span>🧠</span><div><b>Take a Bible Quiz</b><small>Learn something new today</small></div><em>→</em></button></div></section><div class="rol-last-updated">Updated just now</div>`;
 root.prepend(home);
 home.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>{const r=b.dataset.route; location.hash='#/'+r;}));
 const share=home.querySelector('[data-rol-share]'); share.onclick=()=>{const t='🙏 Daily Bible Verse\n\n“The LORD is my shepherd; I shall not want.”\n— Psalm 23:1\n\nRiver of Life'; const u='https://wa.me/?text='+encodeURIComponent(t); window.open(u,'_blank','noopener');};
 const save=home.querySelector('[data-rol-save]'); save.onclick=()=>{save.textContent=save.textContent.includes('Saved')?'♡ Save':'♥ Saved'; try{localStorage.setItem('rol_saved_verse','Psalm 23:1');}catch(e){}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
setTimeout(inject,800); setTimeout(inject,1800);
window.addEventListener('hashchange',()=>{if(/^#\/(home|today)?$/.test(location.hash||'')){document.querySelector('#rol-home-dashboard')?.remove();setTimeout(inject,50);}});
})();