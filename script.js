(() => {
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.nav');
  const menuToggle = document.querySelector('.menu-toggle');
  const soundToggle = document.querySelector('.sound-toggle');
  const soundLabel = document.querySelector('.sound-label');
  const status = document.querySelector('.form-status');
  const form = document.querySelector('.contact-form');
  document.querySelector('#year').textContent = new Date().getFullYear();

  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('open', open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }));

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...nav.querySelectorAll('a')];
  const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
  }), { rootMargin: '-35% 0px -55% 0px' });
  sections.forEach(section => sectionObserver.observe(section));

  // A tiny, locally generated ambient drone. It is created only after an explicit click.
  let audioContext;
  let oscillators = [];
  let masterGain;
  const setSound = async enabled => {
    if (enabled) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        soundLabel.textContent = 'Audio unavailable';
        soundToggle.disabled = true;
        return;
      }
      audioContext ||= new AudioContextClass();
      await audioContext.resume();
      if (!oscillators.length) {
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(audioContext.destination);
        [55, 82.41, 110.03].forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const voiceGain = audioContext.createGain();
          oscillator.type = index === 1 ? 'sine' : 'triangle';
          oscillator.frequency.value = frequency;
          voiceGain.gain.value = index === 0 ? 0.42 : 0.16;
          oscillator.connect(voiceGain).connect(masterGain);
          oscillator.start();
          oscillators.push(oscillator);
        });
      }
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0.035, audioContext.currentTime, 0.8);
    } else if (masterGain && audioContext) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.25);
    }
    soundToggle.setAttribute('aria-pressed', String(enabled));
    soundLabel.textContent = enabled ? 'Sound on' : 'Sound off';
    soundToggle.title = enabled ? 'Mute ambient space sound' : 'Enable ambient space sound';
  };
  soundToggle.addEventListener('click', () => setSound(soundToggle.getAttribute('aria-pressed') !== 'true'));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    status.classList.remove('error');
    const submit = form.querySelector('button[type="submit"]');
    const endpoint = form.getAttribute('action');
    if (endpoint.includes('YOUR_FORM_ID')) {
      status.textContent = 'Add your Formspree form ID to enable message delivery.';
      status.classList.add('error');
      return;
    }
    submit.disabled = true;
    submit.dataset.originalText = submit.innerHTML;
    submit.textContent = 'Sending…';
    status.textContent = '';
    try {
      const response = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Message could not be sent. Please try again.');
      status.textContent = 'Thanks for reaching out — your message has been sent.';
      form.reset();
    } catch (error) {
      status.textContent = error.message || 'Something went wrong. Please try again.';
      status.classList.add('error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = submit.dataset.originalText;
    }
  });

  // Lightweight star points on a canvas; pointer movement shifts the field slightly for depth.
  const canvas = document.querySelector('.starfield');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [];
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(150, Math.floor((innerWidth * innerHeight) / 8000));
    stars = Array.from({ length: count }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.15 + 0.25, a: Math.random() * 0.56 + 0.16, phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.018 + 0.004, depth: Math.random() * 0.45 + 0.08 }));
    draw();
  };
  const draw = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const time = frame++;
    stars.forEach(star => {
      const twinkle = reduceMotion ? 0.88 : 0.65 + Math.sin(time * star.speed + star.phase) * 0.35;
      const x = star.x - pointerX * star.depth;
      const y = star.y - pointerY * star.depth;
      ctx.beginPath();
      ctx.fillStyle = `rgba(211, 218, 255, ${star.a * twinkle})`;
      ctx.arc((x + innerWidth) % innerWidth, (y + innerHeight) % innerHeight, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', event => {
    pointerX = (event.clientX / innerWidth - 0.5) * 22;
    pointerY = (event.clientY / innerHeight - 0.5) * 22;
  }, { passive: true });
  resize();
})();
