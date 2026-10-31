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

