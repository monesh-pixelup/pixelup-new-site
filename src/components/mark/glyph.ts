// PIXELUP logo mark (Figma "Union", Cover / Logo). Glyph height = 1, centred on the origin, y up.
// The mark is two pieces: the folded band (top) and the wedge (bottom). Each is a flat [x0, y0, x1, y1, ...] outline.
export const GLYPH_TOP = [0.57737,0.14271,0.41253,-0.14282,0,-0.14277,0.16483,0.14271,-0.16481,0.14271,-0.37108,0.5,0.37108,0.5];
export const GLYPH_BOTTOM = [0,-0.14277,-0.20628,-0.5,-0.57737,0.14274,-0.16483,0.14274];
export const GLYPH_ASPECT = 1.15475;
/** Where the two pieces meet; they hinge open around this point. */
export const GLYPH_SEAM: [number, number] = [0, -0.14277];
