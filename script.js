/**
 * SPIN FOR A REWARD! - Classroom Reward Wheel
 * 100% Vanilla JavaScript (ES6+)
 * Designed for classroom demonstrations, interactive whiteboards, and GitHub Pages.
 */

(function () {
  'use strict';

  // --- DEFAULT DATA & CONSTANTS ---
  const DEFAULT_PRIZES = [
    { id: 'p1', name: 'Fudgee Barr', icon: '🍫', image: null, color: '#FED7AA', weight: 6, stock: 12 },
    { id: 'p2', name: 'Presto Biscuits', icon: '🍪', image: null, color: '#FEF08A', weight: 6, stock: 12 },
    { id: 'p3', name: 'Candy', icon: '🍬', image: null, color: '#FBCFE8', weight: 8, stock: 20 },
    { id: 'p4', name: 'Cute Stickers', icon: '⭐', image: null, color: '#DDD6FE', weight: 8, stock: 25 },
    { id: 'p5', name: 'Extra Point', icon: '💯', image: null, color: '#BAE6FD', weight: 5, stock: 15 },
    { id: 'p6', name: 'Mystery Prize', icon: '🎁', image: null, color: '#FDE047', weight: 3, stock: 6 },
    { id: 'p7', name: 'Pencil', icon: '✏️', image: null, color: '#A7F3D0', weight: 6, stock: 15 },
    { id: 'p8', name: "Teacher's Special Reward", icon: '👑', image: null, color: '#F472B6', weight: 2, stock: 4 }
  ];

  const PRESET_ICONS = ['🍫', '🍪', '🍬', '⭐', '💯', '🎁', '✏️', '👑', '🏆', '🍎', '🎨', '📚', '🎀', '🧁', '🥇', '🎈'];
  const PRESET_COLORS = ['#FED7AA', '#FEF08A', '#FBCFE8', '#DDD6FE', '#BAE6FD', '#FDE047', '#A7F3D0', '#F472B6', '#C4B5FD', '#FCA5A5'];

  const DEFAULT_SETTINGS = {
    title: 'SPIN FOR A REWARD!',
    subtitle: "You did a great job! Let's see your reward!",
    adminPassword: 'teacher123',
    enableStockLimits: true,
    soundEnabled: true,
    soundVolume: 0.7,
    spinDuration: 5, // in seconds
    studentRoster: ['Alex', 'Bella', 'Carlo', 'Diana', 'Ethan', 'Faye', 'Gabriel', 'Hannah']
  };

  const STORAGE_KEYS = {
    PRIZES: 'reward_wheel_prizes_v1',
    SETTINGS: 'reward_wheel_settings_v1',
    HISTORY: 'reward_wheel_history_v1'
  };

  // --- APPLICATION STATE ---
  let prizes = loadPrizes();
  let settings = loadSettings();
  let history = loadHistory();

  let isSpinning = false;
  let currentRotation = 0; // Current angle in degrees
  let audioCtx = null;
  let lastTickSlice = -1;

  // Cached image elements for wheel canvas drawing
  const imageCache = new Map();

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTickSound(pitchMultiplier = 1.0) {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 1200 * pitchMultiplier;
      filter.Q.value = 3;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 * pitchMultiplier, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.035);

      const vol = (settings.soundVolume || 0.7) * 0.45;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  function playWinFanfare() {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [
        { f: 523.25, t: 0.0, d: 0.15 }, // C5
        { f: 659.25, t: 0.12, d: 0.15 }, // E5
        { f: 783.99, t: 0.24, d: 0.18 }, // G5
        { f: 1046.50, t: 0.38, d: 0.45 }  // C6
      ];

      const vol = (settings.soundVolume || 0.7) * 0.4;

      notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, ctx.currentTime + note.t);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + note.t);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + note.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.t + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.t);
        osc.stop(ctx.currentTime + note.t + note.d);
      });

      // Cheerful sparkle chimes
      setTimeout(() => {
        [1318.51, 1567.98, 2093.0].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.25);
        });
      }, 420);
    } catch (e) {
      // Audio not supported
    }
  }

  function playClickSound() {
    if (!settings.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime((settings.soundVolume || 0.7) * 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // ignore
    }
  }

  // --- LOCAL STORAGE DATA HANDLING ---
  function loadPrizes() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRIZES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load prizes from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PRIZES));
  }

  function savePrizes() {
    try {
      localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
    } catch (e) {
      showToast('Storage quota exceeded! Custom image may be too large.', 'error');
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return Object.assign({}, DEFAULT_SETTINGS);
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
    return [];
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }

  // Pre-load prize custom images into cache
  function preloadImages() {
    prizes.forEach(p => {
      if (p.image && !imageCache.has(p.id)) {
        const img = new Image();
        img.src = p.image;
        img.onload = () => {
          imageCache.set(p.id, img);
          renderWheel();
        };
      }
    });
  }

  // --- ACTIVE PRIZE FILTERING ---
  function getActivePrizes() {
    if (!settings.enableStockLimits) {
      return prizes;
    }
    const available = prizes.filter(p => Number(p.stock) > 0);
    return available.length > 0 ? available : prizes;
  }

  // --- CONFETTI ENGINE ---
  const confettiEngine = (function () {
    const canvas = document.getElementById('confetti-canvas');
    let ctx = canvas ? canvas.getContext('2d') : null;
    let particles = [];
    let animationFrame = null;
    let isActive = false;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    const COLORS = ['#F472B6', '#8B5CF6', '#38BDF8', '#FBBF24', '#34D399', '#F43F5E', '#A78BFA', '#FDE047'];

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 9 + 6;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 6; // Initial upward pop
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 12;
        this.shape = Math.random() > 0.4 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'star';
        this.opacity = 1;
        this.gravity = 0.28;
        this.drag = 0.982;
      }

      update() {
        this.vx *= this.drag;
        this.vy = this.vy * this.drag + this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        if (this.y > window.innerHeight - 50) {
          this.opacity -= 0.02;
        }
      }

      draw(c) {
        c.save();
        c.translate(this.x, this.y);
        c.rotate((this.rotation * Math.PI) / 180);
        c.globalAlpha = Math.max(0, this.opacity);
        c.fillStyle = this.color;

        if (this.shape === 'rect') {
          c.fillRect(-this.size / 2, -this.size / 3, this.size, this.size * 0.6);
        } else if (this.shape === 'circle') {
          c.beginPath();
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          c.fill();
        } else {
          // Draw cute star
          c.beginPath();
          for (let i = 0; i < 5; i++) {
            c.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size * 0.6,
                     -Math.sin((18 + i * 72) * Math.PI / 180) * this.size * 0.6);
            c.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * this.size * 0.3,
                     -Math.sin((54 + i * 72) * Math.PI / 180) * this.size * 0.3);
          }
          c.closePath();
          c.fill();
        }
        c.restore();
      }
    }

    function loop() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.opacity <= 0 || p.y > window.innerHeight + 50) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(loop);
      } else {
        isActive = false;
      }
    }

    return {
      burst: function () {
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();

        // 2 burst origins from left and right screen center
        const origins = [
          { x: window.innerWidth * 0.3, y: window.innerHeight * 0.45 },
          { x: window.innerWidth * 0.7, y: window.innerHeight * 0.45 },
          { x: window.innerWidth * 0.5, y: window.innerHeight * 0.3 }
        ];

        origins.forEach(orig => {
          for (let i = 0; i < 45; i++) {
            particles.push(new Particle(orig.x, orig.y));
          }
        });

        if (!isActive) {
          isActive = true;
          loop();
        }
      },
      clear: function () {
        particles = [];
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (animationFrame) cancelAnimationFrame(animationFrame);
        isActive = false;
      }
    };
  })();

  // --- WHEEL RENDERING ENGINE (High DPI Canvas) ---
  const canvas = document.getElementById('wheel-canvas');
  let ctx = canvas ? canvas.getContext('2d') : null;

  function setupCanvasDPI() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = Math.max(300, rect.width || 460);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function renderWheel() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const size = rect.width || 460;
    const radius = size / 2;
    const centerX = radius;
    const centerY = radius;

    ctx.clearRect(0, 0, size, size);

    const activePrizes = getActivePrizes();
    const totalSegments = activePrizes.length;
    if (totalSegments === 0) return;

    const arcAngle = (2 * Math.PI) / totalSegments;

    ctx.save();
    ctx.translate(centerX, centerY);
    // currentRotation in radians
    ctx.rotate((currentRotation * Math.PI) / 180);

    for (let i = 0; i < totalSegments; i++) {
      const prize = activePrizes[i];
      const startAngle = i * arcAngle - Math.PI / 2; // Start from top
      const endAngle = startAngle + arcAngle;

      // Draw Slice Background
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 4, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = prize.color || '#DDD6FE';
      ctx.fill();

      // Hairline slice border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Outer inner rim ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Slice Content (Text & Icon)
      ctx.save();
      const midAngle = startAngle + arcAngle / 2;
      ctx.rotate(midAngle);

      // Prize Icon / Image
      const iconDist = radius * 0.76;
      const textDist = radius * 0.48;

      ctx.save();
      ctx.translate(iconDist, 0);
      ctx.rotate(Math.PI / 2); // Orient upright outward

      const cachedImg = imageCache.get(prize.id);
      if (cachedImg) {
        const imgSize = Math.min(38, radius * 0.17);
        ctx.beginPath();
        ctx.arc(0, 0, imgSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(cachedImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
      } else {
        // Draw emoji/icon
        ctx.font = `${Math.min(28, radius * 0.14)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prize.icon || '🎁', 0, 0);
      }
      ctx.restore();

      // Prize Name Text (Radial layout)
      ctx.save();
      ctx.translate(textDist, 0);
      ctx.rotate(Math.PI / 2);

      const maxLabelLength = 16;
      let displayName = prize.name;
      if (displayName.length > maxLabelLength) {
        displayName = displayName.substring(0, maxLabelLength - 1) + '…';
      }

      ctx.fillStyle = '#1E1B4B';
      const fontSize = Math.max(11, Math.min(15, Math.floor(radius * 0.068)));
      ctx.font = `600 ${fontSize}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(displayName, 0, 0);

      // Stock remaining tag if enabled & low
      if (settings.enableStockLimits && prize.stock !== undefined && prize.stock <= 5) {
        ctx.font = `700 ${fontSize - 3}px 'Outfit', sans-serif`;
        ctx.fillStyle = '#B91C1C';
        ctx.fillText(`(${prize.stock} left)`, 0, fontSize + 2);
      }

      ctx.restore();

      ctx.restore();
    }

    // Outer decorative dots on perimeter
    for (let i = 0; i < totalSegments; i++) {
      const angle = i * arcAngle - Math.PI / 2;
      const dotX = Math.cos(angle) * (radius - 12);
      const dotY = Math.sin(angle) * (radius - 12);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 3;
      ctx.fill();
    }

    ctx.restore();
  }

  // --- MARQUEE LIGHT BULBS ANIMATION ---
  function setupBulbs() {
    const ring = document.querySelector('.wheel-outer-ring');
    if (!ring) return;

    // Remove old bulbs
    ring.querySelectorAll('.bulb').forEach(b => b.remove());

    const numBulbs = 20;
    const bulbClasses = ['lit-1', 'lit-2', 'lit-3'];

    for (let i = 0; i < numBulbs; i++) {
      const bulb = document.createElement('div');
      bulb.className = `bulb ${bulbClasses[i % bulbClasses.length]}`;

      const angle = (i / numBulbs) * 360;
      const rad = (angle * Math.PI) / 180;
      const percent = 50;
      const radiusPercent = 49; // outer edge

      const left = percent + Math.cos(rad) * radiusPercent;
      const top = percent + Math.sin(rad) * radiusPercent;

      bulb.style.left = `${left}%`;
      bulb.style.top = `${top}%`;

      ring.appendChild(bulb);
    }
  }

  let bulbInterval = null;
  function startBulbChasing() {
    let offset = 0;
    const bulbs = document.querySelectorAll('.bulb');
    if (bulbInterval) clearInterval(bulbInterval);

    bulbInterval = setInterval(() => {
      offset = (offset + 1) % 3;
      bulbs.forEach((b, idx) => {
        b.className = `bulb lit-${((idx + offset) % 3) + 1}`;
      });
    }, isSpinning ? 90 : 380);
  }

  // --- WEIGHTED RANDOM SELECTION ---
  function selectWinningPrize(availablePrizes) {
    let totalWeight = 0;
    for (const p of availablePrizes) {
      totalWeight += Math.max(0.1, Number(p.weight) || 1);
    }

    let randomVal = Math.random() * totalWeight;
    for (let i = 0; i < availablePrizes.length; i++) {
      const p = availablePrizes[i];
      const w = Math.max(0.1, Number(p.weight) || 1);
      if (randomVal < w) {
        return { prize: p, index: i };
      }
      randomVal -= w;
    }
    // Fallback to last prize
    return { prize: availablePrizes[availablePrizes.length - 1], index: availablePrizes.length - 1 };
  }

  // --- SPIN ANIMATION CONTROLLER ---
  function spinWheel() {
    if (isSpinning) return;

    const studentInput = document.getElementById('student-name-input');
    const studentName = (studentInput ? studentInput.value.trim() : '') || 'Awesome Student';

    const activePrizes = getActivePrizes();
    if (activePrizes.length === 0) {
      showToast('All prizes are currently out of stock! Restock in Teacher Mode.', 'error');
      return;
    }

    getAudioContext(); // Enable Web Audio on gesture
    playClickSound();

    isSpinning = true;
    updateUIControlsSpinning(true);
    startBulbChasing();

    // 1. Pick the winning prize using weighted probabilities
    const { prize: winningPrize, index: winningIndex } = selectWinningPrize(activePrizes);

    // 2. Exact Angle Calculation
    // Wheel has totalSegments slices. Slice winningIndex has center angle:
    // angle = (winningIndex + 0.5) * (360 / totalSegments)
    // To land this center angle at the TOP pointer (-90deg), target rotation modulo 360 is:
    // targetOffset = 360 - ((winningIndex + 0.5) * (360 / totalSegments))
    const totalSegments = activePrizes.length;
    const arcDeg = 360 / totalSegments;
    const sliceCenterDeg = (winningIndex + 0.5) * arcDeg;
    const targetOffset = (360 - sliceCenterDeg) % 360;

    // Add safe random jitter within slice boundaries (-30% to +30% of slice width)
    const jitter = (Math.random() - 0.5) * (arcDeg * 0.6);

    // Full rotations for excitement (5 to 7 spins)
    const fullRotations = (Math.floor(Math.random() * 3) + 5) * 360;

    // Normalized current rotation
    const currentNorm = currentRotation % 360;
    let delta = (targetOffset + jitter) - currentNorm;
    if (delta < 0) delta += 360;

    const targetTotalRotation = currentRotation + fullRotations + delta;
    const startRotation = currentRotation;
    const spinDuration = (settings.spinDuration || 5) * 1000;
    const startTime = performance.now();

    const pointerElem = document.querySelector('.wheel-pointer');

    // Easing: Quintic ease out for suspenseful deceleration
    function easeOutQuint(t) {
      return 1 - Math.pow(1 - t, 5);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);
      const easedProgress = easeOutQuint(progress);

      currentRotation = startRotation + (targetTotalRotation - startRotation) * easedProgress;
      renderWheel();

      // Calculate peg passing under top pointer to trigger click & pointer flick
      const activeAngleNorm = (360 - (currentRotation % 360)) % 360;
      const currentSlice = Math.floor(activeAngleNorm / arcDeg);

      if (currentSlice !== lastTickSlice) {
        lastTickSlice = currentSlice;
        // Pitch decreases as wheel decelerates
        const pitch = Math.max(0.6, 1.4 - progress * 0.7);
        playTickSound(pitch);

        // Visual pointer flick
        if (pointerElem) {
          pointerElem.style.transform = `translateX(-50%) rotate(${Math.sin(now) * 18 * (1 - progress)}deg)`;
          setTimeout(() => {
            if (pointerElem) pointerElem.style.transform = 'translateX(-50%) rotate(0deg)';
          }, 60);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin finished!
        isSpinning = false;
        updateUIControlsSpinning(false);
        startBulbChasing();

        if (pointerElem) {
          pointerElem.style.transform = 'translateX(-50%) rotate(0deg)';
        }

        // Award prize & record
        onSpinComplete(studentName, winningPrize);
      }
    }

    requestAnimationFrame(animate);
  }

  function onSpinComplete(studentName, prize) {
    // 1. Decrement stock if limits enabled
    if (settings.enableStockLimits && prize.stock !== undefined) {
      const target = prizes.find(p => p.id === prize.id);
      if (target && target.stock > 0) {
        target.stock -= 1;
        savePrizes();
      }
    }

    // 2. Record to history
    const record = {
      id: 'h_' + Date.now(),
      studentName: studentName,
      prizeName: prize.name,
      prizeIcon: prize.icon || '🎁',
      prizeImage: prize.image || null,
      timestamp: new Date().toISOString()
    };
    history.unshift(record);
    saveHistory();
    renderHistoryTable();

    // 3. Audio celebration & confetti
    playWinFanfare();
    confettiEngine.burst();

    // 4. Show Celebration Modal
    showWinnerModal(studentName, prize);
  }

  function showWinnerModal(studentName, prize) {
    const modal = document.getElementById('winner-modal');
    if (!modal) return;

    const nameEl = document.getElementById('winner-student-name');
    const titleEl = document.getElementById('winner-prize-title');
    const imageFrame = document.getElementById('winner-image-frame');
    const stockTag = document.getElementById('winner-stock-tag');

    if (nameEl) nameEl.textContent = studentName;
    if (titleEl) titleEl.textContent = prize.name;

    if (imageFrame) {
      if (prize.image) {
        imageFrame.innerHTML = `<img src="${prize.image}" alt="${prize.name}" />`;
      } else {
        imageFrame.innerHTML = `<span class="prize-emoji-big">${prize.icon || '🎁'}</span>`;
      }
    }

    if (stockTag) {
      if (settings.enableStockLimits && prize.stock !== undefined) {
        stockTag.style.display = 'inline-block';
        stockTag.textContent = `${prize.stock} left in stock`;
      } else {
        stockTag.style.display = 'none';
      }
    }

    modal.classList.add('active');
  }

  function closeWinnerModal() {
    const modal = document.getElementById('winner-modal');
    if (modal) modal.classList.remove('active');
    confettiEngine.clear();

    // Clear input & focus for next student
    const studentInput = document.getElementById('student-name-input');
    if (studentInput) {
      studentInput.value = '';
      studentInput.focus();
    }
  }

  function updateUIControlsSpinning(spinning) {
    const spinBtn = document.getElementById('spin-now-btn');
    const hub = document.querySelector('.wheel-center-hub');
    const studentInput = document.getElementById('student-name-input');

    if (spinBtn) spinBtn.disabled = spinning;
    if (hub) {
      if (spinning) hub.classList.add('spinning');
      else hub.classList.remove('spinning');
    }
    if (studentInput) studentInput.disabled = spinning;
  }

  // --- TEACHER ADMIN & SECURITY ---
  function openPasswordModal() {
    playClickSound();
    const modal = document.getElementById('password-modal');
    const input = document.getElementById('teacher-pwd-input');
    const errorMsg = document.getElementById('pwd-error-msg');
    if (errorMsg) errorMsg.textContent = '';
    if (input) {
      input.value = '';
      input.focus();
    }
    if (modal) modal.classList.add('active');
  }

  function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) modal.classList.remove('active');
  }

  function verifyTeacherPassword() {
    const input = document.getElementById('teacher-pwd-input');
    const errorMsg = document.getElementById('pwd-error-msg');
    const entered = input ? input.value.trim() : '';

    if (entered === (settings.adminPassword || 'teacher123')) {
      closePasswordModal();
      openAdminModal();
      showToast('Welcome, Teacher! Admin panel unlocked.', 'success');
    } else {
      if (errorMsg) errorMsg.textContent = 'Incorrect password. Default is "teacher123".';
      if (input) {
        input.select();
      }
    }
  }

  function openAdminModal() {
    playClickSound();
    populateAdminFields();
    renderPrizesTable();
    renderHistoryTable();
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.add('active');
  }

  function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.remove('active');
    // Save any pending settings and re-render wheel
    applySettingsToUI();
    renderWheel();
  }

  // --- ADMIN PRIZE MANAGEMENT ---
  function renderPrizesTable() {
    const tbody = document.getElementById('prizes-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Calculate total weight for percentage display
    const totalWeight = prizes.reduce((sum, p) => sum + (Number(p.weight) || 1), 0);

    prizes.forEach((prize, index) => {
      const tr = document.createElement('tr');
      const pct = totalWeight > 0 ? ((Number(prize.weight) / totalWeight) * 100).toFixed(1) : 0;

      let thumbHtml = '';
      if (prize.image) {
        thumbHtml = `<img src="${prize.image}" alt="${prize.name}" />`;
      } else {
        thumbHtml = `<span>${prize.icon || '🎁'}</span>`;
      }

      tr.innerHTML = `
        <td>
          <div class="prize-row-thumb" style="background:${prize.color}">
            ${thumbHtml}
          </div>
        </td>
        <td>
          <strong>${prize.name}</strong>
        </td>
        <td>
          <span class="color-swatch-badge" style="background:${prize.color}"></span>
        </td>
        <td>
          ${prize.weight} <small style="color:#64748B">(${pct}%)</small>
        </td>
        <td>
          ${settings.enableStockLimits ? (prize.stock !== undefined ? prize.stock : '∞') : '<span style="color:#94A3B8">N/A</span>'}
        </td>
        <td>
          <div class="table-action-btns">
            <button class="btn-table-action" data-edit="${prize.id}">✏️ Edit</button>
            <button class="btn-table-action delete" data-delete="${prize.id}">🗑️</button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Attach listeners
    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => editPrize(btn.getAttribute('data-edit')));
    });

    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deletePrize(btn.getAttribute('data-delete')));
    });
  }

  // Add / Edit Prize Modal State
  let editingPrizeId = null;
  let activeSelectedIcon = '🍫';
  let activeSelectedColor = '#FED7AA';
  let activeCustomImage = null;

  function openPrizeFormModal(prizeToEdit = null) {
    editingPrizeId = prizeToEdit ? prizeToEdit.id : null;
    const modal = document.getElementById('prize-form-modal');
    const titleEl = document.getElementById('prize-form-modal-title');
    const nameInput = document.getElementById('prize-name-input');
    const weightInput = document.getElementById('prize-weight-input');
    const stockInput = document.getElementById('prize-stock-input');
    const imagePreview = document.getElementById('prize-image-preview');

    activeSelectedIcon = prizeToEdit ? prizeToEdit.icon || '🎁' : '🍫';
    activeSelectedColor = prizeToEdit ? prizeToEdit.color || '#FED7AA' : '#FED7AA';
    activeCustomImage = prizeToEdit ? prizeToEdit.image || null : null;

    if (titleEl) titleEl.textContent = prizeToEdit ? 'Edit Reward' : 'Add New Reward';
    if (nameInput) nameInput.value = prizeToEdit ? prizeToEdit.name : '';
    if (weightInput) weightInput.value = prizeToEdit ? prizeToEdit.weight : 5;
    if (stockInput) stockInput.value = prizeToEdit && prizeToEdit.stock !== undefined ? prizeToEdit.stock : 10;

    renderPresetIconGrid();
    renderColorPickerGrid();
    updateImagePreviewDisplay();

    if (modal) modal.classList.add('active');
  }

  function closePrizeFormModal() {
    const modal = document.getElementById('prize-form-modal');
    if (modal) modal.classList.remove('active');
    editingPrizeId = null;
    activeCustomImage = null;
  }

  function renderPresetIconGrid() {
    const container = document.getElementById('preset-icons-container');
    if (!container) return;
    container.innerHTML = '';

    PRESET_ICONS.forEach(icon => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-icon-btn ${icon === activeSelectedIcon ? 'selected' : ''}`;
      btn.textContent = icon;
      btn.addEventListener('click', () => {
        activeSelectedIcon = icon;
        activeCustomImage = null; // Clear custom image if choosing preset icon
        renderPresetIconGrid();
        updateImagePreviewDisplay();
      });
      container.appendChild(btn);
    });
  }

  function renderColorPickerGrid() {
    const container = document.getElementById('preset-colors-container');
    if (!container) return;
    container.innerHTML = '';

    PRESET_COLORS.forEach(color => {
      const dot = document.createElement('div');
      dot.className = `color-dot-choice ${color.toLowerCase() === activeSelectedColor.toLowerCase() ? 'selected' : ''}`;
      dot.style.background = color;
      dot.addEventListener('click', () => {
        activeSelectedColor = color;
        renderColorPickerGrid();
        const hexInput = document.getElementById('prize-color-hex');
        if (hexInput) hexInput.value = color;
      });
      container.appendChild(dot);
    });

    const hexInput = document.getElementById('prize-color-hex');
    if (hexInput) {
      hexInput.value = activeSelectedColor;
      hexInput.oninput = (e) => {
        activeSelectedColor = e.target.value;
        renderColorPickerGrid();
      };
    }
  }

  function updateImagePreviewDisplay() {
    const preview = document.getElementById('prize-image-preview');
    if (!preview) return;

    if (activeCustomImage) {
      preview.innerHTML = `
        <img src="${activeCustomImage}" alt="Uploaded Prize" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />
        <button type="button" id="remove-custom-img-btn" style="position:absolute;top:-6px;right:-6px;background:#EF4444;color:#FFF;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer;">✕</button>
      `;
      const removeBtn = document.getElementById('remove-custom-img-btn');
      if (removeBtn) {
        removeBtn.onclick = () => {
          activeCustomImage = null;
          updateImagePreviewDisplay();
        };
      }
    } else {
      preview.innerHTML = `<span style="font-size:2rem">${activeSelectedIcon}</span>`;
    }
  }

  // Handle Image Upload & Auto-resize to 128x128 DataURL
  function handleImageUpload(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // Create offscreen canvas to resize
        const maxDim = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(img, 0, 0, width, height);

        // Convert to compact JPEG or PNG DataURL
        activeCustomImage = offCanvas.toDataURL('image/jpeg', 0.85);
        updateImagePreviewDisplay();
        showToast('Image uploaded and optimized!', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function savePrizeFromForm() {
    const nameInput = document.getElementById('prize-name-input');
    const weightInput = document.getElementById('prize-weight-input');
    const stockInput = document.getElementById('prize-stock-input');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast('Please enter a reward name.', 'error');
      return;
    }

    const weight = Math.max(1, parseInt(weightInput ? weightInput.value : 5, 10) || 5);
    const stock = Math.max(0, parseInt(stockInput ? stockInput.value : 10, 10) || 10);

    if (editingPrizeId) {
      const target = prizes.find(p => p.id === editingPrizeId);
      if (target) {
        target.name = name;
        target.icon = activeSelectedIcon;
        target.color = activeSelectedColor;
        target.weight = weight;
        target.stock = stock;
        target.image = activeCustomImage;
        if (activeCustomImage) {
          const img = new Image();
          img.src = activeCustomImage;
          imageCache.set(target.id, img);
        } else {
          imageCache.delete(target.id);
        }
      }
    } else {
      const newPrize = {
        id: 'p_' + Date.now(),
        name: name,
        icon: activeSelectedIcon,
        color: activeSelectedColor,
        weight: weight,
        stock: stock,
        image: activeCustomImage
      };
      prizes.push(newPrize);
      if (activeCustomImage) {
        const img = new Image();
        img.src = activeCustomImage;
        imageCache.set(newPrize.id, img);
      }
    }

    savePrizes();
    renderPrizesTable();
    renderWheel();
    closePrizeFormModal();
    showToast(editingPrizeId ? 'Reward updated!' : 'New reward added!', 'success');
  }

  function editPrize(id) {
    const prize = prizes.find(p => p.id === id);
    if (prize) {
      openPrizeFormModal(prize);
    }
  }

  function deletePrize(id) {
    if (prizes.length <= 2) {
      showToast('You must have at least 2 rewards on the wheel!', 'error');
      return;
    }
    if (confirm('Are you sure you want to remove this reward?')) {
      prizes = prizes.filter(p => p.id !== id);
      imageCache.delete(id);
      savePrizes();
      renderPrizesTable();
      renderWheel();
      showToast('Reward removed.', 'success');
    }
  }

  // --- ADMIN SETTINGS & GENERAL ---
  function populateAdminFields() {
    const titleInput = document.getElementById('setting-title-input');
    const subtitleInput = document.getElementById('setting-subtitle-input');
    const stockToggle = document.getElementById('setting-stock-toggle');
    const soundToggle = document.getElementById('setting-sound-toggle');
    const durationInput = document.getElementById('setting-duration-input');
    const pwdInput = document.getElementById('setting-pwd-input');
    const rosterTextarea = document.getElementById('setting-roster-input');

    if (titleInput) titleInput.value = settings.title || 'SPIN FOR A REWARD!';
    if (subtitleInput) subtitleInput.value = settings.subtitle || "You did a great job! Let's see your reward!";
    if (stockToggle) stockToggle.checked = !!settings.enableStockLimits;
    if (soundToggle) soundToggle.checked = !!settings.soundEnabled;
    if (durationInput) durationInput.value = settings.spinDuration || 5;
    if (pwdInput) pwdInput.value = settings.adminPassword || 'teacher123';
    if (rosterTextarea && Array.isArray(settings.studentRoster)) {
      rosterTextarea.value = settings.studentRoster.join(', ');
    }
  }

  function saveSettingsFromAdmin() {
    const titleInput = document.getElementById('setting-title-input');
    const subtitleInput = document.getElementById('setting-subtitle-input');
    const stockToggle = document.getElementById('setting-stock-toggle');
    const soundToggle = document.getElementById('setting-sound-toggle');
    const durationInput = document.getElementById('setting-duration-input');
    const pwdInput = document.getElementById('setting-pwd-input');
    const rosterTextarea = document.getElementById('setting-roster-input');

    if (titleInput) settings.title = titleInput.value.trim() || 'SPIN FOR A REWARD!';
    if (subtitleInput) settings.subtitle = subtitleInput.value.trim() || "You did a great job! Let's see your reward!";
    if (stockToggle) settings.enableStockLimits = stockToggle.checked;
    if (soundToggle) settings.soundEnabled = soundToggle.checked;
    if (durationInput) settings.spinDuration = Math.max(3, Math.min(12, parseInt(durationInput.value, 10) || 5));
    if (pwdInput && pwdInput.value.trim()) settings.adminPassword = pwdInput.value.trim();

    if (rosterTextarea) {
      const names = rosterTextarea.value.split(',').map(s => s.trim()).filter(Boolean);
      settings.studentRoster = names.length > 0 ? names : DEFAULT_SETTINGS.studentRoster;
    }

    saveSettings();
    applySettingsToUI();
    renderWheel();
    showToast('Classroom settings saved!', 'success');
  }

  function applySettingsToUI() {
    const titleEl = document.getElementById('main-app-title');
    const subEl = document.getElementById('main-app-subtitle');
    const soundBtn = document.getElementById('sound-toggle-btn');

    if (titleEl) titleEl.textContent = settings.title;
    if (subEl) subEl.textContent = settings.subtitle;

    if (soundBtn) {
      soundBtn.innerHTML = settings.soundEnabled ? '🔊 Sound' : '🔇 Muted';
      soundBtn.title = settings.soundEnabled ? 'Sound Effects Enabled' : 'Sound Effects Muted';
    }

    renderQuickRoster();
  }

  function resetToDefaults() {
    if (confirm('Reset all rewards and wheel settings to original classroom defaults? Any custom prizes will be restored.')) {
      prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
      settings = Object.assign({}, DEFAULT_SETTINGS);
      imageCache.clear();
      savePrizes();
      saveSettings();
      populateAdminFields();
      renderPrizesTable();
      applySettingsToUI();
      renderWheel();
      showToast('Settings & rewards reset to defaults.', 'success');
    }
  }

  // --- STUDENT SPIN HISTORY ---
  function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const emptyMsg = document.getElementById('history-empty-msg');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!history || history.length === 0) {
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    history.forEach(item => {
      const tr = document.createElement('tr');
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      tr.innerHTML = `
        <td><strong>${item.studentName}</strong></td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:6px;">
            ${item.prizeIcon || '🎁'} <span>${item.prizeName}</span>
          </span>
        </td>
        <td style="color:#64748B">${dateStr} ${timeStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function clearHistory() {
    if (confirm('Clear all student spin history records?')) {
      history = [];
      saveHistory();
      renderHistoryTable();
      showToast('Spin history cleared.', 'success');
    }
  }

  function exportHistoryToCSV() {
    if (!history || history.length === 0) {
      showToast('No spin history to export yet!', 'error');
      return;
    }

    let csv = 'Student Name,Reward,Date,Time\n';
    history.forEach(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString();
      const dateStr = date.toISOString().split('T')[0];
      const safeName = `"${item.studentName.replace(/"/g, '""')}"`;
      const safePrize = `"${item.prizeName.replace(/"/g, '""')}"`;
      csv += `${safeName},${safePrize},${dateStr},${timeStr}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Classroom_Rewards_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported spin history to CSV!', 'success');
  }

  // --- QUICK STUDENT ROSTER ---
  function renderQuickRoster() {
    const container = document.getElementById('quick-roster-container');
    if (!container) return;

    container.innerHTML = '';
    const roster = settings.studentRoster || [];

    if (roster.length === 0) return;

    const label = document.createElement('span');
    label.className = 'roster-label';
    label.textContent = 'Class Roster:';
    container.appendChild(label);

    roster.forEach(name => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'roster-chip';
      chip.textContent = name;
      chip.addEventListener('click', () => {
        const input = document.getElementById('student-name-input');
        if (input) {
          input.value = name;
          input.focus();
        }
      });
      container.appendChild(chip);
    });
  }

  // --- PRESENTATION MODE & FULLSCREEN ---
  function togglePresentationMode() {
    playClickSound();
    const isCurrentlyPresentation = document.body.classList.contains('presentation-mode');

    if (!isCurrentlyPresentation) {
      document.body.classList.add('presentation-mode');
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      showToast('Presentation Mode Active! Press ESC to exit.', 'success');
    } else {
      document.body.classList.remove('presentation-mode');
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    setTimeout(() => {
      setupCanvasDPI();
      renderWheel();
    }, 150);
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'default') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✨' : type === 'error' ? '⚠️' : 'ℹ️'}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // --- INITIALIZATION & EVENT LISTENERS ---
  function init() {
    // 1. Initial Data & UI
    applySettingsToUI();
    setupCanvasDPI();
    preloadImages();
    renderWheel();
    setupBulbs();
    startBulbChasing();

    // Resize Handler
    window.addEventListener('resize', () => {
      setupCanvasDPI();
      renderWheel();
    });

    // 2. Wheel Clicks
    const spinBtn = document.getElementById('spin-now-btn');
    if (spinBtn) spinBtn.addEventListener('click', spinWheel);

    const hub = document.querySelector('.wheel-center-hub');
    if (hub) hub.addEventListener('click', spinWheel);

    // 3. Student input Enter key spins
    const studentInput = document.getElementById('student-name-input');
    if (studentInput) {
      studentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          spinWheel();
        }
      });
    }

    // 4. Winner Modal Actions
    const playAgainBtn = document.getElementById('winner-play-again-btn');
    if (playAgainBtn) playAgainBtn.addEventListener('click', closeWinnerModal);

    const closeWinnerBtn = document.getElementById('close-winner-modal-btn');
    if (closeWinnerBtn) closeWinnerBtn.addEventListener('click', closeWinnerModal);

    // 5. Sound Toggle in Header
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        settings.soundEnabled = !settings.soundEnabled;
        saveSettings();
        applySettingsToUI();
        if (settings.soundEnabled) {
          playClickSound();
          showToast('Sound effects enabled 🔊', 'success');
        } else {
          showToast('Sound effects muted 🔇', 'default');
        }
      });
    }

    // 6. Presentation Mode Toggle
    const presBtn = document.getElementById('presentation-btn');
    if (presBtn) presBtn.addEventListener('click', togglePresentationMode);

    const exitPresBtn = document.getElementById('exit-presentation-btn');
    if (exitPresBtn) exitPresBtn.addEventListener('click', togglePresentationMode);

    // 7. Teacher Mode Locks & Buttons
    const teacherModeBtn = document.getElementById('teacher-mode-btn');
    if (teacherModeBtn) teacherModeBtn.addEventListener('click', openPasswordModal);

    const cancelPwdBtn = document.getElementById('cancel-pwd-btn');
    if (cancelPwdBtn) cancelPwdBtn.addEventListener('click', closePasswordModal);

    const submitPwdBtn = document.getElementById('submit-pwd-btn');
    if (submitPwdBtn) submitPwdBtn.addEventListener('click', verifyTeacherPassword);

    const pwdInput = document.getElementById('teacher-pwd-input');
    if (pwdInput) {
      pwdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') verifyTeacherPassword();
      });
    }

    // 8. Admin Tabs Switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        playClickSound();
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
      });
    });

    // 9. Admin Modal Close & Actions
    const closeAdminBtn = document.getElementById('close-admin-btn');
    if (closeAdminBtn) closeAdminBtn.addEventListener('click', closeAdminModal);

    const addPrizeBtn = document.getElementById('add-prize-btn');
    if (addPrizeBtn) addPrizeBtn.addEventListener('click', () => openPrizeFormModal(null));

    const cancelPrizeFormBtn = document.getElementById('cancel-prize-form-btn');
    if (cancelPrizeFormBtn) cancelPrizeFormBtn.addEventListener('click', closePrizeFormModal);

    const savePrizeFormBtn = document.getElementById('save-prize-form-btn');
    if (savePrizeFormBtn) savePrizeFormBtn.addEventListener('click', savePrizeFromForm);

    const imageFileInput = document.getElementById('prize-image-file');
    if (imageFileInput) {
      imageFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImageUpload(e.target.files[0]);
        }
      });
    }

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettingsFromAdmin);

    const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
    if (resetDefaultsBtn) resetDefaultsBtn.addEventListener('click', resetToDefaults);

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

    const exportCsvBtn = document.getElementById('export-history-btn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportHistoryToCSV);

    // Keyboard Shortcuts (Escape closes modals)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const winnerModal = document.getElementById('winner-modal');
        if (winnerModal && winnerModal.classList.contains('active')) {
          closeWinnerModal();
          return;
        }

        const pwdModal = document.getElementById('password-modal');
        if (pwdModal && pwdModal.classList.contains('active')) {
          closePasswordModal();
          return;
        }

        const prizeForm = document.getElementById('prize-form-modal');
        if (prizeForm && prizeForm.classList.contains('active')) {
          closePrizeFormModal();
          return;
        }

        const adminModal = document.getElementById('admin-modal');
        if (adminModal && adminModal.classList.contains('active')) {
          closeAdminModal();
          return;
        }

        if (document.body.classList.contains('presentation-mode')) {
          togglePresentationMode();
        }
      }
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
