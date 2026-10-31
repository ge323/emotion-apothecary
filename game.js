(() => {
            'use strict';
            const c = document.getElementById('game'), ctx = c.getContext('2d');
            if (!c || !ctx) { document.body.insertAdjacentHTML("beforeend", "<p>게임 화면을 불러올 수 없습니다.</p>"); return; }
            ctx.imageSmoothingEnabled = false;
            const actionButton = document.getElementById('touchE'), overlay = document.getElementById('overlay'), status = document.getElementById('status');
            const W = 800, H = 576, T = 32;
            const reactionBubble = document.getElementById('reactionBubble');
            const miniDay = { set textContent(value) {} };
            let reactionUntil = 0, guestMood = 'normal';
            // Original procedural soundtrack: no external files or network required.
            // Browsers require a real user gesture before audio playback can start.
            const soundButton = document.getElementById('soundBtn');
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            let audioContext = null;
            let musicBus = null;
            let effectsBus = null;
            let soundEnabled = false;
            let musicTimer = null;
            let nextMusicTime = 0;
            let musicStep = 0;
            let MUSIC_STEP = 60 / 84 / 2; // 84 BPM, eighth notes
            let melody = [
                0, null, 4, null, 7, null, 4, 2,
                5, null, 9, 7, 4, null, 2, null,
                0, null, 4, 7, 9, null, 7, 4,
                2, null, 5, 4, 2, null, 0, null
            ];
            let bassNotes = [0, 5, 9, 7];
            const noteHz = midi => 440 * Math.pow(2, (midi - 69) / 12);
            const tracks = [
              {id:'cozy',name:'🌙 포근한 마법 약국',bpm:84,pitch:0,wave:'sine',mel:[0,null,4,null,7,null,4,2,5,null,9,7,4,null,2,null,0,null,4,7,9,null,7,4,2,null,5,4,2,null,0,null],bass:[0,5,9,7]},
              {id:'forest',name:'🌿 요정의 숲',bpm:96,pitch:12,wave:'sine',mel:[0,7,9,null,12,9,7,null,5,9,12,14,12,null,9,null,4,7,11,14,11,7,4,null,2,5,9,12,9,5,2,null],bass:[0,5,4,2]},
              {id:'rain',name:'🌧️ 비 오는 약국',bpm:68,pitch:-2,wave:'triangle',mel:[0,null,null,3,7,null,3,null,5,null,3,null,0,null,null,null,2,null,5,null,7,5,2,null,0,null,3,null,2,null,0,null],bass:[0,5,7,3]},
              {id:'night',name:'✨ 별빛 연구실',bpm:74,pitch:7,wave:'sine',mel:[0,null,7,12,14,null,12,7,9,null,16,14,12,null,9,null,7,12,16,null,19,16,12,null,9,null,7,4,7,null,0,null],bass:[0,9,5,7]},
              {id:'retro',name:'🎮 레트로 마녀의 하루',bpm:126,pitch:0,wave:'square',mel:[0,4,7,12,7,4,0,null,5,9,12,17,12,9,5,null,9,12,16,19,16,12,9,null,7,11,14,19,14,11,7,null],bass:[0,5,9,7]}
            ];
            let trackPitch=0,trackWave='sine';
            let trackId='cozy';
            try { const stored=localStorage.getItem('apothecary_bgm_track'); if(tracks.some(t=>t.id===stored)) trackId=stored; } catch(e){}
            function chooseTrack(id){
              const track=tracks.find(t=>t.id===id)||tracks[0];trackId=track.id;
              melody=track.mel;bassNotes=track.bass;MUSIC_STEP=60/track.bpm/2;trackPitch=track.pitch;trackWave=track.wave;
              musicStep=0;
              if(audioContext) nextMusicTime=audioContext.currentTime+0.2;
              try{localStorage.setItem('apothecary_bgm_track',track.id)}catch(e){}
              document.querySelectorAll('[data-track]').forEach(b=>b.classList.toggle('selected',b.dataset.track===trackId));
            }
            const musicPanel=document.getElementById('musicPanel');
            const musicOptions=document.getElementById('musicOptions');
            musicOptions.innerHTML=tracks.map(t=>`<button type="button" data-track="${t.id}">${t.name}</button>`).join('');
            musicOptions.addEventListener('click',e=>{const b=e.target.closest('[data-track]');if(!b)return;chooseTrack(b.dataset.track);if(!soundEnabled)startSound();});
            document.getElementById('musicSelect').addEventListener('click',()=>{musicPanel.hidden=false;document.getElementById('musicToggle').textContent=soundEnabled?'음악 끄기':'음악 켜기';});
            document.getElementById('musicClose').addEventListener('click',()=>{musicPanel.hidden=true;});
            musicPanel.addEventListener('click',e=>{if(e.target===musicPanel)musicPanel.hidden=true;});
            document.getElementById('musicToggle').addEventListener('click',()=>{if(soundEnabled)stopSound();else startSound();document.getElementById('musicToggle').textContent=soundEnabled?'음악 끄기':'음악 켜기';});
            chooseTrack(trackId);


            function ensureAudio() {
                if (!AudioContextClass) return false;
                if (!audioContext) {
                    audioContext = new AudioContextClass();
                    const compressor = audioContext.createDynamicsCompressor();
                    compressor.threshold.value = -18;
                    compressor.ratio.value = 3;
                    compressor.connect(audioContext.destination);
                    musicBus = audioContext.createGain();
                    effectsBus = audioContext.createGain();
                    musicBus.gain.value = 0.16;
                    effectsBus.gain.value = 0.27;
                    musicBus.connect(compressor);
                    effectsBus.connect(compressor);
                }
                if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
                return true;
            }

            function tone(midi, at, duration, volume = 0.1, wave = 'sine', bus = musicBus) {
                if (!audioContext || !bus) return;
                const oscillator = audioContext.createOscillator();
                const envelope = audioContext.createGain();
                oscillator.type = wave;
                oscillator.frequency.setValueAtTime(noteHz(midi), at);
                envelope.gain.setValueAtTime(0.0001, at);
                envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.025);
                envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
                oscillator.connect(envelope);
                envelope.connect(bus);
                oscillator.start(at);
                oscillator.stop(at + duration + 0.02);
            }

            function scheduleMusic() {
                if (!soundEnabled || !audioContext || document.hidden) return;
                while (nextMusicTime < audioContext.currentTime + 0.16) {
                    const step = musicStep % melody.length;
                    const phrase = Math.floor(musicStep / 8) % bassNotes.length;
                    const note = melody[step];
                    if (note !== null) tone(72 + note + trackPitch, nextMusicTime, MUSIC_STEP * 1.5, 0.09, trackWave);
                    if (step % 8 === 0) {
                        const root = 48 + bassNotes[phrase];
                        tone(root, nextMusicTime, MUSIC_STEP * 7, 0.07, 'triangle');
                        tone(root + 12, nextMusicTime + 0.08, MUSIC_STEP * 5, 0.025, 'sine');
                    }
                    musicStep++;
                    nextMusicTime += MUSIC_STEP;
                }
            }

            function startSound() {
                if (!ensureAudio()) {
                    if (soundButton) soundButton.textContent = '소리 미지원';
                    return;
                }
                soundEnabled = true;
                nextMusicTime = audioContext.currentTime + 0.06;
                if (soundButton) soundButton.textContent = '♫ 소리 끄기';
                soundButton?.setAttribute('aria-label', '음악과 효과음 끄기');
                if (!musicTimer) musicTimer = setInterval(scheduleMusic, 80);
                scheduleMusic();
            }

            function stopSound() {
                soundEnabled = false;
                if (musicTimer) clearInterval(musicTimer);
                musicTimer = null;
                if (audioContext) audioContext.suspend().catch(() => {});
                if (soundButton) soundButton.textContent = '♫ 소리 켜기';
                soundButton?.setAttribute('aria-label', '음악과 효과음 켜기');
            }

            function playEffect(name) {
                if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
                const t = audioContext.currentTime + 0.012;
                if (name === 'door') {
                    tone(84, t, .32, .18, 'sine', effectsBus);
                    tone(91, t + .13, .48, .16, 'sine', effectsBus);
                } else if (name === 'brew') {
                    [60, 64, 67, 72].forEach((m, i) => tone(m, t + i * .105, .34, .11, 'triangle', effectsBus));
                } else if (name === 'discover') {
                    [72, 76, 79, 84, 88].forEach((m, i) => tone(m, t + i * .12, .58, .13, 'sine', effectsBus));
                } else if (name === 'fail') {
                    tone(57, t, .24, .08, 'triangle', effectsBus);
                    tone(55, t + .13, .34, .07, 'triangle', effectsBus);
                } else if (name === 'serve') {
                    tone(76, t, .23, .12, 'sine', effectsBus);
                    tone(79, t + .11, .32, .1, 'sine', effectsBus);
                } else if (name === 'good') {
                    [72, 76, 79].forEach((m, i) => tone(m, t + i * .12, .42, .13, 'sine', effectsBus));
                } else if (name === 'leave') {
                    tone(79, t, .2, .09, 'sine', effectsBus);
                    tone(72, t + .14, .3, .08, 'sine', effectsBus);
                }
            }

            if (soundButton) soundButton.addEventListener('click', () => soundEnabled ? stopSound() : startSound());
            // Start automatically on the first interaction when the browser permits it.
            document.addEventListener('pointerdown', event => {
                if (!soundEnabled && event.target !== soundButton) startSound();
            }, { once: true });
            document.addEventListener('keydown', event => {
                if (!soundEnabled && !event.repeat && event.key !== 'Escape') startSound();
            }, { once: true });
            document.addEventListener('visibilitychange', () => {
                if (!audioContext || !soundEnabled) return;
                if (document.hidden) audioContext.suspend().catch(() => {});
                else {
                    audioContext.resume().then(() => { nextMusicTime = audioContext.currentTime + .08; }).catch(() => {});
                }
            });
            const keys = new Set();
            // Hold-to-move controls: pointer capture prevents missed releases.
            // Do not let focused buttons intercept keyboard movement.
            let opened = false, near = false, time = 0, last = 0;
            const p = { x: 395, y: 417, w: 20, h: 17, dir: 0, walk: 0 };
            const furniture = [{ x: 72, y: 90, w: 173, h: 62, type: 'shelf' }, { x: 275, y: 88, w: 105, h: 54, type: 'shelf' }, { x: 555, y: 90, w: 172, h: 62, type: 'shelf' }, { x: 75, y: 240, w: 122, h: 78, type: 'table' }, { x: 580, y: 235, w: 135, h: 92, type: 'table' }, { x: 322, y: 211, w: 150, h: 103, type: 'cauldron' }, { x: 240, y: 455, w: 116, h: 52, type: 'counter' }, { x: 497, y: 445, w: 122, h: 62, type: 'counter' }, { x: 78, y: 392, w: 80, h: 70, type: 'sofa' }, { x: 675, y: 390, w: 49, h: 66, type: 'plant' }];
            const solid = furniture.map(o => ({ x: o.x + 4, y: o.y + o.h * .48, w: o.w - 8, h: o.h * .52 }));
            function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
            function box(x, y, w, h, main, edge = '#3b2738') { rect(x + 4, y + 5, w, h, '#251b2e'); rect(x, y, w, h, edge); rect(x + 4, y + 4, w - 8, h - 8, main); }
            function ellipse(x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
            function text(s, x, y, size = 14, color = '#f6ddbd') { ctx.fillStyle = color; ctx.font = `bold ${size}px Limgul`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); }
            let scene = "shop";
            const villagePeople = [
                {x:215,y:260,homeX:215,homeY:260,name:"꽃집 루나",line:"마음이 지친 날에는 꽃 한 송이도 위로가 돼요.",color:"#d7a1b5",phase:0.4},
                {x:592,y:316,homeX:592,homeY:316,name:"우체부 모모",line:"전하지 못한 마음도 언젠가 닿을 거예요.",color:"#8baed2",phase:2.2},
                {x:365,y:415,homeX:365,homeY:415,name:"산책하는 아이",line:"오늘은 작은 행복을 세 개나 발견했어요!",color:"#e7c88b",phase:4.1}
            ];
            let villageTime=0;
            const villageBuildings=[
                {x:80,y:100,w:122,h:92,kind:'flower',label:'달빛 꽃집'},
                {x:528,y:93,w:148,h:106,kind:'post',label:'마을 우체국'},
                {x:72,y:353,w:110,h:101,kind:'home',label:'작은 집'},
                {x:565,y:409,w:124,h:96,kind:'home',label:'숲속 집'}
            ];
            // Village exploration: persistent letters, daily flowers, and residents.
            let villageLetters = [], villageFlowerDay = -1, villageFlowerCollected = false;
            const villageFlowerSpot={x:292,y:210};
            const villageToday=()=>Math.floor(served/5)+1;
            const villageNearBuilding=(kind)=>villageBuildings.find(b=>b.kind===kind && Math.hypot(p.x-(b.x+b.w/2),p.y-(b.y+b.h+16))<85);
            const villageFlowerNear=()=>Math.hypot(p.x-villageFlowerSpot.x,p.y-villageFlowerSpot.y)<65;
            function openVillagePanel(html){mode='villageEvent';opened=true;overlay.style.display='flex';keys.clear();modal.innerHTML=html;modal.querySelectorAll('[data-village-close]').forEach(b=>b.onclick=closeModal);}
            function villageMailbox(){
                const pending=villageLetters.filter(l=>!l.read && l.day<=villageToday());
                const letters=villageLetters.filter(l=>l.day<=villageToday()).slice(-8).reverse();
                openVillagePanel(`<h2>💌 마을 우체국</h2><p class="hint">마음을 돌본 뒤 도착한 편지를 읽어 보세요. 새로운 편지 ${pending.length}통</p>${letters.length?letters.map(l=>`<div class="dialogue" style="margin-bottom:10px"><b>${shopEscape(l.name)}의 편지 ${l.read?'':'✉️'}</b><p>${shopEscape(l.message)}</p></div>`).join(''):'<div class="dialogue">아직 도착한 편지가 없어요. 손님을 상담한 뒤 다음 날 다시 와 보세요.</div>'}<button class="action" data-village-close>우체국 나가기</button>`);
                pending.forEach(l=>l.read=true);if(pending.length)save();
            }
            function villageFlowerVisit(){
                const today=villageToday();
                if(villageFlowerDay!==today){villageFlowerDay=today;villageFlowerCollected=false;}
                if(villageFlowerCollected){openVillagePanel('<h2>🌷 달빛 꽃집</h2><div class="dialogue">“오늘의 감정 꽃은 이미 챙겼구나. 내일 다시 들러 줘!”</div><button class="action" data-village-close>나가기</button>');return;}
                const bonus=5+(today%3)*2;villageFlowerCollected=true;coins+=bonus;save();playEffect('good');
                openVillagePanel(`<h2>🌷 오늘의 감정 꽃</h2><div class="dialogue">“오늘은 마음을 달래는 꽃이 피었단다. 작은 선물도 가져가렴!”</div><p>반짝이는 꽃을 발견했어요! 💰 +${bonus}코인</p><button class="action" data-village-close>고마워요</button>`);
            }
            function recordVillageLetter(g,wasGood,wasHelpful){
                if(!g)return;
                const msg=wasGood?`마녀님, ${g.issue} 그날 제 마음을 알아주셔서 고마워요. 덕분에 작은 용기를 내 보았어요. 다음에 또 이야기 들려드릴게요.`:wasHelpful?`마녀님, 그날 건네준 물약 덕분에 조금은 마음이 편해졌어요. 아직 천천히 나아가는 중이에요.`:`마녀님, 지난번 상담 이후 제 마음을 더 들여다보았어요. 다음에 만나면 다시 이야기해 보고 싶어요.`;
                villageLetters.push({name:g.name,message:msg,day:villageToday()+1,read:false});
                if(villageLetters.length>24)villageLetters=villageLetters.slice(-24);
            }
            let villageNoticeUntil=0;
            const roomBounds = { left: 52, right: 748, top: 98, bottom: 520 }; // Strict room bounds: sprite remains fully within the visible room.
            function keepWitchInside() {
                if(scene === "village") { p.x=Math.max(34,Math.min(766,p.x));p.y=Math.max(34,Math.min(545,p.y));return; }
                p.x = Math.max(roomBounds.left + 16, Math.min(roomBounds.right - 16, p.x));
                p.y = Math.max(roomBounds.top + 29, Math.min((p.x>368 && p.x<433)?530:roomBounds.bottom-20, p.y));
            }
            function collide(x, y) { if(scene === "village") {
                if(x < 30 || x > 770 || y < 30 || y > 550) return true;
                // The river is solid except at the wooden bridge.
                if(x>722 && (y<272 || y>353)) return true;
                return villageBuildings.some(b=>x+10>b.x+5 && x-10<b.x+b.w-5 && y+8>b.y+12 && y-8<b.y+b.h);
            } let a = { x: x - p.w / 2, y: y - p.h / 2, w: p.w, h: p.h }; if (x - 16 < roomBounds.left || y - 29 < roomBounds.top || x + 16 > roomBounds.right || (y + 20 > roomBounds.bottom && !(x>368 && x<433 && y<545)))
                return true; return (shopOwned('shelfPlus') && a.x < 181 && a.x+a.w > 34 && a.y < 244 && a.y+a.h > 195) || solid.some(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y); }
            function floor() { rect(0, 0, W, H, '#231c2c'); rect(32, 62, 736, 483, '#5b3c45'); for (let y = 64; y < 544; y += 32) {
                for (let x = 33; x < 767; x += 64) {
                    rect(x + (Math.floor(y / 32) % 2) * 24, y, 62, 30, ((x + y) % 3 === 0) ? '#75504e' : '#69474a');
                    rect(x + 3, y + 4, 24, 2, '#805655');
                    rect(x + 34, y + 24, 22, 2, '#5b3c45');
                }
            } rect(0, 0, 800, 65, '#342b42'); for (let x = 0; x < 800; x += 33) {
                rect(x, 47, 31, 13, '#4c3544');
                rect(x, 60, 31, 4, '#a16a62');
            } for (let y = 64; y < 546; y += 34) {
                rect(12, y, 14, 30, '#3a2b40');
                rect(774, y, 14, 30, '#3a2b40');
            } rect(0, 545, 800, 31, '#292332'); rect(365, 540, 71, 18, '#aa7c6d'); rect(374, 544, 53, 14, '#3a2b40'); box(412, 365, 90, 63, '#8e6970', '#63455a'); for (let i = 0; i < 4; i++) {
                rect(423 + i * 18, 375, 9, 42, '#aa7d80');
            } }
            function potion(x, y, col) { rect(x + 5, y, 7, 5, '#dfc29b'); rect(x + 3, y + 5, 11, 4, '#e9c9b4'); box(x, y + 9, 17, 21, col, '#d6b4c1'); rect(x + 4, y + 13, 4, 4, '#fff0db'); }
            function shelf(o) { box(o.x, o.y, o.w, o.h, '#86554a', '#4d3042'); rect(o.x + 6, o.y + 8, o.w - 12, 9, '#ac7963'); rect(o.x + 6, o.y + 35, o.w - 12, 7, '#b7846c'); for (let i = 0; i < Math.floor((o.w - 20) / 25); i++) {
                potion(o.x + 11 + i * 25, o.y + 13, ['#ffca73', '#90c9e4', '#e69cc5', '#b49ce8', '#a7cfa4'][i % 5]);
            } }
            function plant(x, y) {
                // Hand-drawn pixel plant: all foliage uses rectangular pixels, no ellipses.
                const px = (dx, dy, w, h, color) => rect(x + dx, y + dy, w, h, color);
                // Pot, lip, soil and subtle highlights.
                px(5, 39, 34, 5, '#34283e');
                px(8, 44, 28, 12, '#543849');
                px(11, 44, 22, 10, '#a87460');
                px(15, 47, 5, 7, '#c18d71');
                px(8, 39, 28, 5, '#d0a082');
                px(12, 37, 20, 4, '#493644');
                // Pixel branches and dark silhouette.
                px(19, 20, 6, 21, '#5b453c');
                px(13, 25, 18, 5, '#5b453c');
                const blocks = [
                    [12, 5, 18, 5, '#356e56'], [7, 10, 29, 7, '#356e56'],
                    [3, 17, 38, 10, '#356e56'], [7, 27, 30, 7, '#356e56'],
                    [13, 34, 19, 5, '#356e56'],
                    [13, 7, 15, 5, '#5ca077'], [8, 13, 20, 7, '#5ca077'],
                    [4, 20, 14, 8, '#5ca077'], [22, 19, 17, 9, '#4c916c'],
                    [11, 28, 21, 6, '#4c916c'], [15, 10, 9, 6, '#8cc18a'],
                    [7, 19, 8, 6, '#8cc18a'], [24, 15, 8, 5, '#8cc18a'],
                    [15, 27, 7, 4, '#75b583']
                ];
                blocks.forEach(([dx,dy,w,h,c]) => px(dx,dy,w,h,c));
                px(12, 17, 5, 4, '#a1d19a');
                px(27, 25, 5, 4, '#a1d19a');
            }
            function drawFurniture() {
                if(shopOwned('shelfPlus')) {
                    // Distinct, glowing freestanding display: visible even on small mobile screens.
                    box(31,162,153,83,'#c18a67','#ffe2a3');
                    rect(38,169,139,8,'#ffe6ac');
                    rect(38,208,139,7,'#ffe6ac');
                    for(let i=0;i<5;i++) potion(45+i*27,174,['#ff91d3','#90d8ff','#b8a3ff','#a2f0be','#ffd38c'][i]);
                    for(let i=0;i<5;i++) {
                        const glowX=53+i*27;
                        ellipse(glowX,164+Math.sin(time*.003+i)*3,3,3,'#fff0ad');
                    }
                    rect(58,230,100,8,'#fff0c2');
                    ctx.save(); ctx.fillStyle='#5c3854'; ctx.font='bold 12px Limgul, sans-serif'; ctx.textAlign='center';
                    ctx.fillText('MAGIC POTIONS',108,237); ctx.restore();
                    if(shelfDisplayId && item(shelfDisplayId)) { const shown=item(shelfDisplayId); potion(100,174,shown.color); ctx.save(); ctx.fillStyle='#fff0c9';ctx.textAlign='center';ctx.font='bold 12px Limgul, sans-serif';ctx.fillText(shown.name,108,155);ctx.restore(); }
                }
                if(shopOwned('moonLamp')) { ellipse(675,180,45,45,'#f4dba72a'); ellipse(675,165,17,17,'#ffe8ae'); ellipse(683,160,15,17,'#5b3c45'); rect(674,185,3,12,'#f7db9b'); }
                for (const o of furniture) {
                if (o.type === 'shelf')
                    shelf(o);
                if (o.type === 'table') {
                    box(o.x, o.y + 21, o.w, o.h - 21, '#a77361', '#593949');
                    rect(o.x + 9, o.y + 28, o.w - 18, 5, '#d59b75');
                    potion(o.x + 19, o.y + 5, '#d59ac9');
                    potion(o.x + 48, o.y + 3, '#93c7c0');
                    if (o.x > 500) {
                        rect(o.x + 81, o.y + 20, 35, 28, '#e7caa4');
                        rect(o.x + 86, o.y + 24, 25, 2, '#b98783');
                    }
                }
                if (o.type === 'counter') {
                    box(o.x, o.y + 8, o.w, o.h - 8, '#9b685c', '#513746');
                    rect(o.x + 8, o.y + 14, o.w - 16, 8, '#d29a78');
                    potion(o.x + 15, o.y - 8, '#a4c9c4');
                }
                if (o.type === 'sofa') {
                    box(o.x, o.y, o.w, o.h, '#a77789', '#503849');
                    box(o.x + 8, o.y + 8, o.w - 16, o.h - 20, '#c995a4');
                    rect(o.x + 14, o.y + 15, 20, 20, '#e2b1b1');
                }
                if (o.type === 'plant')
                    plant(o.x, o.y);
            } }
            function cauldron() { const o = furniture.find(v => v.type === 'cauldron'); rect(o.x + 10, o.y + 63, 130, 34, '#493047'); ellipse(397, 268, 72, 36, '#302839'); ellipse(397, 251, 70, 31, '#a37b98'); ellipse(397, 251, 61, 24, '#543b7a'); ellipse(397, 250, 55, 18, shopOwned('goldPot') ? '#f1cc71' : '#9c6ec0'); for (let i = 0; i < 9; i++) {
                let x = 355 + i * 11, y = 250 + Math.sin(time * .002 + i * 2) * 8;
                ellipse(x, y, 2 + i % 3, 2 + i % 2, i % 2 ? '#f1c5ff' : '#d69ef5');
            } rect(328, 253, 12, 27, '#302839'); rect(454, 253, 12, 27, '#302839'); ellipse(397, 288, 49, 15, '#33283c'); rect(361, 290, 13, 13, '#33283c'); rect(421, 290, 13, 13, '#33283c'); for (let i = 0; i < 4; i++) {
                let yy = 220 - (time * .018 + i * 23) % 58;
                ellipse(374 + i * 15, yy, 3, 3, '#d5a6ee');
            } text('✦', 397, 192, 21, '#ffe1a1'); }
            function witch() {
                keepWitchInside(); const x = Math.round(p.x), y = Math.round(p.y);
                const facing = p.dir; // 0 front, 1 back, 2 right, 3 left
                const moving = Math.abs(p.walk - (witch.lastWalk ?? p.walk)) > 0.001;
                witch.lastWalk = p.walk;
                const step = moving ? Math.sin(p.walk * 1.8) : 0;
                const bob = moving ? Math.abs(step) * 1.4 : 0;
                const py = y - bob;
                const hair = '#674666', hairLight = '#886184', skin = '#efc2a6';
                const robe = '#79619d', robeShade = '#594a80', boot = '#332b47';
                const hat = '#4b3b67', brim = '#352c4d';
                // Ground shadow and alternating feet (also visible from the back).
                ellipse(x, y + 15, 14, 4, '#382a3a');
                rect(x - 7, py + 11 + Math.max(0, step * 2), 6, 7, boot);
                rect(x + 2, py + 11 + Math.max(0, -step * 2), 6, 7, boot);
                if (facing === 0 || facing === 1) {
                    // Front/back silhouettes are symmetrical; facial details only face front.
                    rect(x - 10, py - 8, 20, 22, robeShade);
                    rect(x - 8, py - 7, 16, 20, robe);
                    rect(x - 13, py - 6 + step * 2, 4, 12, robeShade);
                    rect(x + 9, py - 6 - step * 2, 4, 12, robeShade);
                    if (facing === 0) {
                        rect(x - 11, py - 19, 22, 19, hair);
                        rect(x - 8, py - 17, 16, 15, skin);
                        rect(x - 11, py - 13, 4, 13, hair);
                        rect(x + 7, py - 13, 4, 13, hair);
                        rect(x - 5, py - 11, 3, 3, '#3e3044');
                        rect(x + 3, py - 11, 3, 3, '#3e3044');
                        rect(x - 3, py - 5, 6, 2, '#cb8793');
                        rect(x - 4, py + 1, 8, 3, '#d6b4a6');
                    } else {
                        // Back view: long flowing hair covers the face and part of the cloak.
                        rect(x - 11, py - 19, 22, 23, hair);
                        rect(x - 9, py - 12, 18, 20, hairLight);
                        rect(x - 7, py - 9, 14, 17, hair);
                        rect(x - 2, py - 8, 3, 13, '#9c7392');
                        rect(x - 11, py + 5, 4, 6, hair);
                        rect(x + 7, py + 5, 4, 6, hair);
                    }
                } else {
                    // A real side-profile sprite, mirrored for left/right.
                    // All features are drawn in local right-facing coordinates.
                    ctx.save();
                    ctx.translate(x, 0);
                    if (facing === 3) ctx.scale(-1, 1);
                    const r = (xx, yy, w, h, c) => rect(xx, yy, w, h, c);
                    r(-8, py - 7, 16, 21, robeShade);
                    r(-6, py - 6, 13, 19, robe);
                    r(-10, py - 4 + step * 2, 4, 12, robeShade); // rear arm
                    r(7, py - 4 - step * 2, 4, 11, '#9076ae'); // forward arm
                    r(-10, py - 19, 17, 20, hair);
                    r(-4, py - 17, 13, 15, skin);
                    r(7, py - 11, 4, 5, skin); // nose silhouette
                    r(-10, py - 15, 5, 21, hairLight); // hair at back
                    r(-9, py + 3, 4, 6, hair);
                    r(4, py - 12, 3, 3, '#3e3044'); // visible eye
                    r(7, py - 5, 3, 2, '#cb8793'); // side mouth
                    ctx.restore();
                }
                // Hat has different trim and highlights in front, side, and back views.
                rect(x - 11, py - 22, 22, 6, hat);
                rect(x - 17, py - 24, 34, 6, brim);
                rect(x - 10, py - 32, 20, 10, hat);
                rect(x - 4, py - 40, 12, 10, hat);
                rect(x - 7, py - 26, 15, 3, '#a18bbd');
                if (facing === 0) rect(x + 4, py - 29, 5, 4, '#f1cb7e');
                if (facing === 1) rect(x - 7, py - 29, 5, 4, '#b8a1c8');
                if (facing === 2) rect(x + 7, py - 29, 4, 4, '#f1cb7e');
                if (facing === 3) rect(x - 11, py - 29, 4, 4, '#f1cb7e');
            }
            function decorations() { for (let i = 0; i < 4; i++) {
                rect(50 + i * 180, 73, 6, 10, '#e8c07b');
                rect(48 + i * 180, 82, 10, 10, '#f3d18c');
            } box(432, 89, 75, 61, '#7697a5', '#483b56'); rect(439, 97, 61, 46, '#a5ced5'); rect(467, 96, 5, 47, '#6c5869'); rect(438, 116, 63, 5, '#6c5869'); rect(463, 103, 8, 8, '#fff1cf'); text('✧', 252, 213, 20, '#f6c99c'); text('✧', 558, 359, 17, '#f6c99c'); }
            // Floor mat: part of the room, not a camera-following overlay.
            function drawEntranceMat() {
                box(338, 496, 126, 41, '#49354f', '#c6a27d');
                rect(344, 502, 114, 29, '#66516b');
                rect(348, 506, 106, 21, '#4b3a55');
                text('마음의 약국', 401, 520, 12, '#ffdfb0');
                rect(354, 525, 92, 2, '#d2ad88');
            }
            // The bell on the front counter summons the next visitor.
            function drawCounterBell() {
                rect(400, 389, 24, 4, '#5b3c48');
                rect(405, 382, 14, 9, '#e9c478');
                rect(410, 378, 4, 5, '#fff0b2');
                rect(405, 389, 14, 3, '#a77d63');
            }
            function draw() { floor(); decorations(); drawFurniture(); cauldron(); witch();  }
            const frameEl = document.getElementById('frame'), modal = document.getElementById('modal'), dayEl = document.getElementById('day');
            const emotions = [{ id: 'joy', name: '기쁨', icon: '☀️', color: '#ffca73' }, { id: 'sad', name: '슬픔', icon: '💧', color: '#90c9e4' }, { id: 'love', name: '사랑', icon: '💗', color: '#e69cc5' }, { id: 'fear', name: '두려움', icon: '🌑', color: '#b49ce8' }, { id: 'anger', name: '분노', icon: '🔥', color: '#e58b76' }, { id: 'calm', name: '평온', icon: '🍃', color: '#a7cfa4' }, { id: 'longing', name: '그리움', icon: '🌙', color: '#8aa3d4' }, { id: 'courage', name: '용기', icon: '🦋', color: '#b4d6bd' }, { id: 'flutter', name: '설렘', icon: '✨', color: '#f4aacd' }, { id: 'regret', name: '후회', icon: '🥀', color: '#bb91a1' }, { id: 'attachment', name: '집착', icon: '🕸️', color: '#aa85b5' }, { id: 'hope', name: '희망', icon: '🌟', color: '#efce79' }];
            const recipes = { 'joy|sad': 'longing', 'calm|fear': 'courage', 'joy|love': 'flutter', 'anger|sad': 'regret', 'fear|love': 'attachment', 'courage|joy': 'hope', 'longing|love': 'flutter', 'calm|regret': 'hope' };
            const guests = [{ name: '서하', icon: '👩🏻', color: '#e3a8a2', issue: '좋아하는 사람 앞에만 서면 아무 말도 못 하겠어요. 제 마음을 조금 바꿀 수 있을까요?', good: 'courage', lines: { courage: '저… 오늘은 제가 먼저 연락해 볼게요! 떨리지만 해보고 싶어요!', calm: '조급할 필요는 없겠네요. 제 마음을 천천히 알아볼래요.', love: '앗, 갑자기 너무 보고 싶어요! 지금 당장 찾아가야겠어요!', fear: '역시 거절당할까 봐 무서워요… 그냥 포기할래요.' } }, { name: '도윤', icon: '🧑🏻', color: '#a7c4cb', issue: '중요한 발표를 앞두고 자꾸 실패하는 상상만 해요. 어떻게 하면 좋을까요?', good: 'calm', lines: { calm: '후우… 이제 숨을 고를 수 있겠어요. 차근차근 준비할게요.', courage: '좋아요! 떨려도 무대에 올라가 볼게요!', fear: '으악, 더 무서워졌어요. 오늘은 못 할 것 같아요.', joy: '하하! 뭐든 잘될 것 같아요! 연습은… 내일 할까요?' } }, { name: '미루', icon: '👧🏻', color: '#d2b2e0', issue: '멀리 떠난 친구가 자꾸 생각나요. 잊어야 하는 걸까요?', good: 'longing', lines: { longing: '그리워해도 괜찮군요. 편지를 써볼래요.', hope: '다시 만날 날이 올 수도 있겠죠? 마음이 따뜻해요.', sad: '눈물이 나요… 그래도 소중한 기억이었어요.', anger: '왜 저만 두고 떠났을까요? 화가 나요!' } }, { name: '하린', icon: '👩🏽', color: '#dfbd83', issue: '친구와 다투고 심한 말을 했어요. 사과하고 싶은데 용기가 안 나요.', good: 'regret', lines: { regret: '제 잘못을 인정하고 진심으로 사과할게요.', courage: '맞아요. 먼저 찾아가서 이야기해 볼게요.', anger: '생각할수록 화가 나네요! 제가 왜 사과해야 하죠?', calm: '일단 마음을 가라앉히고, 내일 다시 생각해 볼게요.' } }, { name: '루카', icon: '🧑🏼', color: '#b7cfa8', issue: '요즘 모든 게 재미없어요. 내일을 기다릴 이유가 있을까요?', good: 'hope', lines: { hope: '작은 기대가 생겼어요. 내일은 산책을 해 볼래요.', joy: '오, 기분이 좀 나아졌어요! 오늘은 맛있는 걸 먹을래요.', calm: '잠깐 쉬어도 괜찮겠어요. 조금 편안해졌어요.', fear: '내일도 똑같을까 봐 무서워졌어요…' } }];
            // 신규 감정: 발견한 감정을 다시 조합 재료로 사용할 수 있습니다.
            const extraEmotions = [
                ['trust', '신뢰', '🤝', '#9bcbbf'], ['comfort', '위로', '🧸', '#d8b2dc'],
                ['nostalgia', '향수', '🕰️', '#c9ad8e'], ['confidence', '자신감', '🌈', '#f0bd80'],
                ['jealousy', '질투', '💚', '#a9c27c'], ['forgiveness', '용서', '🕊️', '#c5d6ee'],
                ['gratitude', '감사', '🎁', '#edb7aa'], ['curiosity', '호기심', '🔍', '#b7b2e8'],
                ['determination', '결심', '⚔️', '#e8a28b'], ['peace', '안도', '🫖', '#b9d9c2'],
                ['empathy', '공감', '🫂', '#d5b3c8'], ['passion', '열정', '❤️‍🔥', '#e99c8d']
            ];
            extraEmotions.forEach(([id, name, icon, color]) => emotions.push({ id, name, icon, color }));
            Object.assign(recipes, {
                'calm|love':'trust', 'calm|sad':'comfort', 'longing|sad':'nostalgia',
                'courage|hope':'confidence', 'anger|love':'jealousy', 'calm|regret':'forgiveness',
                'joy|trust':'gratitude', 'fear|joy':'curiosity', 'anger|courage':'determination',
                'calm|hope':'peace', 'comfort|sad':'empathy', 'courage|love':'passion',
                'love|trust':'comfort', 'hope|sad':'empathy', 'joy|regret':'gratitude',
                'fear|trust':'courage', 'longing|hope':'peace', 'anger|calm':'determination'
            });
            // 조합 키는 항상 알파벳순으로 정규화합니다.
            const normalizedRecipes = {};
            Object.entries(recipes).forEach(([key, result]) => {
                normalizedRecipes[key.split('|').sort().join('|')] = result;
            });
            Object.keys(recipes).forEach(key => delete recipes[key]);
            Object.assign(recipes, normalizedRecipes);

            // 맵에 그려지는 손님과 같은 색상·얼굴 형태를 상담창에서도 사용합니다.
            // 외부 이미지가 필요 없는 픽셀 캔버스 초상화입니다.
            function drawGuestPortrait(canvas, person, mood = 'normal') {
                const c = canvas.getContext('2d');
                c.imageSmoothingEnabled = false;
                const pixel = (x,y,w,h,color) => { c.fillStyle=color; c.fillRect(x,y,w,h); };
                c.clearRect(0,0,48,48);
                pixel(0,0,48,48,'#72546d');
                pixel(3,3,42,42,'#987c93');
                pixel(8,36,32,12,person.color);
                pixel(13,9,22,29,'#5b3a47');
                pixel(16,15,16,21,'#f0c6ac');
                pixel(12,8,24,9,'#5b3a47');
                pixel(12,16,5,13,'#5b3a47');
                pixel(31,16,5,13,'#5b3a47');
                if (mood === 'happy') {
                    pixel(19,25,4,2,'#443443'); pixel(27,25,4,2,'#443443');
                    pixel(22,31,7,2,'#a14e69'); pixel(23,33,5,1,'#a14e69');
                } else if (mood === 'surprised') {
                    pixel(19,24,3,5,'#443443'); pixel(28,24,3,5,'#443443');
                    pixel(24,31,3,4,'#a14e69');
                } else {
                    pixel(19,25,3,3,'#443443'); pixel(28,25,3,3,'#443443');
                    pixel(23,32,5,2,'#a14e69');
                }
                pixel(16,30,4,2,'#e9a5a6'); pixel(31,30,4,2,'#e9a5a6');
            }
            function refreshGuestPortrait(mood = 'normal') {
                const canvas = modal.querySelector('.portrait');
                if (canvas && guest) drawGuestPortrait(canvas, guest, mood);
            }
            let known = new Set(['joy', 'sad', 'love', 'fear', 'anger', 'calm']);
            let seen = new Set();
            let missionWins = 0, specialVisits = 0, lastOutcome = 'good', missionRewardedDay = 0, resultDelta = 0, resultKind = 'good';
            const missionEl = document.getElementById('mission');
            const specials = [
              { name:'달빛 우체부', icon:'✉️', color:'#a9b9e5', issue:'전하지 못한 편지가 있어요. 누군가를 다시 만날 용기를 얻고 싶어요.', good:'courage', lines:{courage:'좋아요. 이번에는 편지를 직접 전할게요!', fear:'편지를 더 깊숙이 숨겨야겠어요…'} },
              { name:'숲의 정령', icon:'🌿', color:'#8fc5a0', issue:'숲이 시끄러워 잠들지 못해요. 마음을 쉬게 해 줄 물약이 있나요?', good:'calm', lines:{calm:'숲의 바람이 다시 잔잔하게 들려요.', anger:'나뭇잎이 모두 붉게 물들 것 같아요!'} },
              { name:'별을 잃은 마법사', icon:'⭐', color:'#c6a2df', issue:'소중한 별을 잃어버렸어요. 다시 찾아 나설 힘이 필요해요.', good:'hope', lines:{hope:'아직 끝난 게 아니군요. 별을 찾아 떠나겠어요!', sad:'별을 생각하니 더 슬퍼져요…'} }
            ];
            // v2.4: one-time purchases. Old saves remain compatible.
            const shopGoods = [
              {id:'shelfPlus', category:'decor', name:'마법 진열대', icon:'🪵', price:100, desc:'매일 새로운 감정 물약 1종 발견! 보유 물약을 전시하면 정확한 처방 시 +5코인'},
              {id:'moonLamp', category:'decor', name:'달빛 조명', icon:'🌙', price:200, desc:'조명 근처에서 달빛 축복을 받아 매일 15코인 획득'},
              {id:'goldPot', category:'decor', name:'황금 가마솥', icon:'⚗️', price:500, desc:'가마솥에서 연구할 때 추가 보상 + 정확한 처방 10코인'},
              {id:'spark', category:'potion', name:'설렘의 물약', icon:'💗', price:150, desc:'새로운 감정 물약과 설렘을 고민하는 손님 해금'},
              {id:'serenity', category:'potion', name:'평온의 물약', icon:'🫧', price:200, desc:'깊은 불안을 가라앉히는 물약과 손님 해금'},
              {id:'memory', category:'potion', name:'기억의 물약', icon:'🔮', price:350, desc:'기억을 잃은 마법사의 특별한 사연 해금'}
            ];
            const shopPotions = [
              {id:'spark',name:'설렘',icon:'💗',color:'#e8a3c3'},
              {id:'serenity',name:'평온',icon:'🫧',color:'#a3c9e4'},
              {id:'memory',name:'기억',icon:'🔮',color:'#b6a2df'}
            ];
            shopPotions.forEach(e => { if(!emotions.some(p=>p.id===e.id)) emotions.push(e); });
            // Rotating stock: new emotions appear every 10 real-world minutes.
            const RESTOCK_MS = 10 * 60 * 1000;
            const rotatingPotions = [
              {id:'courage',name:'용기',icon:'🦁',color:'#efbd74',price:170,issue:'새로운 도전을 앞두고 자꾸 망설이게 돼요.',line:'두려워도 한 걸음 내디딜 수 있겠어요!'},
              {id:'comfort',name:'위로',icon:'🧸',color:'#e8b4a3',price:190,issue:'오늘은 아무에게도 괜찮다는 말을 듣지 못했어요.',line:'따뜻하게 안아 주는 것 같아요.'},
              {id:'focus',name:'집중',icon:'📘',color:'#a6c7e8',price:220,issue:'중요한 일을 앞두고 생각이 너무 흩어져요.',line:'마음이 맑아져서 다시 시작할 수 있겠어요.'},
              {id:'dream',name:'꿈',icon:'🌠',color:'#b6a7e9',price:240,issue:'오랫동안 잊고 지낸 꿈을 다시 찾고 싶어요.',line:'내가 정말 원하던 게 떠올랐어요!'},
              {id:'trust',name:'믿음',icon:'🤝',color:'#a9d5ba',price:260,issue:'친구와 오해가 생겨 다시 믿을 수 있을지 모르겠어요.',line:'천천히 다시 마음을 열어볼게요.'},
              {id:'wonder',name:'호기심',icon:'🔍',color:'#e3c58e',price:280,issue:'세상 모든 것이 시시해진 것 같아요.',line:'새로운 것들을 발견하러 가고 싶어요!'},
              {id:'gratitude',name:'감사',icon:'🌻',color:'#e8cb83',price:310,issue:'늘 곁에 있던 소중함을 잊고 있었어요.',line:'고마운 사람들에게 마음을 전해야겠어요.'},
              {id:'harmony',name:'화해',icon:'🕊️',color:'#b7d7dc',price:330,issue:'소중한 사람에게 먼저 사과하고 싶지만 어려워요.',line:'이제 진심을 전할 용기가 났어요.'},
              {id:'starlight',name:'별빛',icon:'✨',color:'#d7b6ef',price:370,issue:'어두운 밤이 길게만 느껴져요.',line:'작은 별빛이 제 길을 밝혀 주네요.'}
            ];
            rotatingPotions.forEach(e=>{ if(!emotions.some(p=>p.id===e.id)) emotions.push({id:e.id,name:e.name,icon:e.icon,color:e.color}); });
            let stockEpoch = -1, stockIds = [];
            function stockSeed(epoch) { let v=(epoch*1664525+1013904223)>>>0; return ()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;}; }
            function refreshStock() {
                const epoch=Math.floor(Date.now()/RESTOCK_MS);
                if(stockEpoch===epoch && stockIds.length) return;
                const available=rotatingPotions.filter(p=>!known.has(p.id) && !ownedShop.has(p.id));
                const random=stockSeed(epoch);
                for(let i=available.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
                stockIds=available.slice(0,3).map(p=>p.id);
                stockEpoch=epoch;
                save();
            }
            function restockCountdown(){const remain=RESTOCK_MS-Date.now()%RESTOCK_MS;return `${String(Math.floor(remain/60000)).padStart(2,'0')}:${String(Math.floor(remain%60000/1000)).padStart(2,'0')}`;}

            const shopGuests = [
              {name:'소이',icon:'💌',color:'#f1b1ca',issue:'오래 기다린 고백을 앞두고 있어요. 두근거리는 마음을 소중히 간직하고 싶어요.',good:'spark',lines:{spark:'이 두근거림도 제 마음이었군요. 용기 내서 전할게요!'}},
              {name:'이안',icon:'☁️',color:'#b5d7e7',issue:'작은 소리에도 마음이 불안해져요. 조용히 잠들고 싶어요.',good:'serenity',lines:{serenity:'마음에 잔잔한 호수가 생긴 기분이에요. 이제 쉬어볼래요.'}},
              {name:'기억을 잃은 마법사',icon:'🔮',color:'#b8a4db',special:true,issue:'내가 지키려던 가장 소중한 약속이 기억나지 않아요. 도와줄 수 있나요?',good:'memory',lines:{memory:'기억났어요! 이 약국에 다시 오겠다는 약속이었군요.'}}
            ];
            rotatingPotions.forEach(e=>shopGuests.push({name:`${e.name}을 찾는 여행자`,icon:e.icon,color:e.color,issue:e.issue,good:e.id,lines:{[e.id]:e.line}}));
            let discoveryCounts = {pouch:0,dust:0,chest:0};
            let ownedShop = new Set(), shopTab = 'decor', dailyShelfDay = -1, dailyLampDay = -1;
            let shelfDisplayId = null, shelfLastGift = null, heartCrystals = 0;
            function shopOwned(id) { return ownedShop.has(id); }
            function shopEscape(v) { return String(v).replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])); }
            let guestIndex = 0, guest = null, guestPhase = 'none', guestWait = 0, focus = 0, focusTarget = 0, selected = [], chosen = null, mode = '', reaction = '', coins = 0, served = 0, callDelay = 1.4, closeTimer = 0;
            try {
                const save = JSON.parse(localStorage.getItem('emotion-apothecary-v2') || '{}');
                if (Array.isArray(save.known))
                    known = new Set([...known, ...save.known]);
                coins = Number(save.coins) || 0;
                villageLetters=Array.isArray(save.villageLetters)?save.villageLetters.filter(x=>x&&typeof x.name==='string'&&typeof x.message==='string'&&Number.isFinite(x.day)).slice(-24):[];
                villageFlowerDay=Number.isFinite(save.villageFlowerDay)?save.villageFlowerDay:-1;
                villageFlowerCollected=!!save.villageFlowerCollected;
                served = Number(save.served) || 0;
                guestIndex = Number(save.guestIndex) || 0;
                missionWins = Number(save.missionWins) || 0; missionCalendarDay = String(save.missionCalendarDay || missionDay()); if(missionCalendarDay !== String(missionDay())) { missionWins=0; missionCalendarDay=String(missionDay()); } specialVisits = Number(save.specialVisits) || 0; missionRewardedDay = Number(save.missionRewardedDay) || 0;
                if(save.discoveryCounts && typeof save.discoveryCounts==='object') { for(const k of ['pouch','dust','chest']) discoveryCounts[k]=Math.max(0,Number(save.discoveryCounts[k])||0); }
                if(Array.isArray(save.ownedShop)) ownedShop = new Set(save.ownedShop); dailyShelfDay = Number.isFinite(save.dailyShelfDay) ? save.dailyShelfDay : -1; dailyLampDay = Number.isFinite(save.dailyLampDay) ? save.dailyLampDay : -1; shelfDisplayId = typeof save.shelfDisplayId === 'string' ? save.shelfDisplayId : null; shelfLastGift = save.shelfLastGift || null; heartCrystals = Math.max(0, Number(save.heartCrystals)||0);
                shopPotions.forEach(e => { if(ownedShop.has(e.id)) known.add(e.id); });
                rotatingPotions.forEach(e=>{if(ownedShop.has(e.id)) known.add(e.id);});
            }
            catch (e) { }
            refreshStock();
            function save() { try {
                localStorage.setItem('emotion-apothecary-v2', JSON.stringify({ known: [...known], coins, served, guestIndex, missionWins, missionCalendarDay, specialVisits, missionRewardedDay, ownedShop:[...ownedShop], dailyShelfDay, dailyLampDay, shelfDisplayId, shelfLastGift, heartCrystals, discoveryCounts, accurateConsultations, villageLetters, villageFlowerDay, villageFlowerCollected }));
            }
            catch (e) { } }
            function item(id) { return emotions.find(x => x.id === id); }
            function uniqueKnownPotions() {
                const names = new Set();
                return emotions.filter(e => {
                    if (!known.has(e.id)) return false;
                    const key = e.name.trim().replace(/\s+/g, '');
                    if (names.has(key)) return false;
                    names.add(key);
                    return true;
                });
            }
            // Each icon is drawn from a tiny 12x12 pixel grid, independent of OS emoji fonts.
            function pixelIcon(kind, color) {
                const patterns = {
                    heart:['............','..XX....XX..','.XXXX..XXXX.','XXXXXXXXXXXX','XXXXXXXXXXXX','.XXXXXXXXXX.','..XXXXXXXX..','...XXXXXX...','....XXXX....','.....XX.....','............','............'],
                    sun:['.....XX.....','.....XX.....','..X..XX..X..','...XXXXXX...','..XXXXXXXX..','XXXXXXXXXXXX','XXXXXXXXXXXX','..XXXXXXXX..','...XXXXXX...','..X..XX..X..','.....XX.....','............'],
                    drop:['.....XX.....','.....XX.....','....XXXX....','....XXXX....','...XXXXXX...','...XXXXXX...','..XXXXXXXX..','..XXXXXXXX..','...XXXXXX...','....XXXX....','............','............'],
                    leaf:['.........XX.','.......XXXX.','.....XXXXXX.','...XXXXXXXX.','..XXXXXXXX..','.XXXXXXXX...','.XXXXXXX....','..XXXXX.....','...XXX......','....X.......','............','............'],
                    flame:['......XX....','.....XXX....','....XXXX....','...XXXXXX...','....XXXXX...','..XXXXXXXX..','..XXXXXXXX..','...XXXXXX...','....XXXX....','.....XX.....','............','............'],
                    star:['.....XX.....','.....XX.....','.....XX.....','...XXXXXX...','XXXXXXXXXXXX','.XXXXXXXXXX.','...XXXXXX...','....XXXX....','...XX..XX...','..XX....XX..','............','............'],
                    moon:['.....XXXXX..','...XXXXXX...','..XXXXX.....','..XXXX......','.XXXX.......','.XXXX.......','..XXXX......','..XXXXX.....','...XXXXXX...','.....XXXXX..','............','............'],
                    bottle:['....XXXX....','....XXXX....','...XXXXXX...','...X....X...','..XX....XX..','..XX....XX..','..XXXXXXXX..','..XXXXXXXX..','..XXXXXXXX..','..XXXXXXXX..','...XXXXXX...','............'],
                    coin:['....XXXX....','..XXXXXXXX..','.XXXXXXXXXX.','.XXXXXXXXXX.','XXXXXXXXXXXX','XXXXXXXXXXXX','XXXXXXXXXXXX','XXXXXXXXXXXX','.XXXXXXXXXX.','.XXXXXXXXXX.','..XXXXXXXX..','....XXXX....'],
                    mystery:['............','...XXXXXX...','..XX....XX..','......XX....','.....XX.....','....XX......','....XX......','............','....XX......','....XX......','............','............'],
                    chest:['............','............','..XXXXXXXX..','.XXXXXXXXXX.','.XXXXXXXXXX.','.XXXXXXXXXX.','XXXXXXXXXXXX','XXX..XX..XXX','XXX..XX..XXX','XXXXXXXXXXXX','.XXXXXXXXXX.','............']
                };
                const pal = {heart:'#ef7eaa',sun:'#ffd06c',drop:'#80c8ee',leaf:'#8ed1a3',flame:'#f2a16e',star:'#f3d78a',moon:'#b4a5e5',bottle:'#b6a1e4',coin:'#eac56c',chest:'#cda17a',mystery:'#f5dfb9'};
                const rows=patterns[kind]||patterns.bottle;
                const fill=color||pal[kind]||pal.bottle;
                let rects='';
                rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='X')rects+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;}));
                return `<svg class="pixel-icon" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" fill="${fill}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
            }
            function potionPixel(e) {
                const map={joy:'sun',sad:'drop',love:'heart',fear:'moon',anger:'flame',calm:'leaf',longing:'moon',courage:'star',flutter:'heart',hope:'star'};
                return pixelIcon(map[e.id]||'bottle',e.color);
            }
            function potionTile(e, attr, selectedClass = '') {
                return `<button type="button" class="potion-tile ${selectedClass}" ${attr} aria-label="${e.name}의 물약"><span class="bottle"><span class="bottle-neck"></span><span class="bottle-liquid" style="--liquid:${e.color}"></span><span class="bottle-spark">${potionPixel(e)}</span></span><span class="potion-label">${e.name}</span></button>`;
            }
            function drawResearchWitch() {
                const c=modal.querySelector('#researchWitch');
                if(!c)return;
                const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
                const r=(a,b,w,h,color)=>{x.fillStyle=color;x.fillRect(a,b,w,h);};
                x.clearRect(0,0,48,56);
                r(14,7,20,5,'#33253d');r(19,1,11,9,'#33253d');r(21,2,7,7,'#78558d');
                r(11,12,26,5,'#33253d');r(13,13,22,3,'#9c78b4');
                r(15,17,19,21,'#65405a');r(18,19,13,17,'#f3c6a5');
                r(20,26,3,3,'#33253d');r(29,26,3,3,'#33253d');r(24,32,4,2,'#bb6e78');
                r(15,38,19,12,'#55466f');r(11,39,5,9,'#d1a1bf');r(33,39,5,9,'#d1a1bf');
                r(18,50,6,4,'#302639');r(28,50,6,4,'#302639');
            }

            let missionCalendarDay = '';
            function missionDay() { const d = new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
            function syncMissionDay() { const today = String(missionDay()); if(missionCalendarDay && missionCalendarDay!==today){missionWins=0;save();} missionCalendarDay=today; }

            function updateMission() { syncMissionDay(); const d=missionDay(); const count=Math.min(3,missionWins); missionEl.textContent = `오늘의 미션 · 정확한 처방 ${count}/3회 ${missionRewardedDay===d?'(완료)':'(달성 시 +50코인)'}`; }
            function awardMission() { syncMissionDay(); const d=missionDay(); if(missionWins>=3 && missionRewardedDay!==d){ missionRewardedDay=d; coins+=50; playEffect('discover'); showReaction('오늘의 미션 완료! +50코인'); save(); } updateMission(); }
            updateMission();
            function beginGuest() { if (guest || opened)
                return; const isSpecial = (guestIndex + 1) % 4 === 0; const unlocked = shopGuests.filter(g=>ownedShop.has(g.good)); const pool = [...guests,...unlocked.filter(g=>!g.special)]; const specialPool = [...specials,...unlocked.filter(g=>g.special)]; const d = isSpecial ? specialPool[Math.floor(guestIndex / 4) % specialPool.length] : pool[guestIndex % pool.length]; guestMood = 'normal'; guest = { ...d, special:isSpecial || !!d.special, x: 398, y: 552 }; if(isSpecial) showReaction('특별한 손님이 찾아왔어요!'); guestPhase = 'enter'; guestWait = 0; callDelay = 0; status.textContent = '새로운 손님이 오셨어요'; playEffect('door'); if(!isSpecial) showReaction('새로운 손님이 오셨어요'); save(); }
            function npc() { if (!guest)
                return; const x = Math.round(guest.x), y = Math.round(guest.y); ellipse(x, y + 9, 12, 5, '#3c2a39'); rect(x - 10, y - 9, 20, 20, guest.color); rect(x - 8, y - 24, 16, 18, '#f0c6ac'); rect(x - 11, y - 27, 22, 7, '#5b3a47'); if (guestMood === 'happy') { rect(x - 6,y - 17,5,2,'#443443'); rect(x + 2,y - 17,5,2,'#443443'); rect(x - 3,y - 10,7,2,'#ba6578'); } else if (guestMood === 'sad') { rect(x - 5,y - 17,3,4,'#443443'); rect(x + 4,y - 17,3,4,'#443443'); rect(x - 7,y - 10,2,5,'#8ad0ee'); } else if (guestMood === 'angry') { rect(x - 6,y - 19,6,3,'#443443'); rect(x + 2,y - 19,6,3,'#443443'); rect(x - 3,y - 9,7,2,'#7a374d'); } else if (guestMood === 'surprised') { rect(x - 5,y - 17,3,5,'#443443'); rect(x + 4,y - 17,3,5,'#443443'); rect(x - 1,y - 10,3,4,'#ba6578'); } else { rect(x - 5,y - 17,3,3,'#443443'); rect(x + 4,y - 17,3,3,'#443443'); } rect(x - 7, y + 10, 5, 6, '#493447'); rect(x + 3, y + 10, 5, 6, '#493447'); if (guestPhase === 'wait') {
                ellipse(x, y - 44, 17, 15, '#f8e2b8');
                text('!', x, y - 38, 20, '#4a3246');
            } }
            // 상담 테스트: 질문을 통해 감정을 파악하고, 맥락에 맞는 대체 처방을 인정합니다.
            const consultationStories = {
                '서하': { questions:[['거절이 두려운 건가요?', '네. 거절당할까 겁나지만, 먼저 다가갈 용기를 얻고 싶어요.'],['마음을 천천히 정리하고 싶은가요?', '마음을 가라앉히는 것도 좋지만, 결국 한 걸음 내딛고 싶어요.']], alternatives:['calm','confidence'], reason:'떨리더라도 먼저 다가갈 용기가 가장 필요했어요.' },
                '도윤': { questions:[['가장 힘든 건 불안한 마음인가요?', '맞아요. 심장이 두근거려서 차분히 준비하고 싶어요.'],['발표에 나갈 용기가 필요한가요?', '용기도 필요하지만, 지금은 불안을 가라앉히는 게 먼저예요.']], alternatives:['courage','confidence'], reason:'발표 전 불안을 진정시키는 평온이 가장 필요했어요.' },
                '미루': { questions:[['친구를 잊고 싶은 건가요?', '아니요. 잊고 싶은 게 아니라 그리운 마음을 잘 간직하고 싶어요.'],['다시 만날 희망이 필요한가요?', '다시 만날 수 있다면 좋겠지만, 지금은 그리움을 인정하고 싶어요.']], alternatives:['hope','comfort','sad'], reason:'그리움을 억누르지 않고 받아들이고 싶었어요.' },
                '하린': { questions:[['사과하기가 두려운 건가요?', '무섭기도 하지만, 제가 상처 준 일을 제대로 돌아보고 싶어요.'],['먼저 찾아갈 용기가 필요하군요?', '맞아요. 다만 용기를 내기 전에 제 잘못을 인정하고 싶어요.']], alternatives:['courage','forgiveness','calm'], reason:'상대에게 상처 준 일을 돌아보는 후회의 마음이 중요했어요.' },
                '루카': { questions:[['지금은 쉬어 가고 싶은가요?', '쉬는 것도 좋지만, 내일이 조금 기대됐으면 좋겠어요.'],['작은 즐거움을 찾고 싶은가요?', '네. 아주 작은 것이라도 내일을 기대할 이유가 있었으면 해요.']], alternatives:['joy','calm','comfort'], reason:'내일을 다시 기대할 작은 희망이 필요했어요.' }
            };
            let consultStep = 0, consultQuestion = -1;
            let accurateConsultations = 0, consultationGuideOpen = false, consultationHintUsed = false;
            try { const progress = JSON.parse(localStorage.getItem('emotion-apothecary-v2') || '{}'); accurateConsultations = Math.max(0, Number(progress.accurateConsultations) || 0); } catch(e) {}
            function witchRank() { return accurateConsultations < 10 ? '견습 마녀' : accurateConsultations < 30 ? '초급 마녀' : '숙련 마녀'; }
            function consultationTip() {
                const name = item(guest.good)?.name || '따뜻함';
                if(accurateConsultations < 10) return `📖 견습 힌트 · 이 손님에게는 ${name}의 물약이 가장 잘 맞을 것 같아요.`;
                if(accurateConsultations < 30) return `✨ 초급 힌트 · 손님의 마음에서 ${name}의 감정이 느껴져요. 어떤 물약이 어울릴까요?`;
                return '';
            }
            function consultationGuide() {
                return `<div class="consult-guide" style="margin:10px 0;padding:12px;border:1px solid #b998a7;border-radius:10px;background:#352a3c;color:#fff0db"><strong>📖 마법 상담 노트</strong><p>손님의 첫 고민과 추가 답변을 함께 읽고, 지금 가장 필요한 감정을 찾아보세요.</p><p>완벽한 처방은 기본 +30코인(특별 손님 +60), 부분 성공 +15코인, 일반 손님의 부적합 처방 0코인, 특별 손님의 부적합 처방 -5코인이에요.</p><p>정확한 처방 10회에 초급, 30회에 숙련 마녀가 돼요. 숙련 마녀는 자동 힌트 없이 정확히 처방하면 +5코인을 더 받아요.</p><p>감정과 물약을 헷갈린다면 질문을 다시 읽거나 물약 이름을 비교해 보세요.</p></div>`;
            }
            function consultData() {
                return consultationStories[guest.name] || {
                    questions:[['지금 가장 필요한 마음은 무엇인가요?', `제게는 ${item(guest.good)?.name || '따뜻한'}의 감정이 가장 필요해요.`],['조금 더 이야기해 주실래요?', `지금 고민을 이겨 내는 데 ${item(guest.good)?.name || '따뜻한'}의 마음이 도움이 될 것 같아요.`]],
                    alternatives: ['calm','comfort','courage','hope'].filter(id=>id!==guest.good),
                    reason: `손님은 ${item(guest.good)?.name || '따뜻한'}의 감정을 가장 원했어요.`
                };
            }
            function openModal(nextMode) { if(nextMode === 'talk'){consultStep=0;consultQuestion=-1;consultationGuideOpen=false;consultationHintUsed=false;} mode = nextMode; opened = true; overlay.style.display = 'flex'; keys.clear(); focusTarget = nextMode === 'talk' || nextMode === 'result' ? 1 : 0; renderModal(); }
            function closeModal() { opened = false; overlay.style.display = 'none'; mode = ''; keys.clear(); focusTarget = 0; }
            function renderModal() {
                if (mode === 'shop') {
                    renderShop();
                }
                else if (mode === 'shelf') { renderShelf(); }
                else if (mode === 'research') {
                    const selectedPotion = id => { const e=item(id); return e ? `<span class="bottle small"><span class="bottle-neck"></span><span class="bottle-liquid" style="--liquid:${e.color}"></span><span class="bottle-spark">${potionPixel(e)}</span></span><small>${e.name}</small>` : `<span class="empty-slot">+</span><small>물약 선택</small>`; };
                    modal.innerHTML = `<h2>${pixelIcon('bottle')} 마녀의 감정 제작대</h2><div class="research-scene"><div class="research-witch"><canvas id="researchWitch" width="48" height="56"></canvas><small>마녀</small></div><div class="research-cauldron"><div class="steam">${pixelIcon('star')} ${pixelIcon('star')}</div><div class="cauldron-rim"></div><div class="cauldron-body">${pixelIcon('star')}</div><div class="cauldron-fire">${pixelIcon('flame')}</div></div><div class="research-caption">두 감정을 골라<br>가마솥에 넣어 보세요!</div></div><div class="recipe-grid"><div class="recipe-slot">${selectedPotion(selected[0])}</div><span class="recipe-plus">+</span><div class="recipe-slot">${selectedPotion(selected[1])}</div><span class="recipe-arrow">➜</span><div class="recipe-slot result-slot"><span class="bottle small mystery"><span class="bottle-neck"></span><span class="bottle-liquid"></span><span class="bottle-spark">${pixelIcon('mystery')}</span></span><small>새로운 물약</small></div></div><div class="research-subtitle">내 물약 보관함 <span>${uniqueKnownPotions().length}종</span></div><div class="potion-inventory" id="mixChoices">${uniqueKnownPotions().map(x => potionTile(x,`data-emotion="${x.id}"`,selected.includes(x.id)?'selected':'')).join('')}</div><button class="action" id="mix" ${selected.length !== 2 ? 'disabled' : ''}>${pixelIcon('star')} 가마솥에서 조합하기</button><div id="mixResult" class="dialogue" style="display:none"></div><button id="dismiss">약국으로 돌아가기</button>`;
                    drawResearchWitch();
                    modal.querySelectorAll('[data-emotion]').forEach(b => b.onclick = () => { const id = b.dataset.emotion; if (selected.includes(id))
                        selected = selected.filter(x => x !== id);
                    else if (selected.length < 2)
                        selected.push(id); renderModal(); });
                    modal.querySelector('#mix').onclick = () => { const k = [...selected].sort().join('|'); const found = recipes[k]; const out = modal.querySelector('#mixResult'); out.style.display = 'block'; if (found) {
                        const fresh = !known.has(found); playEffect(fresh ? 'discover' : 'brew');
                        known.add(found);
                        out.innerHTML = `${fresh ? '🎉 새로운 감정 발견!' : '📖 이미 발견한 조합'}<br><strong>${potionPixel(item(found))} ${item(found).name}</strong> 물약을 만들었어요!`;
                        save();
                    }
                    else {
                        playEffect('fail'); out.textContent = '🫧 보글보글… 아직 새로운 감정이 만들어지지 않았어요. 다른 조합을 연구해 보세요.';
                    } selected = []; modal.querySelector('#mix').disabled = true; };
                }
                else if (mode === 'talk') {
                    const story=consultData();
                    const questions=story.questions;
                    const dialogue=consultStep===0 ? guest.issue : questions[consultQuestion][1];
                    const consultUI=consultStep===0 ? `<p>손님의 마음을 알아볼까요? 질문을 선택해 보세요.</p><div class="choices">${questions.map((q,i)=>`<button data-ask="${i}">${q[0]}</button>`).join('')}</div><button id="dismiss">잠시 연구하고 올게요</button>` : `<p class="hint">💬 손님의 이야기를 들었어요. 다른 질문을 하거나 물약을 골라 보세요.</p><div class="choices">${questions.map((q,i)=>`<button data-ask="${i}" ${i===consultQuestion?'class="selected"':''}>${q[0]}</button>`).join('')}</div><p>어떤 물약이 이 마음에 도움이 될까요?</p><div class="choices">${uniqueKnownPotions().map(x=>`<button data-give="${x.id}" class="${chosen===x.id?'selected':''}">${potionPixel(x)} ${x.name}의 물약</button>`).join('')}</div><button class="action" id="give" ${!chosen?'disabled':''}>🧪 선택한 물약 건네주기</button><button id="dismiss">잠시 연구하고 올게요</button>`;
                    modal.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px"><span class="hint" style="margin:0">🪄 ${witchRank()} · 정확한 처방 ${accurateConsultations}회</span><button type="button" id="consultGuideToggle" style="width:auto;min-width:0;flex:none;display:inline-flex;align-items:center;justify-content:center;padding:5px 9px;font-size:11px;line-height:1.3;margin:0;border-radius:7px">📖 상담 노트 ${consultationGuideOpen?'닫기':'보기'}</button></div><div class="row"><canvas class="portrait" width="48" height="48" aria-label="${guest.name}의 픽셀 초상화"></canvas><div><h2>${guest.name}의 고민</h2><span class="note">${guest.special?'특별 손님 · 비밀 의뢰':`손님 ${served+1} · 마음 상담`}</span></div></div><div class="dialogue">“${dialogue}”</div>${consultationTip()?`<p class="hint">${consultationTip()}</p>`:''}${consultationGuideOpen?consultationGuide():''}${consultUI}`;
                    refreshGuestPortrait();
                    const guideButton=modal.querySelector('#consultGuideToggle');
                    if(guideButton) guideButton.onclick=()=>{consultationGuideOpen=!consultationGuideOpen;if(consultationGuideOpen) consultationHintUsed=true;renderModal();};
                    modal.querySelectorAll('[data-ask]').forEach(b=>b.onclick=()=>{consultStep=1;consultQuestion=Number(b.dataset.ask);renderModal();});
                    modal.querySelectorAll('[data-give]').forEach(b=>b.onclick=()=>{chosen=b.dataset.give;renderModal();});
                    const give=modal.querySelector('#give');
                    if(give) give.onclick=()=>{
                        const good=chosen===guest.good;
                        const expertBonus=good && accurateConsultations>=30 && !consultationHintUsed ? 5 : 0;
                        const helpful=!good && story.alternatives.includes(chosen);
                        const harmful=!good && ['fear','anger','attachment','jealousy'].includes(chosen) && !helpful;
                        resultKind=good?'good':helpful?'partial':harmful?'bad':'miss';
                        resultDelta=good?(guest.special?60:30)+(shopOwned('goldPot')?10:0)+(shopOwned('shelfPlus')&&shelfDisplayId===chosen?5:0)+expertBonus:helpful?15:guest.special?-5:0;
                        reaction=good?(guest.lines[chosen]||'제 마음을 알아주셔서 고마워요!'):helpful?(guest.lines[chosen]||'이 물약도 제 마음에 도움이 될 것 같아요. 고마워요!'):harmful?'아직 제 마음과는 조금 다른 것 같아요.':'마음에 꼭 맞지는 않지만, 이야기 들어주셔서 감사해요.';
                        playEffect(good?'good':harmful?'fail':'serve');
                        guestMood=good?'happy':harmful?'sad':'surprised';
                        showReaction(good?'마음에 꼭 맞는 처방이에요!':helpful?'도움이 되는 처방이에요!':'상담 결과를 확인하세요');
                        coins=Math.max(0,coins+resultDelta);served++;guestIndex++;recordVillageLetter(guest,good,helpful);
                        if(good){missionWins++;accurateConsultations++;}awardMission();
                        save();mode='result';renderModal();
                    };
                }
                else if (mode === 'result') {
                    const good = chosen === guest.good;
                    modal.innerHTML = `<h2>${good ? `${pixelIcon('heart')} 마음이 한결 가벼워졌어요!` : resultKind==='partial' ? `${pixelIcon('leaf')} 조금은 도움이 되었어요` : `${pixelIcon('drop')} 아쉬운 처방`}</h2><div class="row"><canvas class="portrait" width="48" height="48" aria-label="${guest.name}의 반응 표정"></canvas><div><strong>${guest.name}</strong><div class="note">${potionPixel(item(chosen))} ${item(chosen).name}의 물약을 마셨어요</div></div></div><div class="dialogue">“${reaction}”</div><p class="hint">${good ? '정확한 처방 성공!' : resultKind==='partial' ? '도움이 되는 처방이에요. 가장 필요한 감정과는 조금 달랐어요.' : '손님의 마음과 조금 달랐어요. 다음 상담에서 다시 살펴보세요.'} ${resultDelta>0?'+':''}${resultDelta}코인</p><p class="hint">💡 ${consultData().reason} ${!good && resultKind==='partial'?'선택한 물약도 도움이 되는 대안이에요.':''}</p><button class="action" id="leave">👋 손님 배웅하기</button>`;
                    refreshGuestPortrait(guestMood === 'angry' ? 'surprised' : guestMood === 'sad' ? 'normal' : guestMood);
                    modal.querySelector('#leave').onclick = () => { closeModal(); guestPhase = 'exit'; playEffect('leave'); chosen = null; status.textContent = `${guest.name}님이 약국을 나서고 있어요.`; };
                }
                const dismiss = modal.querySelector('#dismiss');
                if (dismiss)
                    dismiss.onclick = closeModal;
            }
            function renderShop() {
                refreshStock();
                const goods = shopTab==='decor' ? shopGoods.filter(g=>g.category==='decor') : [
                    ...shopGoods.filter(g=>g.category==='potion' && !shopOwned(g.id) && !known.has(g.id)),
                    ...stockIds.map(id=>{const p=rotatingPotions.find(e=>e.id===id);return p&&{...p,category:'potion',name:p.name+'의 물약',desc:'구매 시 새로운 처방과 해당 감정을 찾는 손님 해금'};}).filter(Boolean)
                ];
                modal.innerHTML = `<h2>🏠 마녀의 상점</h2><p>손님을 도와 모은 코인으로 약국을 꾸미고 새로운 이야기를 열어보세요.</p><div class="bar"><span class="shop-balance">💰 ${coins}코인</span><span>${shopTab==='potion'?'새 물약 입고까지 '+restockCountdown():'구매한 인테리어 '+shopGoods.filter(g=>g.category==='decor'&&shopOwned(g.id)).length+'개'}</span></div><div class="shop-tabs"><button type="button" data-tab="decor" class="${shopTab==='decor'?'active':''}">인테리어</button><button type="button" data-tab="potion" class="${shopTab==='potion'?'active':''}">물약</button></div><div class="shop-list">${goods.length?goods.map(g=>`<div class="shop-item"><span class="shop-icon">${g.category==='potion'?potionPixel({id:g.id,color:'#c9a0d6'}):pixelIcon('chest')}</span><div class="shop-detail"><strong>${shopEscape(g.name)}</strong><p>${shopEscape(g.desc)}</p></div><button type="button" data-buy="${g.id}" ${shopOwned(g.id)||coins<g.price?'disabled':''}>${shopOwned(g.id)?'구매 완료':g.price+' G'}</button></div>`).join(''):'<p class="hint">현재 판매할 새 물약이 없어요. 다음 입고를 기다려 주세요!</p>'}</div><p class="hint">${shopTab==='potion'?'이미 보유하거나 발견한 물약은 진열되지 않아요. 10분마다 새로운 물약이 입고돼요.':'구매한 가구는 약국에서 직접 사용하거나 보너스를 받을 수 있어요.'}</p><button id="dismiss" type="button">약국으로 돌아가기</button>`;
                modal.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{shopTab=b.dataset.tab;renderShop();});
                modal.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
                    const g=[...shopGoods,...rotatingPotions].find(x=>x.id===b.dataset.buy);
                    if(!g || shopOwned(g.id) || known.has(g.id) && g.category!=='decor' || coins<g.price) return;
                    coins-=g.price; ownedShop.add(g.id);
                    if(g.category==='potion' || rotatingPotions.some(p=>p.id===g.id)) known.add(g.id);
                    stockIds=stockIds.filter(id=>id!==g.id);
                    save(); playEffect('discover'); showReaction(`${g.name} 구매 완료!`); renderShop();
                });
                modal.querySelector('#dismiss').onclick=closeModal;
            }
            setInterval(()=>{if(mode==='shop' && shopTab==='potion') renderShop();},1000);
            document.getElementById('openShop').addEventListener('click',()=>{ if(!opened){shopTab='decor';openModal('shop');} });
            function showReaction(message) { reactionBubble.textContent = message; reactionBubble.classList.add('show'); reactionUntil = performance.now() + 3000; }
            function nearbyUpgrade() {
                if (shopOwned('shelfPlus') && Math.hypot(p.x - 190, p.y - 242) < 125) return 'shelfPlus';
                if (shopOwned('moonLamp') && Math.hypot(p.x - 665, p.y - 205) < 125) return 'moonLamp';
                return null;
            }
            function renderShelf() {
                const today = Math.floor(Date.now() / 86400000);
                const displayed = item(shelfDisplayId);
                const last = item(shelfLastGift);
                modal.innerHTML = `<h2>${pixelIcon('bottle')} 마법 진열대</h2>
                  <p>매일 새로운 감정을 발견하고, 마음에 드는 물약을 전시해 보세요.</p>
                  <div class="dialogue"><strong>오늘의 선물</strong><p>${dailyShelfDay===today ? (last ? `${potionPixel(last)} ${last.name}의 물약을 받았어요! 보관함에 추가됐어요.` : `마음의 결정 1개를 받았어요! (보유 ${heartCrystals}개)`) : '아직 받지 않았어요. 아래 버튼을 눌러 보세요.'}</p></div>
                  <button class="action" id="shelfGift" ${dailyShelfDay===today?'disabled':''}>${dailyShelfDay===today?'오늘은 수령 완료':'오늘의 무료 감정 물약 받기'}</button>
                  <div class="research-subtitle">전시 중인 물약 <span>${displayed?displayed.name:'없음'}</span></div>
                  <p class="hint">전시한 물약으로 손님에게 정확히 처방하면 추가로 5코인을 받아요. 전시 물약은 언제든 바꿀 수 있어요.</p>
                  <div class="potion-inventory">${uniqueKnownPotions().map(e=>potionTile(e,`data-shelf="${e.id}"`,shelfDisplayId===e.id?'selected':'')).join('')}</div>
                  <p class="hint">${heartCrystals?`모든 감정을 이미 발견했을 때 받는 마음의 결정: ${heartCrystals}개 (진열대 수집 기념품)`:'아직 발견하지 못한 감정 중 하나를 무료로 얻을 수 있어요.'}</p>
                  <button id="dismiss">약국으로 돌아가기</button>`;
                modal.querySelector('#shelfGift').onclick=()=>{
                    if(dailyShelfDay===today) return;
                    const pool=emotions.filter(e=>!known.has(e.id));
                    if(pool.length){const gift=pool[Math.floor(Math.random()*pool.length)];known.add(gift.id);shelfLastGift=gift.id;showReaction(`${gift.name}의 물약 발견!`);}
                    else {heartCrystals++;shelfLastGift=null;showReaction('마음의 결정 1개 획득!');}
                    dailyShelfDay=today;save();playEffect('discover');renderShelf();
                };
                modal.querySelectorAll('[data-shelf]').forEach(b=>b.onclick=()=>{shelfDisplayId=b.dataset.shelf;save();playEffect('brew');renderShelf();});
                modal.querySelector('#dismiss').onclick=closeModal;
            }
            function useUpgrade(id) {
                const today = Math.floor(Date.now() / 86400000);
                if(id === 'shelfPlus') { openModal('shelf'); return; }
                if(id === 'moonLamp') {
                    if(dailyLampDay === today) { showReaction('달빛 축복은 내일 다시 받을 수 있어요!'); return; }
                    dailyLampDay = today; coins += 15; showReaction('달빛 축복! +15코인');
                }
                save(); playEffect('discover');
            }

            // Hidden discoveries spawn on walkable tiles, not inside walls or furniture.
            const discoveryTypes = {
                pouch:{name:'잃어버린 동전 주머니',min:10,max:30},
                dust:{name:'반짝이는 마법 가루',min:5,max:15},
                chest:{name:'비밀 보물상자',min:50,max:100}
            };
            let discovery = null;
            let discoveryNextAt = performance.now() + 22000;
            function findDiscoverySpot(){
                for(let i=0;i<110;i++){
                    const x=76+Math.random()*648,y=140+Math.random()*354;
                    if(collide(x,y)||Math.hypot(x-p.x,y-p.y)<105) continue;
                    if(Math.hypot(x-397,y-265)<76 || Math.hypot(x-412,y-414)<65) continue;
                    if(guest && Math.hypot(x-guest.x,y-guest.y)<70) continue;
                    // Four nearby samples ensure an accessible spot, not a tiny gap.
                    if([[x+16,y],[x-16,y],[x,y+16],[x,y-16]].some(([a,b])=>collide(a,b)))continue;
                    return {x:Math.round(x),y:Math.round(y)};
                }
                return null;
            }
            function spawnDiscovery(now){
                const pos=findDiscoverySpot();
                if(!pos){discoveryNextAt=now+15000;return;}
                const roll=Math.random();
                const type=roll<0.12?'chest':roll<0.50?'pouch':'dust';
                discovery={...pos,type,expiresAt:now+95000};
            }
            function nearbyDiscovery(){
                return discovery && Math.hypot(p.x-discovery.x,p.y-discovery.y)<57 ? discovery:null;
            }
            function collectDiscovery(){
                const found=nearbyDiscovery();if(!found)return false;
                const data=discoveryTypes[found.type];
                const amount=data.min+Math.floor(Math.random()*(data.max-data.min+1));
                coins+=amount;discoveryCounts[found.type]++;
                discovery=null;
                discoveryNextAt=performance.now()+45000+Math.random()*65000;
                save();playEffect('discover');
                showReaction(`✦ ${data.name} 발견! +${amount}코인`);
                status.textContent=`🔎 ${data.name}을 발견했어요! +${amount}코인`;
                return true;
            }
            function drawDiscovery(){
                if(!discovery)return;
                const {x,y,type}=discovery;
                const pulse=Math.sin(performance.now()/330)*2;
                ellipse(x,y+13,17,5,'#3e2c42');
                if(type==='pouch'){
                    box(x-11,y-8,22,23,'#c39a64','#5d4050');
                    rect(x-6,y-12,12,6,'#f4d38e');
                    rect(x-2,y,4,7,'#ffe4a0');
                }else if(type==='dust'){
                    ellipse(x,y,8+pulse,8+pulse,'#b48bda');
                    rect(x-2,y-13,4,26,'#f2d7ff');rect(x-13,y-2,26,4,'#f2d7ff');
                }else{
                    box(x-16,y-10,32,26,'#866092','#3b2b4d');
                    rect(x-14,y-6,28,6,'#e4b56f');rect(x-3,y,6,9,'#fce5a4');
                }
                if(Math.sin(performance.now()/280)>0){rect(x+17,y-17,4,9,'#ffe7b4');rect(x+14,y-14,10,3,'#ffe7b4');}
            }
            function discoverySummary(){return `🔎 발견 도감 · 동전 주머니 ${discoveryCounts.pouch}회 · 마법 가루 ${discoveryCounts.dust}회 · 보물상자 ${discoveryCounts.chest}회`;}
            function interact() { if(scene === "village" && !opened) {
                if(villageNearBuilding('post')){villageMailbox();return;}
                if(villageNearBuilding('flower')||villageFlowerNear()){villageFlowerVisit();return;}
                const home=villageBuildings.find(b=>b.kind==='home'&&Math.hypot(p.x-(b.x+b.w/2),p.y-(b.y+b.h+16))<78);
                if(home){openVillagePanel(`<h2>${shopEscape(home.label)}</h2><div class="dialogue">“이곳에는 아직 알려지지 않은 이야기가 있어요. 마을 주민들과 친해지면 더 많은 이야기를 들을 수 있을 거예요.”</div><button class="action" data-village-close>돌아가기</button>`);return;}
                const person=villagePeople.find(v=>Math.hypot(p.x-v.x,p.y-v.y)<88);
                if(person){ mode='villageTalk';opened=true;overlay.style.display='flex';keys.clear();
                    modal.innerHTML=`<h2>${person.name}</h2><div class="dialogue">“${person.line}”</div><p>마녀: “그 마음, 소중히 간직해 주세요.”</p><button class="action" id="villageClose">따뜻한 인사 나누기</button>`;
                    modal.querySelector('#villageClose').onclick=()=>{closeModal();playEffect('good');};return;
                }
                if(p.x>350&&p.x<450&&p.y<125){scene='shop';p.x=400;p.y=488;playEffect('door');return;}
                return;
            } if (opened) {
                if (mode === 'result') {
                    modal.querySelector('#leave')?.click();
                }
                else
                    closeModal();
                return;
            } if(collectDiscovery()) return; const upgrade = nearbyUpgrade(); if(upgrade) { useUpgrade(upgrade); return; } if (guest && guestPhase === 'wait' && Math.hypot(p.x - guest.x, p.y - guest.y) < 112) {
                chosen = null;
                openModal('talk');
                return;
            } if (!guest && Math.hypot(p.x - 412, p.y - 414) < 90) { beginGuest(); return; } if (near) {
                selected = [];
                openModal('research');
            } }
            function update(dt) { if(scene === "village" && !opened){
                villageTime += dt;
                for(const v of villagePeople){
                    const nx=v.homeX+Math.sin(villageTime*0.43+v.phase)*19;
                    const ny=v.homeY+Math.cos(villageTime*0.32+v.phase)*12;
                    v.x+=(nx-v.x)*Math.min(1,dt*2.1);
                    v.y+=(ny-v.y)*Math.min(1,dt*2.1);
                }
            } const now=performance.now(); if(discovery && now>discovery.expiresAt){discovery=null;discoveryNextAt=now+25000;} if(!discovery && now>=discoveryNextAt && !opened && scene === "shop")spawnDiscovery(now); focus += (focusTarget - focus) * Math.min(1, dt * 5); frameEl.classList.toggle('focus', focus > .12); if (!opened) {
                let dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0), dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
                if (dx || dy) {
                    const len = Math.hypot(dx, dy), speed = 170 * dt;
                    dx /= len;
                    dy /= len;
                    const steps = Math.max(1, Math.ceil(speed / 3));
                    for (let stepIndex = 0; stepIndex < steps; stepIndex++) {
                        if (!collide(p.x + dx * speed / steps, p.y)) p.x += dx * speed / steps;
                        if (!collide(p.x, p.y + dy * speed / steps)) p.y += dy * speed / steps;
                    }
                    keepWitchInside();
                    if(scene === "shop" && p.x>368 && p.x<433 && p.y>=516 && dy>0) {
                        scene="village";p.x=400;p.y=100;keys.clear();playEffect('door');status.textContent='작은 마을에 도착했어요. 주민들에게 인사해 보세요!';
                    } else if(scene === "village" && p.x>351 && p.x<449 && p.y<=55 && dy<0) {
                        scene="shop";p.x=400;p.y=488;keys.clear();playEffect('door');status.textContent='마음의 약국으로 돌아왔어요.';
                    }
                    p.walk += dt * 13;
                    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 2 : 3;
                    else p.dir = dy < 0 ? 1 : 0;
                }
            } keepWitchInside(); if (scene === "shop" && guest) {
                if (guestPhase === 'enter') {
                    guest.y = Math.max(409, guest.y - dt * 83);
                    if (guest.y <= 409) {
                        guestPhase = 'wait';
                        status.textContent = `💬 ${guest.name}님이 기다리고 있어요. 가까이 가서 대화해 보세요.`;
                    }
                }
                else if (guestPhase === 'exit') {
                    guest.y += dt * 90;
                    if (guest.y > 570) {
                        guest = null; guestMood = 'normal';
                        guestPhase = 'none';
                        callDelay = 8;
                        status.textContent = '손님이 돌아갔어요. 자유롭게 연구하거나 다음 손님을 불러보세요.';
                    }
                }
            }
            else if (scene === "shop" && !opened) {
                callDelay -= dt;
                if (callDelay <= 0)
                    beginGuest();
            } near = scene === "shop" && Math.hypot(p.x - 397, p.y - 265) < 111; const villageNear=scene === "village" && villagePeople.some(v=>Math.hypot(p.x-v.x,p.y-v.y)<88);
            const villagePost=scene==='village'&&!!villageNearBuilding('post');
            const villageFlower=scene==='village'&&(!!villageNearBuilding('flower')||villageFlowerNear());
            const villageHome=scene==='village'&&villageBuildings.some(b=>b.kind==='home'&&Math.hypot(p.x-(b.x+b.w/2),p.y-(b.y+b.h+16))<78); const villageDoor=scene === "village" && p.x>350 && p.x<450 && p.y<125; const foundNear = scene === "shop" ? nearbyDiscovery() : null; const upgradeNear = scene === "shop" ? nearbyUpgrade() : null; const bellNear = scene === "shop" && !guest && Math.hypot(p.x - 412, p.y - 414) < 90; const guestNear = scene === 'shop' && !upgradeNear && guest && guestPhase === 'wait' && Math.hypot(p.x - guest.x, p.y - guest.y) < 112; actionButton.textContent = villagePost ? '💌 편지 읽기' : villageFlower ? '🌷 꽃집 방문' : villageHome ? '🏠 집 살펴보기' : villageNear ? '주민과 대화하기' : villageDoor ? '약국 들어가기' : foundNear ? '🔎 조사하기' : upgradeNear === 'shelfPlus' ? '물약 진열대 열기' : upgradeNear === 'moonLamp' ? '달빛 축복' : guestNear ? '대화하기' : bellNear ? '손님 부르기 🔔' : near ? '연구하기' : '다가가 주세요'; actionButton.disabled = opened || !(villagePost || villageFlower || villageHome || villageNear || villageDoor || foundNear || upgradeNear || guestNear || bellNear || near); actionButton.classList.toggle('ready', !opened && !!(villagePost || villageFlower || villageHome || villageNear || villageDoor || foundNear || upgradeNear || guestNear || bellNear || near)); updateMission(); document.getElementById('menuMission').textContent=missionEl.textContent; document.getElementById('menuStatus').textContent=status.textContent+' · '+discoverySummary(); dayEl.textContent = `DAY ${String(Math.floor(served / 5) + 1).padStart(2, '0')} · 💰 ${coins} · 처방 ${served}회`; miniDay.textContent = `DAY ${String(Math.floor(served / 5) + 1).padStart(2, '0')} · 💰 ${coins}`; if (reactionUntil && performance.now() > reactionUntil) { reactionBubble.classList.remove('show'); reactionUntil = 0; } }
            // Responsive world viewport. A wider view reduces cramped follow-camera motion.
            let cameraX=400,cameraY=300;
            // The witch occasionally thinks aloud. Timings are in real seconds, not game days.
            // Weighted personality: warm empathy 50%, whimsical daily life 30%, gentle MZ humor 20%.
            const witchThoughtGroups = [
                { weight: 5, lines: [
                    '슬픈 마음도 소중한 마음이야.',
                    '오늘도 누군가의 하루가 가벼워졌으면.',
                    '괜찮아. 모든 감정에는 이유가 있으니까.',
                    '가끔은 울어도 괜찮은 날이 있어.',
                    '행복은 생각보다 작은 곳에 있더라.',
                    '마음이 쉬어 갈 곳이 필요하지.',
                    '서두르지 않아도 괜찮아.',
                    '손님이 웃으면 나도 기뻐.',
                    '마음에도 따뜻한 차가 필요해.',
                    '오늘도 좋은 하루가 되길.'
                ] },
                { weight: 3, lines: [
                    '내 마음에도 물약 한 방울 넣어볼까?',
                    '가마솥아, 오늘도 잘 부탁해!',
                    '마법보다 어려운 건 사람 마음이야.',
                    '앗! 오늘도 모자가 삐뚤어졌네.',
                    '가마솥이 보글보글~',
                    '물약 향기가 참 좋네!',
                    '반짝이는 재료를 찾아볼까?',
                    '흠흠, 오늘의 주문은…'
                ] },
                { weight: 2, lines: [
                    '오늘 감정 상태... 제법 말랑함.',
                    '손님 웃는 거 보니까 뿌듯함 MAX.',
                    '마음 돌보기, 이거 완전 갓생인데?',
                    '오늘의 나, 제법 괜찮은 마녀.',
                    '물약 조합? 느낌 좋은데!',
                    '작은 행복 발견. 도파민 충전!'
                ] }
            ];
            function pickWitchThought() {
                const total = witchThoughtGroups.reduce((sum, group) => sum + group.weight, 0);
                let roll = Math.random() * total;
                let group = witchThoughtGroups[0];
                for (const candidate of witchThoughtGroups) {
                    roll -= candidate.weight;
                    if (roll < 0) { group = candidate; break; }
                }
                const choices = group.lines.filter(line => line !== currentThought);
                return choices[Math.floor(Math.random() * choices.length)];
            }
            let nextThoughtAt = performance.now() + 7500;
            let thoughtEndsAt = 0;
            let thoughtStartsAt = 0;
            let currentThought = '';
            let lastThoughtIndex = -1;
            function updateWitchThought(now) {
                if (opened || !document.getElementById('helpPanel').hidden || !document.getElementById('menuPanel').hidden || !document.getElementById('musicPanel').hidden) {
                    thoughtEndsAt = 0;
                    nextThoughtAt = Math.max(nextThoughtAt, now + 3500);
                    return;
                }
                if (now >= nextThoughtAt) {
                    currentThought = pickWitchThought();
                    thoughtStartsAt = now;
                    thoughtEndsAt = now + 3400;
                    nextThoughtAt = now + 13000 + Math.random() * 12000;
                }
            }
            function drawWitchThought(now) {
                if (now >= thoughtEndsAt || !currentThought || opened) return;
                ctx.save();
                const fontSize = 11;
                ctx.font = `bold ${fontSize}px Limgul, sans-serif`;
                const maxTextWidth = 190;
                const words = currentThought.split(' ');
                const lines = [];
                let line = '';
                for (const word of words) {
                    const trial = line ? line + ' ' + word : word;
                    if (line && ctx.measureText(trial).width > maxTextWidth) {
                        lines.push(line);
                        line = word;
                    } else line = trial;
                }
                if (line) lines.push(line);
                const lineHeight = 16;
                const w = Math.ceil(Math.max(...lines.map(t => ctx.measureText(t).width))) + 18;
                const h = lines.length * lineHeight + 12;
                const x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, p.x));
                const y = Math.max(h + 13, p.y - 49);
                // Fade in over 0.2s and fade out at the end, without moving the bubble.
                const fadeIn = Math.min(1, Math.max(0, (now - thoughtStartsAt) / 200));
                const fadeOut = Math.min(1, Math.max(0, (thoughtEndsAt - now) / 220));
                ctx.globalAlpha = Math.min(fadeIn, fadeOut);
                ctx.fillStyle = '#30243d';
                ctx.strokeStyle = '#d5aa88';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(x - w / 2, y - h, w, h, 7);
                ctx.fill(); ctx.stroke();
                // Tail points to the witch's hat; clamp its base to the bubble.
                const tipX = Math.max(x - w / 2 + 9, Math.min(x + w / 2 - 9, p.x));
                ctx.beginPath();
                ctx.moveTo(tipX - 5, y - 1);
                ctx.lineTo(p.x, y + 7);
                ctx.lineTo(tipX + 5, y - 1);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fff0d6';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                lines.forEach((t, i) => ctx.fillText(t, x, y - h + 6 + lineHeight * (i + 0.5)));
                ctx.restore();
            }
            // All outdoor artwork uses integer pixel rectangles (no smooth emoji sprites).
            function villageFlower(x,y,col='#f4b6c8'){
                rect(x-1,y+4,3,6,'#3c825a');rect(x-4,y,3,4,col);rect(x+2,y,3,4,col);
                rect(x-1,y-3,3,4,col);rect(x-1,y+3,3,3,col);rect(x,y+1,2,2,'#ffdf92');
            }
            function villageTree(x,y){
                rect(x-5,y+17,11,18,'#654b4c');rect(x-9,y+23,19,5,'#8a6555');
                rect(x-18,y-3,36,24,'#3f765c');rect(x-12,y-14,25,12,'#4d906a');
                rect(x-5,y-20,18,11,'#69a777');rect(x-14,y+1,9,8,'#7ab583');
                rect(x+8,y-8,7,8,'#88bc8a');rect(x-8,y+10,12,5,'#38684f');
            }
            function villageHouse(b){
                const x=b.x,y=b.y,w=b.w,h=b.h;
                rect(x+7,y+20,w-6,h-12,'#3d3544');
                const wall=b.kind==='flower'?'#d9b3a2':b.kind==='post'?'#c8b3a7':'#b9a8a0';
                rect(x+10,y+24,w-18,h-29,wall);
                rect(x+7,y+27,w-6,5,'#e6c8aa');
                const roof=b.kind==='flower'?'#b06b88':b.kind==='post'?'#6b879b':'#8c7189';
                rect(x,y+8,w,28,'#382e43');rect(x+5,y+4,w-10,28,roof);
                rect(x+11,y+9,w-22,6,b.kind==='post'?'#9fc3ce':'#c99db3');
                for(let k=0;k<Math.floor((w-18)/21);k++)rect(x+12+k*21,y+27,16,3,'#e5b9ac');
                rect(x+w/2-13,y+h-33,26,29,'#514152');rect(x+w/2-9,y+h-29,18,25,'#a67c70');
                rect(x+w/2+5,y+h-16,3,3,'#f6df9b');
                for(const sx of [x+17,x+w-38]){
                    rect(sx,y+44,22,24,'#574458');rect(sx+4,y+48,14,15,'#9ac6d0');
                    rect(sx+10,y+48,3,15,'#e6d5b3');
                }
                rect(x+w/2-35,y+34,70,15,'#564054');
                text(b.label,x+w/2,y+45,9,'#fff0cc');
                if(b.kind==='flower'){
                    for(let i=0;i<4;i++)villageFlower(x+19+i*13,y+h+9,i%2?'#f5d4a1':'#e9a6c7');
                }
                if(b.kind==='post'){
                    rect(x+w-12,y+h-14,12,15,'#60465d');rect(x+w-10,y+h-12,8,7,'#e9bd85');
                }
            }
            function villageBench(x,y){
                rect(x+3,y+13,5,11,'#55414b');rect(x+42,y+13,5,11,'#55414b');
                rect(x,y,50,12,'#5e4250');rect(x+4,y+3,42,5,'#c99778');
                rect(x+3,y+14,44,5,'#ae7d69');
            }
            function drawVillage(){
                rect(0,0,800,576,'#82a986');
                for(let y=0;y<576;y+=32)for(let x=0;x<800;x+=32){
                    rect(x,y,31,31,((x/32+y/32)%3===0)?'#86ac88':'#91b592');
                    if(((x*7+y*11)%17)===0){rect(x+8,y+20,5,3,'#76a37c');rect(x+17,y+9,3,5,'#b1c99c');}
                }
                // River and two layered banks, with blocky animated ripples.
                rect(719,0,81,576,'#648d83');rect(731,0,69,576,'#43899b');
                rect(740,0,60,576,'#37778e');
                for(let y=8;y<576;y+=28){
                    const sway=Math.round(Math.sin(villageTime*1.1+y)*5);
                    rect(752+sway,y,21,3,'#82c5c7');rect(762-sway,y+12,15,3,'#60afbb');
                    rect(785,y+6,12,2,'#a3d7cf');
                }
                for(let y=0;y<576;y+=24){rect(711+(y%48===0?0:4),y,10,20,'#b4b99a');rect(720,y+4,8,12,'#89a795');}
                // Paths are behind buildings and bridge.
                rect(365,0,70,576,'#c7a987');rect(376,0,48,576,'#e4c7a3');
                rect(0,277,740,67,'#c7a987');rect(0,290,740,41,'#e4c7a3');
                for(let x=14;x<710;x+=45){rect(x,282,18,2,'#efd2ac');rect(x+21,334,14,2,'#ba967a');}
                // Wooden bridge over river, visibly walkable.
                rect(709,270,91,86,'#493e4a');rect(714,275,86,77,'#b98d70');
                for(let x=717;x<800;x+=12){rect(x,278,3,71,'#795a5c');rect(x+3,283,8,3,'#d9ad88');}
                rect(711,271,89,7,'#e1bd94');rect(711,348,89,7,'#6d4c4d');
                // Apothecary exterior.
                rect(309,8,184,96,'#3d3446');rect(316,18,168,80,'#986d81');
                rect(322,8,156,14,'#b48d9e');rect(337,24,126,29,'#c399a7');
                rect(369,55,63,44,'#463749');rect(379,63,43,36,'#e0c39b');
                text('마음의 약국',400,45,14,'#fff0cc');
                for(const b of villageBuildings)villageHouse(b);
                // Flower beds, trees, benches and small lanterns.
                for(const [x,y] of [[235,123],[494,188],[673,241],[242,477],[520,512],[688,550]])villageTree(x,y);
                villageBench(239,360);villageBench(476,248);
                for(let i=0;i<16;i++){
                    const x=35+(i*83)%655,y=63+(i*107)%470;
                    if(x>320&&x<470)continue;
                    if(villageBuildings.some(b=>x>b.x-8&&x<b.x+b.w+8&&y>b.y-8&&y<b.y+b.h+8))continue;
                    villageFlower(x,y,i%3===0?'#f9d8a5':i%3===1?'#e8a4bc':'#d5c5f4');
                }
                for(const [x,y] of [[310,262],[455,354]]){
                    rect(x,y,7,24,'#65504e');rect(x-4,y-6,15,10,'#e5c98e');rect(x-2,y-9,11,4,'#fff0b2');
                }
                // Physical signboard, not floating title text.
                rect(472,211,7,30,'#66504d');rect(447,201,57,24,'#4b3849');
                rect(451,205,49,16,'#aa826e');text('작은 마을',476,216,10,'#fff0cb');
                // Village NPCs wander gently near their original spots.
                for(const v of villagePeople){
                    const bob=Math.round(Math.sin(villageTime*4+v.phase)*2);
                    ellipse(v.x,v.y+12,12,4,'#6b9277');
                    rect(v.x-9,v.y-7+bob,18,23,v.color);
                    rect(v.x-8,v.y-23+bob,16,17,'#e9c3a5');
                    rect(v.x-10,v.y-27+bob,20,7,'#5b485d');
                    rect(v.x-5,v.y-16+bob,3,3,'#3e3141');rect(v.x+3,v.y-16+bob,3,3,'#3e3141');
                    rect(v.x-7,v.y+15+bob,5,4,'#58475d');rect(v.x+3,v.y+15+bob,5,4,'#58475d');
                    if(Math.hypot(p.x-v.x,p.y-v.y)<88)text('!',v.x,v.y-39+bob,17,'#fff0c6');
                }
            }
            function drawScene() {
                const bounds=frameEl.getBoundingClientRect();
                const pixelRatio=Math.min(window.devicePixelRatio||1,2);
                const viewW=Math.max(280,Math.round(bounds.width*pixelRatio));
                const viewH=Math.max(280,Math.round(bounds.height*pixelRatio));
                if(c.width!==viewW||c.height!==viewH){c.width=viewW;c.height=viewH;ctx.imageSmoothingEnabled=false;}
                ctx.setTransform(1,0,0,1,0,0);
                ctx.fillStyle='#251d2d';ctx.fillRect(0,0,c.width,c.height);
                const portrait=window.matchMedia('(max-width:700px), (orientation:portrait)').matches;
                // On phones, fill the tall viewport by showing the full world height
                // and a narrower horizontal slice. PC keeps its wide overview.
                // Uniform scaling preserves pixel-art proportions on both devices.
                const scale=portrait ? Math.max(c.height/H, c.width/W)*1.12 : Math.min(c.width/W,c.height/H);
                const shownW=c.width/scale,shownH=c.height/scale;
                const targetX=Math.max(shownW/2,Math.min(W-shownW/2,p.x));
                const targetY=Math.max(shownH/2,Math.min(H-shownH/2,p.y+(portrait?38:0)));
                // Camera dead zone: no camera motion for small steps.
                const deadX=42,deadY=38;
                if(p.x<cameraX-deadX)cameraX=p.x+deadX;
                if(p.x>cameraX+deadX)cameraX=p.x-deadX;
                if(p.y<cameraY-deadY)cameraY=p.y+deadY;
                if(p.y>cameraY+deadY)cameraY=p.y-deadY;
                cameraX+=(targetX-cameraX)*0.045;
                cameraY+=(targetY-cameraY)*(portrait?0.085:0.045);
                cameraX=shownW>=W?W/2:Math.max(shownW/2,Math.min(W-shownW/2,cameraX));
                cameraY=shownH>=H?H/2:Math.max(shownH/2,Math.min(H-shownH/2,cameraY));
                ctx.setTransform(scale,0,0,scale,Math.round(c.width/2-cameraX*scale),Math.round(c.height/2-cameraY*scale));
                if(scene === "shop"){floor();drawEntranceMat();decorations();drawFurniture();drawCounterBell();cauldron();drawDiscovery();npc();}else{drawVillage();}witch();drawWitchThought(performance.now());
                ctx.setTransform(1,0,0,1,0,0);
            }
            function frame(ts) { const dt = Math.min((ts - last) / 1000 || 0, .04); last = ts; time = ts; update(dt); updateWitchThought(ts); drawScene(); requestAnimationFrame(frame); }
            window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(k) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) e.preventDefault(); if (k === 'e' && !e.repeat)
                interact();
            else if (k === 'escape' && opened)
                closeModal(); keys.add(k); });
            window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
            window.addEventListener('blur', () => keys.clear());
            document.addEventListener('visibilitychange', () => { if (document.hidden) keys.clear(); });
            // v2.4: Follow the same finger across buttons without requiring a new tap.
            // Native touch events are used because some in-app browsers cancel pointer
            // capture when a finger slides between child buttons.
            const dpad = document.querySelector('.dpad');
            const padButtons = [...dpad.querySelectorAll('button[data-key]')];
            let activeTouchId = null;
            let activeMouse = false;
            let activePadKey = null;
            function changePadDirection(nextKey) {
                if (activePadKey === nextKey) return;
                if (activePadKey) keys.delete(activePadKey);
                activePadKey = nextKey;
                if (nextKey) keys.add(nextKey);
                padButtons.forEach(b => b.classList.toggle('pressed', b.dataset.key.toLowerCase() === nextKey));
            }
            function padDirectionAt(x, y) {
                // Hit the actual key when possible; otherwise use the closest key.
                let best = null, distance = Infinity;
                for (const button of padButtons) {
                    const r = button.getBoundingClientRect();
                    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                    const d = Math.hypot(x - cx, y - cy);
                    if (d < distance) { distance = d; best = button; }
                }
                const r = dpad.getBoundingClientRect();
                // Small tolerance lets the finger travel through button gaps.
                const margin = 24;
                if (x < r.left - margin || x > r.right + margin || y < r.top - margin || y > r.bottom + margin) return null;
                return best ? best.dataset.key.toLowerCase() : null;
            }
            dpad.addEventListener('touchstart', e => {
                if (activeTouchId !== null || !e.changedTouches.length) return;
                const touch = e.changedTouches[0];
                activeTouchId = touch.identifier;
                changePadDirection(padDirectionAt(touch.clientX, touch.clientY));
                e.preventDefault();
            }, { passive:false });
            document.addEventListener('touchmove', e => {
                if (activeTouchId === null) return;
                for (const touch of e.changedTouches) {
                    if (touch.identifier === activeTouchId) {
                        changePadDirection(padDirectionAt(touch.clientX, touch.clientY));
                        e.preventDefault();
                        break;
                    }
                }
            }, { passive:false, capture:true });
            function endPadTouch(e) {
                if (activeTouchId === null) return;
                for (const touch of e.changedTouches) {
                    if (touch.identifier === activeTouchId) {
                        activeTouchId = null;
                        changePadDirection(null);
                        e.preventDefault();
                        break;
                    }
                }
            }
            document.addEventListener('touchend', endPadTouch, { passive:false, capture:true });
            document.addEventListener('touchcancel', endPadTouch, { passive:false, capture:true });
            // Mouse dragging in desktop testing follows the same direction logic.
            dpad.addEventListener('mousedown', e => {
                if (e.button !== 0 || activeTouchId !== null) return;
                activeMouse = true;
                changePadDirection(padDirectionAt(e.clientX, e.clientY));
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (activeMouse) changePadDirection(padDirectionAt(e.clientX, e.clientY));
            });
            document.addEventListener('mouseup', () => {
                if (activeMouse) { activeMouse = false; changePadDirection(null); }
            });
            dpad.addEventListener('dragstart', e => e.preventDefault());
            dpad.addEventListener('contextmenu', e => e.preventDefault());
            window.addEventListener('blur', () => { activeTouchId = null; activeMouse = false; changePadDirection(null); });
            actionButton.addEventListener('pointerdown', e => e.preventDefault());
            document.addEventListener('selectstart', e => { if(!e.target.closest('input,textarea')) e.preventDefault(); });
            document.querySelectorAll('.frame .touch button').forEach(button => {
                button.addEventListener('contextmenu', event => event.preventDefault());
            });
            actionButton.onclick = interact;
            document.getElementById('nextGuest').onclick = () => { if (!guest && !opened)
                beginGuest();
            else
                status.textContent = '현재 손님이 약국에 있어요!'; };

            const menuPanel=document.getElementById('menuPanel');
            const menuBtn=document.getElementById('menuBtn');
            function closeMenu(){menuPanel.hidden=true;menuBtn.setAttribute('aria-expanded','false');}
            function openMenu(){if(opened)return;menuPanel.hidden=false;menuBtn.setAttribute('aria-expanded','true');keys.clear();}
            menuBtn.addEventListener('click',openMenu);
            document.getElementById('menuClose').addEventListener('click',closeMenu);
            menuPanel.addEventListener('click',e=>{if(e.target===menuPanel)closeMenu();});
            document.getElementById('menuShop').addEventListener('click',()=>{closeMenu();document.getElementById('openShop').click();});
            document.getElementById('menuGuest').addEventListener('click',()=>{closeMenu();document.getElementById('nextGuest').click();});
            document.getElementById('menuBgm').addEventListener('click',()=>{closeMenu();document.getElementById('musicSelect').click();});
            document.getElementById('menuHelp').addEventListener('click',()=>{closeMenu();document.getElementById('helpBtn').click();});
            const helpPanel=document.getElementById('helpPanel');
            document.getElementById('helpBtn').addEventListener('click',()=>{helpPanel.hidden=false;keys.clear();});
            document.getElementById('helpClose').addEventListener('click',()=>{helpPanel.hidden=true;});
            helpPanel.addEventListener('click',e=>{if(e.target===helpPanel)helpPanel.hidden=true;});
            requestAnimationFrame(frame);
        })();
