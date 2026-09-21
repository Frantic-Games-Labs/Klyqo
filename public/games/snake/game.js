(() => {
  'use strict';
  if (parent === window) document.body.classList.add('standalone');
  const canvas = document.getElementById('board'), ctx = canvas.getContext('2d'), region = document.getElementById('region');
  const overlay = document.getElementById('overlay'), headline = document.getElementById('headline'), message = document.getElementById('message'), action = document.getElementById('action');
  const scoreLabel = document.getElementById('score'), bestLabel = document.getElementById('best'), pauseButton = document.getElementById('pause');
  const N = 20, vectors = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} };
  let cell = 20, size = 400, snake = [], food, direction, queue = [], score = 0, best = 0, state = 'countdown', countdown = 3, timer = null, elapsed = 0, last = 0;
  try { best = Number(localStorage.getItem('klyqo:best:snake')) || 0; } catch {}
  function fit() {
    cell = Math.max(3, Math.floor(Math.min(region.clientWidth - 28, region.clientHeight - 18, 520) / N)); size = cell * N;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * ratio; canvas.height = size * ratio; canvas.style.width = `${size}px`; canvas.style.height = `${size}px`; ctx.setTransform(ratio,0,0,ratio,0,0); draw();
  }
  function newFood() { const available = []; for (let y=0;y<N;y++) for(let x=0;x<N;x++) if (!snake.some((s)=>s.x===x&&s.y===y)) available.push({x,y}); return available[Math.floor(Math.random()*available.length)]; }
  function hud() { scoreLabel.textContent = String(score).padStart(3,'0'); bestLabel.textContent = String(Math.max(best,score)).padStart(3,'0'); }
  function prepare() { snake = [{x:6,y:10},{x:5,y:10},{x:4,y:10},{x:3,y:10}]; direction = vectors.right; queue = []; score = 0; elapsed = 0; food = newFood(); hud(); }
  function show(title, detail, button, count = false) { overlay.classList.remove('hidden'); headline.textContent = title; headline.className = count ? 'count-number' : ''; message.textContent = detail; action.textContent = button || ''; action.classList.toggle('hidden', !button); }
  function begin() { clearInterval(timer); prepare(); state = 'countdown'; countdown = 3; show(String(countdown),'Get ready for one more round.',null,true); timer = setInterval(()=> { countdown--; if(countdown<=0){ clearInterval(timer); state='running'; elapsed=0; overlay.classList.add('hidden'); } else headline.textContent=String(countdown); },700); }
  function move(name) { const next = vectors[name]; const previous = queue.length ? queue[queue.length-1] : direction; if (next && previous && queue.length<2 && !(next.x===-previous.x&&next.y===-previous.y) && !(next.x===previous.x&&next.y===previous.y)) queue.push(next); }
  function stop(won=false) { state='over'; best=Math.max(best,score); try{localStorage.setItem('klyqo:best:snake',String(best));}catch{} hud(); if(parent!==window)parent.postMessage({type:'klyqo:score',score},location.origin); show(won?'You did the impossible.':'One more?',`${score} points. ${won?'Every square, yours.':'That tail had other plans.'}`,'Play again'); }
  function step() {
    if(queue.length) direction=queue.shift();
    const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y}; const eats=food&&head.x===food.x&&head.y===food.y;
    if(head.x<0||head.y<0||head.x>=N||head.y>=N||snake.slice(0,eats?undefined:-1).some((s)=>s.x===head.x&&s.y===head.y)){stop();return;}
    snake.unshift(head); if(eats){ score+=10; food=newFood(); hud(); if(!food)stop(true); } else snake.pop();
  }
  function pause() {
    if(state==='running'){state='paused';show('Take a breath.','Your next move can wait.','Keep playing');pauseButton.textContent='▶';pauseButton.setAttribute('aria-label','Resume game');}
    else if(state==='paused'){state='running';elapsed=0;last=performance.now();overlay.classList.add('hidden');pauseButton.textContent='Ⅱ';pauseButton.setAttribute('aria-label','Pause game');}
  }
  function square(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function draw(){
    if(!ctx||!snake.length)return;ctx.fillStyle='#131e0d';ctx.fillRect(0,0,size,size);
    ctx.strokeStyle='#26371a';ctx.lineWidth=.5;for(let i=1;i<N;i++){ctx.beginPath();ctx.moveTo(i*cell,0);ctx.lineTo(i*cell,size);ctx.moveTo(0,i*cell);ctx.lineTo(size,i*cell);ctx.stroke();}
    if(food){const pad=cell*.19;square(food.x*cell+pad,food.y*cell+pad,cell-pad*2,cell-pad*2,cell*.15,'#fa967c');square(food.x*cell+cell*.58,food.y*cell+cell*.09,cell*.12,cell*.2,1,'#b1d46c');}
    snake.forEach((s,i)=>{const pad=cell*.08;square(s.x*cell+pad,s.y*cell+pad,cell-pad*2,cell-pad*2,cell*.19,i===0?'#e1fa98':'#b2d563');if(i===0){ctx.fillStyle='#233b10';const eye=cell*.12;const cx=s.x*cell,cy=s.y*cell; if(direction.x){const ex=cx+cell*(direction.x>0?.66:.21);ctx.fillRect(ex,cy+cell*.23,eye,eye);ctx.fillRect(ex,cy+cell*.63,eye,eye);}else{const ey=cy+cell*(direction.y>0?.66:.21);ctx.fillRect(cx+cell*.23,ey,eye,eye);ctx.fillRect(cx+cell*.63,ey,eye,eye);}}});
  }
  function loop(t){const dt=Math.min(50,t-last);last=t;if(state==='running'){elapsed+=dt;const speed=Math.max(68,145-Math.floor(score/20)*4);if(elapsed>=speed){elapsed-=speed;step();}}draw();requestAnimationFrame(loop);}
  document.addEventListener('keydown',(e)=>{const key=e.key.toLowerCase(), names={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};if(names[key]){e.preventDefault();move(names[key]);}if(key===' '||key==='p'){e.preventDefault();if(!e.repeat){if(state==='over')begin();else pause();}}if(key==='escape'){e.preventDefault();if(parent!==window)parent.postMessage({type:'klyqo:close'},location.origin);else pause();}});
  document.querySelectorAll('[data-dir]').forEach((b)=>b.addEventListener('pointerdown',(e)=>{e.preventDefault();move(b.dataset.dir);}));
  let touchX=0,touchY=0;
  canvas.addEventListener('touchstart',(e)=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;},{passive:true});
  canvas.addEventListener('touchmove',(e)=>e.preventDefault(),{passive:false});
  canvas.addEventListener('touchend',(e)=>{const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;if(Math.max(Math.abs(dx),Math.abs(dy))>10)move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});
  pauseButton.onclick=pause; action.onclick=()=>{if(state==='paused')pause();else begin();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')pause();});
  window.addEventListener('blur',()=>{if(state==='running')pause();});
  prepare();new ResizeObserver(fit).observe(region);fit();begin();requestAnimationFrame(loop);
})();
