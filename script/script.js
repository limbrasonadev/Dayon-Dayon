    const studioIntro=document.getElementById('studioIntro');
    const legalWrapper=document.getElementById('legalWrapper');
    const legal1=document.getElementById('legalText1');
    const legal2=document.getElementById('legalText2');
    const introContainer=document.getElementById('introContainer');
    const slides=document.querySelectorAll('.introSlide');
    const dayonLogo=document.getElementById('dayonLogo');
    const startMenu=document.getElementById('startMenu');
    const introMusic=document.getElementById('introMusic');
    const menuMusic=document.getElementById('menuMusic');
    const soundButton=document.getElementById('soundToggle');

    let slideIntervalHandle=null,currentSlide=0,musicOn=true;
    const STUDIO_INTRO_TOTAL=12200,BLACK_SCREEN_BEFORE_LEGAL=400,LEGAL1_DURATION=5000,LEGAL2_DURATION=7000,SLIDE_DURATION=7000;
    
    function showLegalWrapper(){ legalWrapper.classList.add('legal-visible'); legalWrapper.style.visibility='visible'; }
    
    window.addEventListener('load',()=>{
      introMusic.muted=true;
      introMusic.play().then(()=>{ introMusic.muted=false; }).catch(()=>{});
      setTimeout(()=>{
        studioIntro.style.transition='opacity 900ms ease';
        studioIntro.style.opacity='0';
        setTimeout(()=>{
          studioIntro.style.display='none';
          setTimeout(()=>{
            showLegalWrapper();
            setTimeout(()=>{
              legal1.style.transition='opacity 700ms ease';
              legal1.style.opacity=0;
              setTimeout(()=>{
                legal1.style.display='none';
                legal2.style.display='block';
                legal2.style.opacity=0;
                legal2.style.transition='opacity 700ms ease';
                setTimeout(()=>{ legal2.style.opacity=1; },40);
                setTimeout(()=>{
                  legalWrapper.style.transition='opacity 700ms ease';
                  legalWrapper.style.opacity=0;
                  setTimeout(()=>{ legalWrapper.style.display='none'; startCinematicIntro(); },700);
                },LEGAL2_DURATION);
              },700);
            },LEGAL1_DURATION);
          },BLACK_SCREEN_BEFORE_LEGAL);
        },900);
      },STUDIO_INTRO_TOTAL);
    });

    window.addEventListener('click',skipIntro);
    window.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space') skipIntro();});
    window.addEventListener('touchstart',skipIntro);

    function startCinematicIntro(){
      introContainer.style.opacity=1; introContainer.setAttribute('aria-hidden','false'); dayonLogo.style.opacity=1; currentSlide=0;
      slides.forEach(s=>s.classList.remove('active'));
      if(slides[0]) slides[0].classList.add('active');
      slideIntervalHandle=setInterval(()=>{
        slides[currentSlide].classList.remove('active');
        currentSlide++;
        if(currentSlide<slides.length) slides[currentSlide].classList.add('active');
        else{ clearInterval(slideIntervalHandle); setTimeout(fadeOutIntro,400); }
      },SLIDE_DURATION);
    }

    function fadeOutIntro(){
    introContainer.classList.add('fade-out'); 
    dayonLogo.style.transition = 'opacity 400ms ease';
    dayonLogo.style.opacity = 0;

    // Wait for both intro fade and logo fade to complete before showing start menu
    setTimeout(()=>{
        introContainer.style.display='none';
        showStartMenu();
    }, 500); // 900ms + 400ms = 1300ms
    }

    function showStartMenu(){
    startMenu.classList.add('visible');
    startMenu.setAttribute('aria-hidden','false');
    introMusic.pause();
    introMusic.currentTime = 0;
    if(musicOn) menuMusic.play().catch(()=>{});
    }

function skipIntro() {
  if (slideIntervalHandle) clearInterval(slideIntervalHandle);

  introMusic.pause();
  introMusic.currentTime = 0;

  // Save flag to tell the next page to play the music
  localStorage.setItem('playMenuMusic', 'true');

  // Navigate to game-menu.html
  window.location.href = 'game-menu.html';
}



    function toggleSound(){ musicOn=!musicOn; if(musicOn){ menuMusic.play().catch(()=>{}); soundButton.textContent='Music: ON'; } else { menuMusic.pause(); soundButton.textContent='Music: OFF'; } }

    function toggleDifficulty(btn) {
      const wrapper = btn.closest('.menu-button-wrapper');
      const panel = wrapper.querySelector('.difficulty-panel');
      panel.classList.toggle('show'); // toggle independently
    }

    function toggleSettings(btn) {
      const wrapper = btn.closest('.menu-button-wrapper');
      const panel = wrapper.querySelector('.settings-panel');
      panel.classList.toggle('show'); // toggle independently
    }

    function changeTheme(t){ document.body.className=t; }
    function changeDifficulty(t){ console.log('Difficulty set to:',t); }

    window.startGame=startGame; window.toggleDifficulty=toggleDifficulty; window.toggleSettings=toggleSettings; window.changeTheme=changeTheme;