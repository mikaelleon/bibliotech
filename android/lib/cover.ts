const DARK = [
  "#8C3B3F",
  "#2F4A43",
  "#1F3A57",
  "#A24A34",
  "#56704F",
  "#3A2430",
  "#6B5B7A",
  "#7A6A4F",
];

const LIGHT = ["#D9C58A", "#CFC9B8", "#C9D3D6", "#E4D3B4"];

/** Stable cover colors from the book id. Same id always lands on the same swatch. */
export function coverColors(id: string): { background: string; color: string } {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(index)) >>> 0;
  }

  const palette = [
    ...DARK.map((background) => ({ background, color: "#FFFFFF" })),
    ...LIGHT.map((background) => ({ background, color: "#1F2330" })),
  ];

  return palette[hash % palette.length];
}
