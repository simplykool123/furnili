import React from 'react';

// BOM Result interface
interface BomResult {
  id: number;
  calculationNumber: string;
  totalBoardArea: number;
  boardAreaByThickness: { [thickness: string]: number };
  totalEdgeBanding2mm: number;
  totalEdgeBanding0_8mm: number;
  totalMaterialCost: number;
  totalHardwareCost: number;
  totalCost: number;
  items: BomItem[];
  consolidatedItems?: any[]; // Optional for consolidated view
}

interface BomItem {
  id: number;
  itemType: string;
  itemCategory: string;
  partName: string;
  materialType?: string;
  length?: number;
  width?: number;
  thickness?: number;
  quantity: number;
  unit: string;
  edgeBandingType?: string;
  edgeBandingLength: number;
  unitRate: number;
  totalCost: number;
  area_sqft?: number;
  description?: string;
}

interface FurnitureTechnicalDrawingProps {
  bomResult: BomResult;
  furnitureType: string;
  dimensions: {
    height: number;
    width: number;
    depth: number;
  };
  configuration: {
    shelves?: number;
    drawers?: number;
    doors?: number;
    shutters?: number;
  };
  unitOfMeasure: string;
}

export function FurnitureTechnicalDrawing({
  bomResult,
  furnitureType,
  dimensions,
  configuration,
  unitOfMeasure
}: FurnitureTechnicalDrawingProps) {
  const { height, width, depth } = dimensions;
  const { shelves = 0, drawers = 0, doors = 0, shutters = 0 } = configuration;

  // Scale for drawing (make it fit in a reasonable viewport)
  const maxDimension = Math.max(height, width);
  const scale = 400 / maxDimension; // Scale to fit in 400px max
  const drawingWidth = width * scale;
  const drawingHeight = height * scale;
  const drawingDepth = depth * scale;

  // Convert dimensions to display units
  const displayUnit = unitOfMeasure === 'mm' ? 'mm' : 'in';
  const convertDimension = (dim: number) => {
    if (unitOfMeasure === 'ft') {
      return (dim / 12).toFixed(1); // Convert inches to feet
    }
    return dim.toString();
  };

  // Generate shelf positions
  const shelfPositions = Array.from({ length: shelves }, (_, i) => {
    const spacing = drawingHeight / (shelves + 1);
    return spacing * (i + 1);
  });

  // Generate drawer positions (bottom section)
  const drawerHeight = drawingHeight / Math.max(drawers || 1, 4);
  const drawerPositions = Array.from({ length: drawers }, (_, i) => {
    const bottomSpace = drawingHeight - (drawerHeight * drawers);
    return bottomSpace + (drawerHeight * i);
  });

  return (
    <div className="w-full p-6 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Technical Drawing</h3>
        <div className="text-sm text-gray-600">
          {furnitureType.charAt(0).toUpperCase() + furnitureType.slice(1)} - Front View
        </div>
      </div>

      <div className="flex items-center justify-center">
        <svg
          width={drawingWidth + 120}
          height={drawingHeight + 120}
          viewBox={`0 0 ${drawingWidth + 120} ${drawingHeight + 120}`}
          className="border border-gray-200"
        >
          {/* Background */}
          <rect
            width={drawingWidth + 120}
            height={drawingHeight + 120}
            fill="white"
            stroke="none"
          />

          {/* Main cabinet frame */}
          <rect
            x="60"
            y="60"
            width={drawingWidth}
            height={drawingHeight}
            fill="none"
            stroke="#000"
            strokeWidth="2"
          />

          {/* Shelves */}
          {shelfPositions.map((y, i) => (
            <g key={`shelf-${i}`}>
              <line
                x1="60"
                y1={60 + y}
                x2={60 + drawingWidth}
                y2={60 + y}
                stroke="#000"
                strokeWidth="1"
                strokeDasharray="none"
              />
              {/* Shelf label */}
              <text
                x={65}
                y={60 + y - 3}
                fontSize="8"
                fill="#666"
                fontFamily="Arial, sans-serif"
              >
                Shelf {i + 1}
              </text>
            </g>
          ))}

          {/* Drawers */}
          {drawerPositions.map((y, i) => (
            <g key={`drawer-${i}`}>
              {/* Drawer box */}
              <rect
                x="60"
                y={60 + y}
                width={drawingWidth}
                height={drawerHeight}
                fill="none"
                stroke="#000"
                strokeWidth="1"
              />
              {/* Drawer handle */}
              <circle
                cx={60 + drawingWidth - 15}
                cy={60 + y + drawerHeight / 2}
                r="3"
                fill="#000"
              />
              {/* Drawer lines */}
              <line
                x1="65"
                y1={60 + y + 5}
                x2={60 + drawingWidth - 5}
                y2={60 + y + 5}
                stroke="#666"
                strokeWidth="0.5"
              />
            </g>
          ))}

          {/* Doors/Shutters */}
          {Array.from({ length: doors || shutters }, (_, i) => {
            const doorWidth = drawingWidth / (doors || shutters || 1);
            const doorX = 60 + (doorWidth * i);
            return (
              <g key={`door-${i}`}>
                {/* Door frame */}
                <rect
                  x={doorX}
                  y="60"
                  width={doorWidth}
                  height={drawingHeight}
                  fill="none"
                  stroke="#000"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                {/* Door handle */}
                <circle
                  cx={doorX + doorWidth - 10}
                  cy={60 + drawingHeight / 2}
                  r="2"
                  fill="#000"
                />
              </g>
            );
          })}

          {/* Dimension lines - Width */}
          <g>
            {/* Horizontal dimension line */}
            <line
              x1="50"
              y1={60 + drawingHeight + 15}
              x2={60 + drawingWidth + 10}
              y2={60 + drawingHeight + 15}
              stroke="#000"
              strokeWidth="1"
              markerEnd="url(#arrowhead)"
              markerStart="url(#arrowhead)"
            />
            {/* Dimension text */}
            <text
              x={60 + drawingWidth / 2}
              y={60 + drawingHeight + 30}
              textAnchor="middle"
              fontSize="12"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
            >
              {convertDimension(width)} {displayUnit}
            </text>
          </g>

          {/* Dimension lines - Height */}
          <g>
            {/* Vertical dimension line */}
            <line
              x1={60 + drawingWidth + 15}
              y1="50"
              x2={60 + drawingWidth + 15}
              y2={60 + drawingHeight + 10}
              stroke="#000"
              strokeWidth="1"
              markerEnd="url(#arrowhead)"
              markerStart="url(#arrowhead)"
            />
            {/* Dimension text */}
            <text
              x={60 + drawingWidth + 25}
              y={60 + drawingHeight / 2}
              textAnchor="start"
              fontSize="12"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              transform={`rotate(-90, ${60 + drawingWidth + 25}, ${60 + drawingHeight / 2})`}
            >
              {convertDimension(height)} {displayUnit}
            </text>
          </g>

          {/* Depth indicator (small 3D effect) */}
          <g>
            <line
              x1="60"
              y1="60"
              x2="50"
              y2="50"
              stroke="#666"
              strokeWidth="1"
            />
            <line
              x1={60 + drawingWidth}
              y1="60"
              x2={50 + drawingWidth}
              y2="50"
              stroke="#666"
              strokeWidth="1"
            />
            <line
              x1="50"
              y1="50"
              x2={50 + drawingWidth}
              y2="50"
              stroke="#666"
              strokeWidth="1"
            />
            <text
              x="30"
              y="45"
              fontSize="10"
              fill="#666"
              fontFamily="Arial, sans-serif"
            >
              {convertDimension(depth)} {displayUnit}
            </text>
          </g>

          {/* Arrow markers definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#000"
              />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Technical specifications */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-semibold mb-2">Specifications</h4>
          <div className="space-y-1">
            <div>Overall: {convertDimension(width)} × {convertDimension(depth)} × {convertDimension(height)} {displayUnit}</div>
            {shelves > 0 && <div>Shelves: {shelves}</div>}
            {drawers > 0 && <div>Drawers: {drawers}</div>}
            {doors > 0 && <div>Doors: {doors}</div>}
            {shutters > 0 && <div>Shutters: {shutters}</div>}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Materials</h4>
          <div className="space-y-1">
            {bomResult.consolidatedItems?.slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="text-xs">
                {item.description}: {item.quantity} {item.unit}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}