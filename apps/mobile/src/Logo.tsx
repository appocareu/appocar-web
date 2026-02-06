import { SvgXml } from "react-native-svg";

const svg = `
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="20" y1="10" x2="108" y2="118" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6FB3FF"/>
      <stop offset="1" stop-color="#2D6CDF"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="108" height="108" rx="28" fill="url(#g)"/>
  <path d="M44 92L64 38L84 92" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M58 76L88 60" stroke="white" stroke-width="8" stroke-linecap="round"/>
</svg>
`;

export function Logo({ size = 32 }: { size?: number }) {
  return <SvgXml xml={svg} width={size} height={size} />;
}
