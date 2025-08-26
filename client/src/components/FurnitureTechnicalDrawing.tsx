import React from 'react';

interface FurnitureTechnicalDrawingProps {
  bomResult?: any;
  furnitureType: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unitOfMeasure: string;
  };
  configuration: {
    shelves?: number;
    drawers?: number;
    shutters?: number;
    doors?: number;
    wardrobeType?: string;
    [key: string]: any;
  };
}

const FurnitureTechnicalDrawing: React.FC<FurnitureTechnicalDrawingProps> = ({
  bomResult,
  furnitureType,
  dimensions,
  configuration
}) => {
  // Convert dimensions to a consistent unit (mm) for calculations
  const convertToMM = (value: number, unit: string): number => {
    switch (unit.toLowerCase()) {
      case 'ft': return value * 304.8;
      case 'cm': return value * 10;
      case 'in': return value * 25.4;
      case 'mm':
      default: return value;
    }
  };

  const widthMM = convertToMM(dimensions.width, dimensions.unitOfMeasure);
  const heightMM = convertToMM(dimensions.height, dimensions.unitOfMeasure);
  const depthMM = convertToMM(dimensions.depth, dimensions.unitOfMeasure);

  // SVG viewport dimensions
  const svgWidth = 600;
  const svgHeight = 500;
  const margin = 80;

  // Scale factor to fit furniture in viewport
  const scaleX = (svgWidth - 2 * margin) / widthMM;
  const scaleY = (svgHeight - 2 * margin) / heightMM;
  const scale = Math.min(scaleX, scaleY) * 0.8; // 80% to leave room for dimensions

  // Scaled dimensions for drawing
  const drawWidth = widthMM * scale;
  const drawHeight = heightMM * scale;

  // Starting position (centered)
  const startX = (svgWidth - drawWidth) / 2;
  const startY = (svgHeight - drawHeight) / 2;

  const formatDimension = (value: number): string => {
    if (dimensions.unitOfMeasure === 'mm') {
      return `${Math.round(value)}mm`;
    } else if (dimensions.unitOfMeasure === 'cm') {
      return `${Math.round(value / 10)} cm`;
    } else if (dimensions.unitOfMeasure === 'ft') {
      return `${Math.round(value / 304.8 * 10) / 10} ft`;
    }
    return `${Math.round(value)}`;
  };

  const renderWardrobe = () => {
    const elements: JSX.Element[] = [];
    const shelves = configuration.shelves || 3;
    const drawers = configuration.drawers || 0;
    const shutters = configuration.shutters || 2;

    // Main cabinet outline
    elements.push(
      <rect
        key="main-cabinet"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />
    );

    // Internal divisions
    const internalWidth = drawWidth - 4; // Account for cabinet thickness
    const internalHeight = drawHeight - 4;
    const internalStartX = startX + 2;
    const internalStartY = startY + 2;

    // Calculate shelf spacing
    let availableHeight = internalHeight;
    let currentY = internalStartY;

    // Reserve space for drawers at the bottom
    const drawerHeight = drawers > 0 ? internalHeight * 0.15 : 0; // 15% of height per drawer
    const totalDrawerHeight = drawerHeight * drawers;
    availableHeight -= totalDrawerHeight;

    const shelfSpacing = availableHeight / (shelves + 1);

    // Draw shelves
    for (let i = 0; i < shelves; i++) {
      const shelfY = currentY + (i + 1) * shelfSpacing;
      elements.push(
        <line
          key={`shelf-${i}`}
          x1={internalStartX}
          y1={shelfY}
          x2={internalStartX + internalWidth}
          y2={shelfY}
          stroke="#666"
          strokeWidth="1"
        />
      );

      // Add shelf dimensions
      elements.push(
        <text
          key={`shelf-dim-${i}`}
          x={internalStartX + internalWidth / 2}
          y={shelfY - 5}
          textAnchor="middle"
          fontSize="10"
          fill="#666"
        >
          {formatDimension(widthMM)} × {formatDimension(depthMM)}
        </text>
      );
    }

    // Draw drawers at the bottom
    const drawerStartY = internalStartY + availableHeight;
    for (let i = 0; i < drawers; i++) {
      const drawerY = drawerStartY + (i * drawerHeight);
      
      // Drawer outline
      elements.push(
        <rect
          key={`drawer-${i}`}
          x={internalStartX + 10}
          y={drawerY}
          width={internalWidth - 20}
          height={drawerHeight - 5}
          fill="none"
          stroke="#888"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
      );

      // Drawer handle
      elements.push(
        <circle
          key={`drawer-handle-${i}`}
          cx={internalStartX + internalWidth - 30}
          cy={drawerY + drawerHeight / 2}
          r="3"
          fill="#333"
        />
      );

      // Drawer label
      elements.push(
        <text
          key={`drawer-label-${i}`}
          x={internalStartX + internalWidth / 2}
          y={drawerY + drawerHeight / 2}
          textAnchor="middle"
          fontSize="9"
          fill="#888"
        >
          Drawer {i + 1}
        </text>
      );
    }

    // Draw door/shutter divisions
    if (shutters > 1) {
      const shutterWidth = internalWidth / shutters;
      for (let i = 1; i < shutters; i++) {
        const shutterX = internalStartX + (i * shutterWidth);
        elements.push(
          <line
            key={`shutter-div-${i}`}
            x1={shutterX}
            y1={internalStartY}
            x2={shutterX}
            y2={internalStartY + availableHeight}
            stroke="#999"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        );
      }
    }

    return elements;
  };

  const renderBed = () => {
    const elements: JSX.Element[] = [];

    // Main bed frame
    elements.push(
      <rect
        key="bed-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />
    );

    // Mattress area (slightly inset)
    elements.push(
      <rect
        key="mattress"
        x={startX + 10}
        y={startY + 10}
        width={drawWidth - 20}
        height={drawHeight - 40}
        fill="none"
        stroke="#666"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
    );

    // Headboard
    elements.push(
      <rect
        key="headboard"
        x={startX - 5}
        y={startY - 20}
        width={drawWidth + 10}
        height={25}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />
    );

    if (configuration.drawers && configuration.drawers > 0) {
      // Storage drawers under bed
      const drawerCount = configuration.drawers;
      const drawerWidth = drawWidth / drawerCount;
      const drawerY = startY + drawHeight - 30;
      
      for (let i = 0; i < drawerCount; i++) {
        const drawerX = startX + (i * drawerWidth);
        elements.push(
          <rect
            key={`bed-drawer-${i}`}
            x={drawerX + 5}
            y={drawerY}
            width={drawerWidth - 10}
            height={25}
            fill="none"
            stroke="#888"
            strokeWidth="1"
          />
        );
        
        // Handle
        elements.push(
          <circle
            key={`bed-handle-${i}`}
            cx={drawerX + drawerWidth/2}
            cy={drawerY + 12}
            r="2"
            fill="#333"
          />
        );
      }
    }

    return elements;
  };

  const renderDimensions = () => {
    const elements: JSX.Element[] = [];

    // Width dimension (top)
    elements.push(
      <g key="width-dimension">
        <line
          x1={startX}
          y1={startY - 30}
          x2={startX + drawWidth}
          y2={startY - 30}
          stroke="#000"
          strokeWidth="1"
          markerEnd="url(#arrowhead)"
          markerStart="url(#arrowhead)"
        />
        <text
          x={startX + drawWidth / 2}
          y={startY - 35}
          textAnchor="middle"
          fontSize="12"
          fill="#000"
          fontWeight="bold"
        >
          {formatDimension(widthMM)}
        </text>
      </g>
    );

    // Height dimension (right)
    elements.push(
      <g key="height-dimension">
        <line
          x1={startX + drawWidth + 30}
          y1={startY}
          x2={startX + drawWidth + 30}
          y2={startY + drawHeight}
          stroke="#000"
          strokeWidth="1"
          markerEnd="url(#arrowhead)"
          markerStart="url(#arrowhead)"
        />
        <text
          x={startX + drawWidth + 35}
          y={startY + drawHeight / 2}
          textAnchor="start"
          fontSize="12"
          fill="#000"
          fontWeight="bold"
          transform={`rotate(90, ${startX + drawWidth + 35}, ${startY + drawHeight / 2})`}
        >
          {formatDimension(heightMM)}
        </text>
      </g>
    );

    // Depth dimension (bottom right corner)
    elements.push(
      <text
        key="depth-dimension"
        x={startX + drawWidth - 10}
        y={startY + drawHeight + 20}
        textAnchor="end"
        fontSize="10"
        fill="#666"
      >
        Depth: {formatDimension(depthMM)}
      </text>
    );

    return elements;
  };

  const renderWardrobe = () => {
    const elements: JSX.Element[] = [];
    const shelves = configuration.shelves || 0;
    const drawers = configuration.drawers || 0;
    const shutters = configuration.shutters || 3;

    // Main wardrobe outline
    elements.push(
      <rect
        key="wardrobe-outline"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />
    );

    // Internal space
    const internalWidth = drawWidth - 4;
    const internalHeight = drawHeight - 4;
    const internalStartX = startX + 2;
    const internalStartY = startY + 2;

    // 🎯 REALISTIC WARDROBE LAYOUT: 3 sections
    const sectionWidth = internalWidth / 3;
    
    // LEFT SECTION: Hanging space
    const hangingHeight = internalHeight * 0.75;
    elements.push(
      <rect
        key="hanging-area"
        x={internalStartX}
        y={internalStartY}
        width={sectionWidth}
        height={hangingHeight}
        fill="none"
        stroke="#9CA3AF"
        strokeWidth="1"
        strokeDasharray="5,3"
      />
    );
    
    // Hanging rod
    elements.push(
      <line
        key="hanging-rod"
        x1={internalStartX + 5}
        y1={internalStartY + 20}
        x2={internalStartX + sectionWidth - 5}
        y2={internalStartY + 20}
        stroke="#333"
        strokeWidth="3"
      />
    );
    
    // Hanging clothes representation
    for (let i = 0; i < 4; i++) {
      const x = internalStartX + 15 + (i * 20);
      elements.push(
        <line
          key={`hanger-${i}`}
          x1={x}
          y1={internalStartY + 20}
          x2={x}
          y2={internalStartY + 80}
          stroke="#9CA3AF"
          strokeWidth="2"
        />
      );
    }
    
    elements.push(
      <text
        key="hanging-label"
        x={internalStartX + sectionWidth / 2}
        y={internalStartY + hangingHeight / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
        transform={`rotate(-90, ${internalStartX + sectionWidth / 2}, ${internalStartY + hangingHeight / 2})`}
      >
        HANGING SPACE
      </text>
    );

    // MIDDLE SECTION: Shelves
    const shelfStartX = internalStartX + sectionWidth;
    const displayShelves = Math.min(shelves, 8);
    const shelfSpacing = internalHeight / (displayShelves + 1);
    
    for (let i = 1; i <= displayShelves; i++) {
      const y = internalStartY + (i * shelfSpacing);
      elements.push(
        <line
          key={`shelf-${i}`}
          x1={shelfStartX}
          y1={y}
          x2={shelfStartX + sectionWidth}
          y2={y}
          stroke="#666"
          strokeWidth="1"
        />
      );
    }
    
    elements.push(
      <text
        key="shelf-area-label"
        x={shelfStartX + sectionWidth / 2}
        y={internalStartY + internalHeight / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
        transform={`rotate(-90, ${shelfStartX + sectionWidth / 2}, ${internalStartY + internalHeight / 2})`}
      >
        SHELVES ({shelves})
      </text>
    );

    // RIGHT SECTION: Drawers
    const drawerStartX = internalStartX + (sectionWidth * 2);
    const displayDrawers = Math.min(drawers, 8);
    const drawerHeight = internalHeight / displayDrawers;
    
    for (let i = 0; i < displayDrawers; i++) {
      const y = internalStartY + (i * drawerHeight);
      
      elements.push(
        <rect
          key={`drawer-${i}`}
          x={drawerStartX + 5}
          y={y + 2}
          width={sectionWidth - 10}
          height={drawerHeight - 4}
          fill="none"
          stroke="#888"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      );
      
      elements.push(
        <circle
          key={`drawer-handle-${i}`}
          cx={drawerStartX + sectionWidth - 15}
          cy={y + drawerHeight / 2}
          r="2"
          fill="#333"
        />
      );
    }
    
    elements.push(
      <text
        key="drawer-area-label"
        x={drawerStartX + sectionWidth / 2}
        y={internalStartY + internalHeight / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#666"
        transform={`rotate(-90, ${drawerStartX + sectionWidth / 2}, ${internalStartY + internalHeight / 2})`}
      >
        DRAWERS ({drawers})
      </text>
    );

    // Shutter/Door divisions
    const shutterWidth = drawWidth / shutters;
    for (let i = 1; i < shutters; i++) {
      const x = startX + (i * shutterWidth);
      elements.push(
        <line
          key={`shutter-div-${i}`}
          x1={x}
          y1={startY}
          x2={x}
          y2={startY + drawHeight}
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="8,4"
        />
      );
    }

    return elements;
  };

  const renderFurniture = () => {
    switch (furnitureType.toLowerCase()) {
      case 'wardrobe':
      case 'storage_unit':
      case 'bookshelf':
        return renderWardrobe();
      case 'bed':
        return renderBed();
      default:
        return renderCabinet(); // Default fallback to cabinet
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">
          {furnitureType} Technical Drawing
        </h3>
        <p className="text-sm text-gray-600">
          Front view with dimensions and internal layout
        </p>
      </div>
      
      <div className="flex justify-center">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="border border-gray-200"
          data-testid="furniture-technical-drawing"
        >
          {/* Define arrow markers for dimensions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#000"
              />
            </marker>
          </defs>

          {/* Render the furniture */}
          {renderFurniture()}
          
          {/* Render dimensions */}
          {renderDimensions()}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Specifications:</h4>
          <p>Shelves: {configuration.shelves || 0}</p>
          <p>Drawers: {configuration.drawers || 0}</p>
          <p>Doors: {configuration.shutters || configuration.doors || 0}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Dimensions:</h4>
          <p>W: {formatDimension(widthMM)}</p>
          <p>H: {formatDimension(heightMM)}</p>
          <p>D: {formatDimension(depthMM)}</p>
        </div>
      </div>
    </div>
  );
};

export default FurnitureTechnicalDrawing;