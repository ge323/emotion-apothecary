            const keys = new Set();
            // Hold-to-move controls: pointer capture prevents missed releases.
            // Do not let focused buttons intercept keyboard movement.
            let opened = false, near = false, time = 0, last = 0;
            const p = { x: 395, y: 417, w: 20, h: 17, dir: 0, walk: 0 };
            const furniture = [{ x: 72, y: 90, w: 173, h: 62, type: 'shelf' }, { x: 275, y: 88, w: 105, h: 54, type: 'shelf' }, { x: 555, y: 90, w: 172, h: 62, type: 'shelf' }, { x: 75, y: 240, w: 122, h: 78, type: 'table' }, { x: 580, y: 235, w: 135, h: 92, type: 'table' }, { x: 322, y: 211, w: 150, h: 103, type: 'cauldron' }, { x: 240, y: 455, w: 116, h: 52, type: 'counter' }, { x: 497, y: 445, w: 122, h: 62, type: 'counter' }, { x: 78, y: 392, w: 80, h: 70, type: 'sofa' }, { x: 675, y: 390, w: 49, h: 66, type: 'plant' }];
            const solid = furniture.map(o => ({ x: o.x + 4, y: o.y + o.h * .48, w: o.w - 8, h: o.h * .52 }));
