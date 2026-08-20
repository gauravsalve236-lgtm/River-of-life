/* River of Life — branding enhancer. Additive only; does not replace app routing. */
(function(){
  'use strict';
  var LOGO='./assets/river-of-life-logo.svg';
  function isHome(){
    var h=(location.hash||'').toLowerCase();
    return h===''||h==='#'||h==='#/'||h==='#/home'||h==='#/today'||h==='#/dashboard';
  }
  function enhance(){
    if(!isHome()) return;
    var root=document.querySelector('.rol-home-final');
    if(!root) return;

    var mark=root.querySelector('.rol-logo-mark');
    if(mark && !mark.querySelector('img')){
      mark.textContent='';
      var img=document.createElement('img');
      img.src=LOGO;
      img.alt='River of Life';
      mark.appendChild(img);
    }

    root.classList.add('rol-branded-home');
  }

  function boot(){
    enhance();
    var app=document.getElementById('app');
    if(app && !app.__riverBrandObserver){
      var observer=new MutationObserver(function(){
        if(isHome()) enhance();
      });
      observer.observe(app,{childList:true,subtree:true});
      app.__riverBrandObserver=observer;
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.addEventListener('hashchange',function(){setTimeout(enhance,60);});
})();
