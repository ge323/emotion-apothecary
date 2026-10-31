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
