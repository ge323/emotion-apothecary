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
