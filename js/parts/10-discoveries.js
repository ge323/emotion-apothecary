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
