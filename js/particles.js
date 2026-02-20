/* ============================================
   SAO-Style Floating Particles
   轻量级粒子效果，模拟 SAO 菜单界面的光点
   ============================================ */

(function () {
  const container = document.getElementById('particles');
  if (!container) return;

  const PARTICLE_COUNT = 35;
  const MIN_SIZE = 2;
  const MAX_SIZE = 5;
  const MIN_DURATION = 8;   // seconds
  const MAX_DURATION = 18;

  function createParticle() {
    const p = document.createElement('div');
    p.className = 'particle';

    const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
    const x = Math.random() * 100;          // vw position
    const startY = 80 + Math.random() * 20; // start near bottom
    const duration = MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
    const delay = Math.random() * duration;  // stagger

    // 随机浅蓝 / 白 / 浅金色
    const colors = [
      'rgba(100, 200, 255, 0.6)',
      'rgba(160, 220, 255, 0.5)',
      'rgba(255, 255, 255, 0.4)',
      'rgba(200, 230, 255, 0.5)',
      'rgba(240, 210, 120, 0.3)',
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    Object.assign(p.style, {
      width: size + 'px',
      height: size + 'px',
      left: x + 'vw',
      bottom: '-' + startY + 'px',
      background: color,
      boxShadow: `0 0 ${size * 2}px ${color}`,
      animationDuration: duration + 's',
      animationDelay: '-' + delay + 's',
    });

    container.appendChild(p);
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    createParticle();
  }
})();
