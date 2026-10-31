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
