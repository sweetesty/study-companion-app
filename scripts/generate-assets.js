// Run with: node scripts/generate-assets.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets');

// ─── SVGs ────────────────────────────────────────────────────────────────────

const iconSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a0a2e"/>
      <stop offset="100%" stop-color="#0d0d0d"/>
    </linearGradient>
    <linearGradient id="bulb" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" rx="210" fill="url(#bg)"/>

  <!-- Outer glow halo -->
  <circle cx="512" cy="430" r="280" fill="url(#glow)"/>

  <!-- Blurred glow behind bulb -->
  <circle cx="512" cy="415" r="200" fill="#4F46E5" opacity="0.25" filter="url(#blur)"/>

  <!-- Bulb dome -->
  <circle cx="512" cy="400" r="198" fill="url(#bulb)" opacity="0.97"/>

  <!-- Bulb neck -->
  <path d="M428 565 Q428 598 435 598 L589 598 Q596 598 596 565 L596 540 L428 540 Z"
        fill="url(#bulb)" opacity="0.97"/>

  <!-- Collar / base rings -->
  <rect x="412" y="598" width="200" height="38" rx="19" fill="#5B21B6"/>
  <rect x="428" y="638" width="168" height="34" rx="17" fill="#4C1D95"/>
  <rect x="448" y="674" width="128" height="30" rx="15" fill="#3B0764"/>

  <!-- Shine highlight on glass -->
  <ellipse cx="455" cy="318" rx="55" ry="80"
           fill="white" opacity="0.13"
           transform="rotate(-25 455 318)"/>
  <ellipse cx="465" cy="310" rx="22" ry="36"
           fill="white" opacity="0.18"
           transform="rotate(-25 465 310)"/>

  <!-- Lightning bolt filament -->
  <polyline
    points="486,360 518,445 498,445 538,535"
    stroke="white" stroke-width="20" fill="none"
    stroke-linecap="round" stroke-linejoin="round"
    opacity="0.9"/>

  <!-- Spark dots -->
  <circle cx="390" cy="280" r="7" fill="#60A5FA" opacity="0.8"/>
  <circle cx="638" cy="310" r="5" fill="#A78BFA" opacity="0.7"/>
  <circle cx="360" cy="370" r="4" fill="#60A5FA" opacity="0.6"/>
  <circle cx="665" cy="400" r="6" fill="#A78BFA" opacity="0.65"/>
  <circle cx="400" cy="220" r="5" fill="#60A5FA" opacity="0.5"/>
  <circle cx="624" cy="235" r="4" fill="#A78BFA" opacity="0.5"/>
</svg>`;

const splashSvg = `
<svg width="2048" height="2048" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d0820"/>
      <stop offset="100%" stop-color="#0B0B0B"/>
    </linearGradient>
    <linearGradient id="bulb" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="20"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="2048" height="2048" fill="url(#bg)"/>

  <!-- Ambient glow -->
  <circle cx="1024" cy="900" r="500" fill="url(#glow)"/>
  <circle cx="1024" cy="850" r="300" fill="#4F46E5" opacity="0.15" filter="url(#blur)"/>

  <!-- Bulb dome -->
  <circle cx="1024" cy="820" r="280" fill="url(#bulb)" opacity="0.97"/>

  <!-- Neck -->
  <path d="M880 1068 Q880 1110 890 1110 L1158 1110 Q1168 1110 1168 1068 L1168 1040 L880 1040 Z"
        fill="url(#bulb)" opacity="0.97"/>

  <!-- Base rings -->
  <rect x="864" y="1110" width="296" height="52" rx="26" fill="#5B21B6"/>
  <rect x="888" y="1164" width="248" height="48" rx="24" fill="#4C1D95"/>
  <rect x="916" y="1214" width="192" height="42" rx="21" fill="#3B0764"/>

  <!-- Glass shine -->
  <ellipse cx="930" cy="680" rx="76" ry="110"
           fill="white" opacity="0.12"
           transform="rotate(-25 930 680)"/>

  <!-- Filament -->
  <polyline
    points="980,740 1032,870 1000,870 1056,1010"
    stroke="white" stroke-width="28" fill="none"
    stroke-linecap="round" stroke-linejoin="round"
    opacity="0.9"/>

  <!-- App name -->
  <text x="1024" y="1360" font-family="system-ui, -apple-system, sans-serif"
        font-size="88" font-weight="700" fill="white"
        text-anchor="middle" letter-spacing="-2">StudyMate</text>

  <!-- Tagline -->
  <text x="1024" y="1440" font-family="system-ui, -apple-system, sans-serif"
        font-size="44" font-weight="400" fill="#9CA3AF"
        text-anchor="middle">Your AI Study Companion</text>

  <!-- Spark dots -->
  <circle cx="780" cy="580" r="10" fill="#60A5FA" opacity="0.8"/>
  <circle cx="1280" cy="630" r="8" fill="#A78BFA" opacity="0.7"/>
  <circle cx="730" cy="740" r="7" fill="#60A5FA" opacity="0.6"/>
  <circle cx="1330" cy="800" r="9" fill="#A78BFA" opacity="0.65"/>
</svg>`;

const foregroundSvg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bulb" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>

  <!-- Transparent bg for adaptive icon foreground -->
  <circle cx="512" cy="440" r="240" fill="url(#bulb)" opacity="0.97"/>
  <path d="M388 650 Q388 690 398 690 L626 690 Q636 690 636 650 L636 620 L388 620 Z"
        fill="url(#bulb)" opacity="0.97"/>
  <rect x="372" y="690" width="280" height="46" rx="23" fill="#5B21B6"/>
  <rect x="392" y="738" width="240" height="40" rx="20" fill="#4C1D95"/>
  <rect x="416" y="780" width="192" height="36" rx="18" fill="#3B0764"/>
  <ellipse cx="458" cy="348" rx="68" ry="96"
           fill="white" opacity="0.13"
           transform="rotate(-25 458 348)"/>
  <polyline
    points="480,400 516,498 494,498 534,598"
    stroke="white" stroke-width="22" fill="none"
    stroke-linecap="round" stroke-linejoin="round"
    opacity="0.9"/>
</svg>`;

// ─── Generate ──────────────────────────────────────────────────────────────

async function generate() {
  console.log('Generating app assets...');

  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓ icon.png (1024x1024)');

  await sharp(Buffer.from(splashSvg))
    .resize(2048, 2048)
    .png()
    .toFile(path.join(ASSETS, 'splash-icon.png'));
  console.log('✓ splash-icon.png (2048x2048)');

  await sharp(Buffer.from(foregroundSvg))
    .png()
    .toFile(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png');

  // Favicon (small version)
  await sharp(Buffer.from(iconSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✓ favicon.png (48x48)');

  console.log('\nAll assets generated! Run `eas build` to include them.');
}

generate().catch(console.error);
