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
