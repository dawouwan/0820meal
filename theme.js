// 공유 디자인 토큰 — Stitch 프로젝트("밥집찾기 - 로그인 시안")의 두 화면(로그인/홈)에서 추출한
// tailwind.config extend 블록을 하나로 병합한 것. Tailwind CDN 스크립트 다음에 로드해야 한다.
// PRD §6.0 팔레트(배경 #0a0e17, 네온 시안 #00f0ff, 네온 마젠타 #ff2ec4)를 기준으로 통일했다.
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0e17',
        surface: '#08112e',
        'surface-dim': '#08112e',
        'surface-bright': '#303856',
        'surface-container-lowest': '#040c29',
        'surface-container-low': '#111a37',
        'surface-container': '#151e3b',
        'surface-container-high': '#202846',
        'surface-container-highest': '#2b3352',
        'surface-variant': '#2b3352',
        'on-surface': '#dce1ff',
        'on-surface-variant': '#b9cacb',
        outline: '#849495',
        'outline-variant': '#3b494b',
        primary: '#00f0ff',
        'on-primary': '#00363a',
        'primary-container': '#00f0ff',
        'on-primary-container': '#08112e',
        'primary-fixed': '#7df4ff',
        'primary-fixed-dim': '#00dbe9',
        secondary: '#ff2ec4',
        'on-secondary': '#3c002b',
        'secondary-container': '#ff38c5',
        'on-secondary-container': '#55003f',
        'secondary-fixed': '#ffd8ea',
        'secondary-fixed-dim': '#ffaedb',
        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
      },
      keyframes: {
        'neon-flicker': {
          '0%, 100%': { filter: 'brightness(1)' },
          '3%': { filter: 'brightness(0.85)' },
          '6%': { filter: 'brightness(1)' },
          '7%': { filter: 'brightness(0.9)' },
          '8%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.05)' },
          '52%': { filter: 'brightness(0.95)' },
          '54%': { filter: 'brightness(1)' },
        },
        'neon-pulse': {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.35)' },
        },
      },
      animation: {
        'neon-flicker': 'neon-flicker 5s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 2.4s ease-in-out infinite',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        gutter: '16px',
        margin: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '32px',
        'container-max': '1280px',
      },
      fontFamily: {
        'headline-xl': ['Space Grotesk'],
        'headline-lg': ['Space Grotesk'],
        'headline-lg-mobile': ['Space Grotesk'],
        'headline-md': ['Space Grotesk'],
        'body-lg': ['JetBrains Mono'],
        'body-md': ['JetBrains Mono'],
        'body-sm': ['JetBrains Mono'],
        'code-md': ['JetBrains Mono'],
        'label-caps': ['JetBrains Mono'],
        'label-sm': ['JetBrains Mono'],
        'mono-label': ['JetBrains Mono'],
      },
      fontSize: {
        'headline-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '700' }],
        'headline-lg-mobile': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'code-md': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '1.0', letterSpacing: '0.1em', fontWeight: '700' }],
        'mono-label': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
    },
  },
};

// CSS 커스텀 프로퍼티로 동일한 네온 팔레트를 노출한다.
// styles.css의 .neon-border / .neon-text / .neon-glow-* / .chromatic-aberration 등
// 네온 발광 유틸리티 클래스가 --neon-cyan-rgb / --neon-magenta-rgb 를 참조하므로,
// 색을 바꿀 때는 위 tailwind.config.theme.extend.colors 값만 고치면
// Tailwind 클래스와 순수 CSS box-shadow/text-shadow 글로우가 동시에 갱신된다(단일 소스 오브 트루스).
(function syncNeonCssVars() {
  var c = tailwind.config.theme.extend.colors;
  var root = document.documentElement.style;

  function hexToRgbTriplet(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', ');
  }

  root.setProperty('--neon-cyan', c.primary);
  root.setProperty('--neon-magenta', c.secondary);

  var cyanRgb = hexToRgbTriplet(c.primary);
  var magentaRgb = hexToRgbTriplet(c.secondary);
  if (cyanRgb) root.setProperty('--neon-cyan-rgb', cyanRgb);
  if (magentaRgb) root.setProperty('--neon-magenta-rgb', magentaRgb);
})();
