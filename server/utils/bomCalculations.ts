// BOM Calculation Engine
// Based on the provided specifications for furniture calculation

interface CalculationInput {
  unitType: string;
  height: number; // mm
  width: number; // mm
  depth: number; // mm
  unitOfMeasure: string;
  partsConfig: {
    shelves: number;
    drawers: number;
    shutters: number;
    doors: number;
    backPanels: number;
    customParts: Array<{ name: string; quantity: number }>;
  };
  boardType: string;
  boardThickness: string;
  finish: string;
}

interface Panel {
  panel: string;
  qty: number;
  size: string; // "2100mm x 450mm"
  length: number; // mm
  width: number; // mm
  material: string;
  edge_banding: string; // "2mm" or "0.8mm"
  area_sqft: number;
  edgeBandingLength: number; // in feet
}

interface Hardware {
  item: string;
  qty: number;
  unit_rate: number;
  total_cost: number;
}

interface BOMResult {
  panels: Panel[];
  hardware: Hardware[];
  material_cost: number;
  hardware_cost: number;
  total_cost: number;
  totalBoardArea: number;
  totalEdgeBanding2mm: number;
  totalEdgeBanding0_8mm: number;
}

// Default rates (can be overridden by database values)
const DEFAULT_RATES = {
  board: {
    pre_lam_particle_board: 80,
    mdf: 100,
    ply: 120,
    solid_wood: 150,
    hdf: 90,
  },
  edge_banding: {
    "2mm": 4, // per foot
    "0.8mm": 2, // per foot
  },
  hardware: {
    hinge: 30,
    lock: 80,
    minifix: 10,
    dowel: 2,
    straightener: 150,
    handle: 25,
    drawer_slide: 120,
    wall_bracket: 50,
  }
};

// Convert mm² to sqft
const mmSqToSqft = (length: number, width: number): number => {
  return (length * width) / 92903;
};

// Convert mm to feet for edge banding
const mmToFeet = (mm: number): number => {
  return mm / 304.8;
};

// Calculate edge banding length for a panel (perimeter)
const calculateEdgeBandingLength = (length: number, width: number): number => {
  const perimeterMm = 2 * (length + width);
  return mmToFeet(perimeterMm);
};

// Generate panels for wardrobe
const generateWardrobePanels = (input: CalculationInput): Panel[] => {
  const { height, width, depth, boardType, boardThickness, partsConfig } = input;
  const panels: Panel[] = [];
  const material = `${boardThickness} ${boardType.toUpperCase()}`;

  // External Panels (2mm edge banding)
  
  // Top panel
  panels.push({
    panel: "Top Panel",
    qty: 1,
    size: `${width}mm x ${depth}mm`,
    length: width,
    width: depth,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(width, depth),
    edgeBandingLength: calculateEdgeBandingLength(width, depth),
  });

  // Bottom panel
  panels.push({
    panel: "Bottom Panel",
    qty: 1,
    size: `${width}mm x ${depth}mm`,
    length: width,
    width: depth,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(width, depth),
    edgeBandingLength: calculateEdgeBandingLength(width, depth),
  });

  // Side panels (2 pieces)
  panels.push({
    panel: "Side Panel",
    qty: 2,
    size: `${height}mm x ${depth}mm`,
    length: height,
    width: depth,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(height, depth) * 2,
    edgeBandingLength: calculateEdgeBandingLength(height, depth) * 2,
  });

  // Shutters
  if (partsConfig.shutters > 0) {
    const shutterWidth = width / partsConfig.shutters;
    panels.push({
      panel: "Shutter",
      qty: partsConfig.shutters,
      size: `${height}mm x ${shutterWidth}mm`,
      length: height,
      width: shutterWidth,
      material,
      edge_banding: "2mm",
      area_sqft: mmSqToSqft(height, shutterWidth) * partsConfig.shutters,
      edgeBandingLength: calculateEdgeBandingLength(height, shutterWidth) * partsConfig.shutters,
    });
  }

  // Back panel (if specified)
  if (partsConfig.backPanels > 0) {
    panels.push({
      panel: "Back Panel",
      qty: partsConfig.backPanels,
      size: `${width}mm x ${height}mm`,
      length: width,
      width: height,
      material: `6mm ${boardType.toUpperCase()}`, // Usually thinner for back panels
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(width, height) * partsConfig.backPanels,
      edgeBandingLength: calculateEdgeBandingLength(width, height) * partsConfig.backPanels,
    });
  }

  // Internal Panels (0.8mm edge banding)
  
  // Shelves
  if (partsConfig.shelves > 0) {
    const shelfWidth = width - 36; // Account for side panel thickness
    const shelfDepth = depth - 18; // Account for back panel if any
    panels.push({
      panel: "Shelf",
      qty: partsConfig.shelves,
      size: `${shelfWidth}mm x ${shelfDepth}mm`,
      length: shelfWidth,
      width: shelfDepth,
      material,
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(shelfWidth, shelfDepth) * partsConfig.shelves,
      edgeBandingLength: calculateEdgeBandingLength(shelfWidth, shelfDepth) * partsConfig.shelves,
    });
  }

  // Drawer components
  if (partsConfig.drawers > 0) {
    const drawerWidth = width - 36; // Account for side panel thickness
    const drawerDepth = depth - 18;
    const drawerHeight = 150; // Standard drawer height

    // Drawer bottom
    panels.push({
      panel: "Drawer Bottom",
      qty: partsConfig.drawers,
      size: `${drawerWidth}mm x ${drawerDepth}mm`,
      length: drawerWidth,
      width: drawerDepth,
      material: `12mm ${boardType.toUpperCase()}`, // Usually thinner for drawer bottoms
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(drawerWidth, drawerDepth) * partsConfig.drawers,
      edgeBandingLength: calculateEdgeBandingLength(drawerWidth, drawerDepth) * partsConfig.drawers,
    });

    // Drawer sides (4 pieces per drawer: front, back, left, right)
    panels.push({
      panel: "Drawer Side",
      qty: partsConfig.drawers * 4,
      size: `${drawerHeight}mm x ${drawerDepth}mm`,
      length: drawerHeight,
      width: drawerDepth,
      material,
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(drawerHeight, drawerDepth) * partsConfig.drawers * 4,
      edgeBandingLength: calculateEdgeBandingLength(drawerHeight, drawerDepth) * partsConfig.drawers * 4,
    });
  }

  // Custom parts
  partsConfig.customParts.forEach((customPart, index) => {
    if (customPart.name && customPart.quantity > 0) {
      const customWidth = Math.min(width, depth) * 0.8; // Estimate size
      const customHeight = Math.min(width, depth) * 0.6;
      
      panels.push({
        panel: customPart.name,
        qty: customPart.quantity,
        size: `${customWidth}mm x ${customHeight}mm`,
        length: customWidth,
        width: customHeight,
        material,
        edge_banding: "0.8mm", // Assume internal part
        area_sqft: mmSqToSqft(customWidth, customHeight) * customPart.quantity,
        edgeBandingLength: calculateEdgeBandingLength(customWidth, customHeight) * customPart.quantity,
      });
    }
  });

  return panels;
};

// Generate hardware for wardrobe
const generateWardrobeHardware = (input: CalculationInput): Hardware[] => {
  const { height, partsConfig } = input;
  const hardware: Hardware[] = [];

  // Locks - 1 per shutter
  if (partsConfig.shutters > 0) {
    hardware.push({
      item: "Lock",
      qty: partsConfig.shutters,
      unit_rate: DEFAULT_RATES.hardware.lock,
      total_cost: partsConfig.shutters * DEFAULT_RATES.hardware.lock,
    });
  }

  // Handles - 1 per shutter, 1 per drawer
  const totalHandles = partsConfig.shutters + partsConfig.drawers;
  if (totalHandles > 0) {
    hardware.push({
      item: "Handle",
      qty: totalHandles,
      unit_rate: DEFAULT_RATES.hardware.handle,
      total_cost: totalHandles * DEFAULT_RATES.hardware.handle,
    });
  }

  // Hinges - 3 per shutter if H ≤ 1200mm, else 4 per shutter
  if (partsConfig.shutters > 0) {
    const hingesPerShutter = height <= 1200 ? 3 : 4;
    const totalHinges = partsConfig.shutters * hingesPerShutter;
    hardware.push({
      item: "Hinge",
      qty: totalHinges,
      unit_rate: DEFAULT_RATES.hardware.hinge,
      total_cost: totalHinges * DEFAULT_RATES.hardware.hinge,
    });
  }

  // Drawer slides - 2 per drawer
  if (partsConfig.drawers > 0) {
    const totalSlides = partsConfig.drawers * 2;
    hardware.push({
      item: "Drawer Slide",
      qty: totalSlides,
      unit_rate: DEFAULT_RATES.hardware.drawer_slide,
      total_cost: totalSlides * DEFAULT_RATES.hardware.drawer_slide,
    });
  }

  // Minifix - approximately 3 per joint
  // Estimate joints: top connections, bottom connections, shelf connections
  const estimatedJoints = 4 + partsConfig.shelves * 2; // Top/bottom + shelf connections
  const totalMinifix = estimatedJoints * 3;
  hardware.push({
    item: "Minifix",
    qty: totalMinifix,
    unit_rate: DEFAULT_RATES.hardware.minifix,
    total_cost: totalMinifix * DEFAULT_RATES.hardware.minifix,
  });

  // Dowels - approximately 5 per joint
  const totalDowels = estimatedJoints * 5;
  hardware.push({
    item: "Dowel",
    qty: totalDowels,
    unit_rate: DEFAULT_RATES.hardware.dowel,
    total_cost: totalDowels * DEFAULT_RATES.hardware.dowel,
  });

  // Straightener - if H > 2100mm, 1 per shutter
  if (height > 2100 && partsConfig.shutters > 0) {
    hardware.push({
      item: "Straightener",
      qty: partsConfig.shutters,
      unit_rate: DEFAULT_RATES.hardware.straightener,
      total_cost: partsConfig.shutters * DEFAULT_RATES.hardware.straightener,
    });
  }

  return hardware;
};

// Calculate BOM for different unit types
export const calculateBOM = async (input: CalculationInput, boardRates?: any, hardwareRates?: any): Promise<BOMResult> => {
  let panels: Panel[] = [];
  let hardware: Hardware[] = [];

  // Use custom rates if provided, otherwise use defaults
  const boardRate = boardRates?.[input.boardType] || DEFAULT_RATES.board[input.boardType as keyof typeof DEFAULT_RATES.board] || 80;
  const edgeRates = hardwareRates?.edge_banding || DEFAULT_RATES.edge_banding;
  const hwRates = hardwareRates?.hardware || DEFAULT_RATES.hardware;

  // Generate panels and hardware based on unit type
  switch (input.unitType) {
    case 'wardrobe':
      panels = generateWardrobePanels(input);
      hardware = generateWardrobeHardware(input);
      break;
      
    case 'storage_unit':
    case 'bookshelf':
      // Similar to wardrobe but simpler
      panels = generateWardrobePanels({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          shutters: 0, // Storage units typically don't have shutters
        }
      });
      hardware = generateWardrobeHardware({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          shutters: 0,
        }
      });
      break;
      
    case 'tv_panel':
      // TV panels are typically wall-mounted with fewer components
      panels = generateWardrobePanels({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          drawers: 0,
          shutters: Math.max(1, input.partsConfig.shutters), // At least 1 panel
        }
      });
      hardware = [
        ...generateWardrobeHardware({
          ...input,
          partsConfig: {
            ...input.partsConfig,
            drawers: 0,
          }
        }),
        {
          item: "Wall Bracket",
          qty: 4, // Standard wall mounting
          unit_rate: hwRates.wall_bracket || 50,
          total_cost: 4 * (hwRates.wall_bracket || 50),
        }
      ];
      break;
      
    case 'shoe_rack':
      // Shoe racks are typically open shelving
      panels = generateWardrobePanels({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          shutters: 0,
          drawers: 0,
          shelves: Math.max(3, input.partsConfig.shelves), // Minimum 3 shelves
        }
      });
      hardware = generateWardrobeHardware({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          shutters: 0,
          drawers: 0,
        }
      });
      break;
      
    default:
      // Custom or other types - use wardrobe as template
      panels = generateWardrobePanels(input);
      hardware = generateWardrobeHardware(input);
  }

  // Calculate costs
  let material_cost = 0;
  let totalBoardArea = 0;
  let totalEdgeBanding2mm = 0;
  let totalEdgeBanding0_8mm = 0;

  // Panel costs
  panels.forEach(panel => {
    const panelCost = panel.area_sqft * boardRate;
    material_cost += panelCost;
    totalBoardArea += panel.area_sqft;
    
    // Edge banding costs
    const edgeBandingRate = edgeRates[panel.edge_banding as keyof typeof edgeRates] || 0;
    const edgeBandingCost = panel.edgeBandingLength * edgeBandingRate;
    material_cost += edgeBandingCost;
    
    if (panel.edge_banding === "2mm") {
      totalEdgeBanding2mm += panel.edgeBandingLength;
    } else if (panel.edge_banding === "0.8mm") {
      totalEdgeBanding0_8mm += panel.edgeBandingLength;
    }
  });

  // Hardware costs
  const hardware_cost = hardware.reduce((sum, item) => sum + item.total_cost, 0);

  const total_cost = material_cost + hardware_cost;

  return {
    panels,
    hardware,
    material_cost,
    hardware_cost,
    total_cost,
    totalBoardArea,
    totalEdgeBanding2mm,
    totalEdgeBanding0_8mm,
  };
};

// Generate a unique BOM number
export const generateBOMNumber = async (): Promise<string> => {
  // This will be implemented to check database for the latest number
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BOM-${timestamp.toString().slice(-6)}${randomSuffix}`;
};

// Convert input dimensions based on unit of measure
export const convertDimensions = (height: number, width: number, depth: number, unitOfMeasure: string) => {
  if (unitOfMeasure === 'ft') {
    // Convert feet to mm
    return {
      height: height * 304.8,
      width: width * 304.8,
      depth: depth * 304.8,
    };
  }
  
  // Already in mm
  return { height, width, depth };
};