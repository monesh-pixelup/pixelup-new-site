export type Viewport = { w: number; h: number; mobile: boolean };

/** Where the mark sits, in viewport px. `g` is the glyph height; `gap` adds separation between the halves (glyph units). */
export type Dock = {
  x: number;
  y: number;
  g: number;
  gap: number;
  rx: number;
  ry: number;
  rz: number;
  dots: number;
};

export type DockStop = { at: number; dock: (vp: Viewport, scroll: number) => Dock };
