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
