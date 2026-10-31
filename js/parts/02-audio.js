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
