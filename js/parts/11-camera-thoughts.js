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
