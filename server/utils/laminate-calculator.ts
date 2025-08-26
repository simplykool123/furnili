// laminate-calculator.ts - Clean TypeScript implementation
export type WardrobeType = "OPENABLE" | "SLIDING" | "WALKIN";

export type PanelKind =
  | "SIDE" | "TOP" | "BOTTOM" | "SHELF" | "PARTITION" | "BACK"
  | "SHUTTER" | "DOOR" | "DRAWER_FRONT"
  | "LOFT_SIDE" | "LOFT_TOP" | "LOFT_BOTTOM" | "LOFT_BACK" | "LOFT_SHELF";

export type Panel = {
  id: string;
  kind: PanelKind;
  w_mm: number;
  h_mm: number;
  qty: number;
  // For carcass sides: is this edge visible to the room (not against a wall)?
  // Use for base & loft sides.
  isExposedEnd?: boolean;
};

export type LaminateRates = {
  outerRatePerSqft: number; // e.g., 85
  innerRatePerSqft: number; // e.g., 65
  adhesiveCoverageSqftPerBottle: number; // e.g., 32
  adhesiveBottlePrice: number; // e.g., 85
  adhesiveWastePct?: number; // e.g., 0.10 (10%)
};

export type LaminateFace = "outer" | "inner" | "none";

export type LaminateSummary = {
  outerAreaSqft: number;
  innerAreaSqft: number;
  laminatedAreaSqft: number;
  adhesiveBottles: number;
  costs: {
    outerCost: number;
    innerCost: number;
    adhesiveCost: number;
    total: number;
  };
  // Optional: per-panel breakdown for UI
  perPanel: Array<{
    id: string;
    kind: PanelKind;
    areaSqft: number;
    faces: [LaminateFace, LaminateFace];
    faceAreas: { outer: number; inner: number; none: number };
  }>;
};

const MM2_PER_SQFT = 92903.04;

function areaSqft(w_mm: number, h_mm: number) {
  return (w_mm * h_mm) / MM2_PER_SQFT;
}

function facesForPanel(p: Panel, wardrobeType: WardrobeType): [LaminateFace, LaminateFace] {
  // Two faces per rectangular panel: [faceA, faceB]
  // Convention: for carcass sides, faceA = interior, faceB = exterior (room side)
  switch (p.kind) {
    case "SHUTTER":
    case "DOOR":
    case "DRAWER_FRONT":
      // Customer-facing fronts and backs laminated with outer on both sides
      return ["outer", "outer"];

    case "SIDE":
    case "LOFT_SIDE": {
      // Carcass sides: interior always inner; exterior is outer only if exposed
      const exterior: LaminateFace = p.isExposedEnd ? "outer" : "none";
      return ["inner", exterior];
    }

    case "TOP":
    case "BOTTOM":
    case "PARTITION":
    case "SHELF":
    case "LOFT_TOP":
    case "LOFT_BOTTOM":
    case "LOFT_SHELF":
      // Single visible interior face (keep simple, matches your rule)
      return ["inner", "none"];

    case "BACK":
    case "LOFT_BACK":
      return ["none", "none"];

    default:
      return ["none", "none"];
  }
}

export function calculateLaminateBOM(
  panels: Panel[],
  wardrobeType: WardrobeType,
  rates: LaminateRates
): LaminateSummary {
  const {
    outerRatePerSqft,
    innerRatePerSqft,
    adhesiveCoverageSqftPerBottle,
    adhesiveBottlePrice,
    adhesiveWastePct = 0.10, // Default 10% waste
  } = rates;

  let outerArea = 0, innerArea = 0;

  const perPanel = panels.map(p => {
    const a = areaSqft(p.w_mm, p.h_mm);
    const faces = facesForPanel(p, wardrobeType);
    
    // face contributions per unit panel
    const countOuterFaces = faces.filter(f => f === "outer").length;
    const countInnerFaces = faces.filter(f => f === "inner").length;

    const outerA = a * countOuterFaces * p.qty;
    const innerA = a * countInnerFaces * p.qty;

    outerArea += outerA;
    innerArea += innerA;

    return {
      id: p.id,
      kind: p.kind,
      areaSqft: a * p.qty,
      faces,
      faceAreas: {
        outer: outerA,
        inner: innerA,
        none: a * (2 - (countOuterFaces + countInnerFaces)) * p.qty,
      },
    };
  });

  const laminatedArea = outerArea + innerArea;

  const bottles = Math.ceil(
    (laminatedArea * (1 + adhesiveWastePct)) / Math.max(1, adhesiveCoverageSqftPerBottle)
  );

  const outerCost = outerArea * outerRatePerSqft;
  const innerCost = innerArea * innerRatePerSqft;
  const adhesiveCost = bottles * adhesiveBottlePrice;
  const total = outerCost + innerCost + adhesiveCost;

  return {
    outerAreaSqft: round2(outerArea),
    innerAreaSqft: round2(innerArea),
    laminatedAreaSqft: round2(laminatedArea),
    adhesiveBottles: bottles,
    costs: {
      outerCost: round0(outerCost),
      innerCost: round0(innerCost),
      adhesiveCost: round0(adhesiveCost),
      total: round0(total),
    },
    perPanel,
  };
}

// Helper function to map our existing panel names to PanelKind
export function mapPanelNameToKind(panelName: string): PanelKind {
  const name = panelName.toLowerCase();
  
  if (name.includes('side panel')) return "SIDE";
  if (name.includes('top panel')) return "TOP";  
  if (name.includes('bottom panel')) return "BOTTOM";
  if (name.includes('shelf')) return "SHELF";
  if (name.includes('partition')) return "PARTITION";
  if (name.includes('back panel')) return "BACK";
  if (name.includes('shutter')) return "SHUTTER";
  if (name.includes('door')) return "DOOR";
  if (name.includes('drawer front')) return "DRAWER_FRONT";
  
  // Loft components
  if (name.includes('loft') && name.includes('side')) return "LOFT_SIDE";
  if (name.includes('loft') && name.includes('top')) return "LOFT_TOP";
  if (name.includes('loft') && name.includes('bottom')) return "LOFT_BOTTOM";
  if (name.includes('loft') && name.includes('back')) return "LOFT_BACK";
  if (name.includes('loft') && name.includes('shelf')) return "LOFT_SHELF";
  
  // Default fallback
  return "PARTITION";
}

// Helper function to map wardrobe types
export function mapWardrobeType(wardrobeType: string): WardrobeType {
  const type = wardrobeType.toLowerCase();
  if (type === 'sliding') return "SLIDING";
  if (type === 'walkin') return "WALKIN";
  return "OPENABLE"; // Default
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round0(n: number) { return Math.round(n); }