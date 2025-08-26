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

  // 🏗️ REALISTIC WARDROBE - Based on furniture industry standards
  const renderWardrobe = () => {
    const elements: JSX.Element[] = [];
    const shelves = configuration.shelves || 3;
    const drawers = configuration.drawers || 0;
    const shutters = configuration.shutters || 2;

    // Main wardrobe outline
    elements.push(
      <rect
        key="wardrobe-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#2D2D2D"
        strokeWidth="3"
      />
    );

    const internalWidth = drawWidth - 6;
    const internalHeight = drawHeight - 6;
    const internalStartX = startX + 3;
    const internalStartY = startY + 3;

    // 🎯 REALISTIC LAYOUT: 70% Hanging + 30% Storage (Industry Standard)
    const hangingWidth = internalWidth * 0.7; // 70% for hanging (main feature)
    const storageWidth = internalWidth * 0.3;  // 30% for shelves/drawers

    // ✨ HANGING SPACE SECTION (LEFT SIDE - Main Feature)
    elements.push(
      <rect
        key="hanging-area"
        x={internalStartX}
        y={internalStartY}
        width={hangingWidth}
        height={internalHeight * 0.85} // 85% height for hanging
        fill="#F8F9FA"
        stroke="#DEE2E6"
        strokeWidth="1"
      />
    );

    // Hanging rail (industry standard: 3" from top)
    const railY = internalStartY + 20;
    elements.push(
      <line
        key="hanging-rail"
        x1={internalStartX + 10}
        y1={railY}
        x2={internalStartX + hangingWidth - 10}
        y2={railY}
        stroke="#495057"
        strokeWidth="4"
      />
    );

    // Hanging clothes representation
    for (let i = 0; i < 5; i++) {
      const clothesX = internalStartX + 20 + (i * (hangingWidth - 40) / 4);
      elements.push(
        <g key={`clothes-${i}`}>
          <line
            x1={clothesX}
            y1={railY}
            x2={clothesX}
            y2={railY + 60}
            stroke="#6C757D"
            strokeWidth="2"
          />
          <rect
            x={clothesX - 8}
            y={railY + 60}
            width={16}
            height={40}
            fill="none"
            stroke="#ADB5BD"
            strokeWidth="1"
            rx="2"
          />
        </g>
      );
    }

    elements.push(
      <text
        key="hanging-label"
        x={internalStartX + hangingWidth / 2}
        y={internalStartY + internalHeight / 2}
        textAnchor="middle"
        fontSize="11"
        fill="#495057"
        fontWeight="bold"
        transform={`rotate(-90, ${internalStartX + hangingWidth / 2}, ${internalStartY + internalHeight / 2})`}
      >
        HANGING SPACE
      </text>
    );

    // 📚 STORAGE SECTION (RIGHT SIDE)
    const storageStartX = internalStartX + hangingWidth;
    
    // Shelves area (upper part)
    const shelfAreaHeight = internalHeight * 0.6;
    const actualShelves = Math.min(shelves, 4); // Max 4 shelves for realism
    
    if (actualShelves > 0) {
      const shelfSpacing = shelfAreaHeight / (actualShelves + 1);
      for (let i = 0; i < actualShelves; i++) {
        const shelfY = internalStartY + (i + 1) * shelfSpacing;
        elements.push(
          <line
            key={`shelf-${i}`}
            x1={storageStartX + 5}
            y1={shelfY}
            x2={storageStartX + storageWidth - 5}
            y2={shelfY}
            stroke="#495057"
            strokeWidth="2"
          />
        );
        
        // Folded items on shelves
        for (let j = 0; j < 2; j++) {
          elements.push(
            <rect
              key={`folded-${i}-${j}`}
              x={storageStartX + 10 + (j * 20)}
              y={shelfY - 12}
              width={15}
              height={10}
              fill="none"
              stroke="#ADB5BD"
              strokeWidth="1"
              rx="1"
            />
          );
        }
      }

      elements.push(
        <text
          key="shelf-label"
          x={storageStartX + storageWidth / 2}
          y={internalStartY + shelfAreaHeight / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#6C757D"
          transform={`rotate(-90, ${storageStartX + storageWidth / 2}, ${internalStartY + shelfAreaHeight / 2})`}
        >
          SHELVES ({actualShelves})
        </text>
      );
    }

    // 🗃️ DRAWER SECTION (BOTTOM)
    if (drawers > 0) {
      const drawerAreaStartY = internalStartY + shelfAreaHeight;
      const drawerAreaHeight = internalHeight - shelfAreaHeight;
      const actualDrawers = Math.min(drawers, 3); // Max 3 drawers for realism
      const drawerHeight = (drawerAreaHeight - 10) / actualDrawers;

      for (let i = 0; i < actualDrawers; i++) {
        const drawerY = drawerAreaStartY + 5 + (i * drawerHeight);
        
        elements.push(
          <rect
            key={`drawer-${i}`}
            x={storageStartX + 8}
            y={drawerY + 2}
            width={storageWidth - 16}
            height={drawerHeight - 4}
            fill="#F8F9FA"
            stroke="#6C757D"
            strokeWidth="1"
            rx="2"
          />
        );
        
        // Drawer handle
        elements.push(
          <rect
            key={`drawer-handle-${i}`}
            x={storageStartX + storageWidth - 20}
            y={drawerY + drawerHeight / 2 - 2}
            width="8"
            height="4"
            fill="#495057"
            rx="2"
          />
        );
      }

      elements.push(
        <text
          key="drawer-label"
          x={storageStartX + storageWidth / 2}
          y={drawerAreaStartY + drawerAreaHeight / 2}
          textAnchor="middle"
          fontSize="9"
          fill="#6C757D"
          transform={`rotate(-90, ${storageStartX + storageWidth / 2}, ${drawerAreaStartY + drawerAreaHeight / 2})`}
        >
          DRAWERS ({actualDrawers})
        </text>
      );
    }

    // Door/shutter divisions
    if (shutters > 1) {
      const shutterWidth = drawWidth / shutters;
      for (let i = 1; i < shutters; i++) {
        const shutterX = startX + (i * shutterWidth);
        elements.push(
          <line
            key={`door-div-${i}`}
            x1={shutterX}
            y1={startY}
            x2={shutterX}
            y2={startY + drawHeight}
            stroke="#495057"
            strokeWidth="2"
            strokeDasharray="10,5"
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


  // 📚 REALISTIC BOOKSHELF - Based on library standards
  const renderBookshelf = () => {
    const elements: JSX.Element[] = [];
    const targetShelves = configuration.shelves || 5;

    // Main bookshelf frame
    elements.push(
      <rect
        key="bookshelf-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#2D2D2D"
        strokeWidth="2"
      />
    );

    const internalWidth = drawWidth - 8;
    const internalHeight = drawHeight - 8;
    const internalStartX = startX + 4;
    const internalStartY = startY + 4;

    // Calculate optimal shelf spacing (9-12" industry standard)
    const optimalSpacing = Math.max(30, Math.min(40, internalHeight / (targetShelves + 1)));
    const actualShelves = Math.floor(internalHeight / optimalSpacing) - 1;
    const shelfSpacing = internalHeight / (actualShelves + 1);

    // Draw horizontal shelves
    for (let i = 0; i <= actualShelves; i++) {
      const shelfY = internalStartY + (i * shelfSpacing);
      elements.push(
        <line
          key={`shelf-${i}`}
          x1={internalStartX}
          y1={shelfY}
          x2={internalStartX + internalWidth}
          y2={shelfY}
          stroke="#495057"
          strokeWidth="2"
        />
      );

      // Add books on each shelf (except the first one which is the top)
      if (i > 0) {
        const bookCount = Math.floor(internalWidth / 15); // ~15px per book
        for (let j = 0; j < bookCount; j++) {
          const bookX = internalStartX + 10 + (j * 15);
          const bookHeight = Math.random() * 15 + 10; // Variable book heights
          elements.push(
            <rect
              key={`book-${i}-${j}`}
              x={bookX}
              y={shelfY - bookHeight}
              width="12"
              height={bookHeight}
              fill={`hsl(${Math.random() * 360}, 60%, 70%)`}
              stroke="#495057"
              strokeWidth="0.5"
            />
          );
        }
      }
    }

    // Add depth indicator
    elements.push(
      <text
        key="bookshelf-info"
        x={internalStartX + internalWidth / 2}
        y={internalStartY + 20}
        textAnchor="middle"
        fontSize="10"
        fill="#6C757D"
      >
        {actualShelves + 1} Shelves • {formatDimension(depthMM)} Deep
      </text>
    );

    return elements;
  };

  // 🗄️ REALISTIC CABINET - Kitchen/storage cabinet design
  const renderCabinet = () => {
    const elements: JSX.Element[] = [];
    const shelves = configuration.shelves || 2;
    const drawers = configuration.drawers || 0;
    const doors = configuration.doors || configuration.shutters || 2;

    // Main cabinet frame
    elements.push(
      <rect
        key="cabinet-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#2D2D2D"
        strokeWidth="2"
      />
    );

    const internalWidth = drawWidth - 6;
    const internalHeight = drawHeight - 6;
    const internalStartX = startX + 3;
    const internalStartY = startY + 3;

    // Background
    elements.push(
      <rect
        key="cabinet-interior"
        x={internalStartX}
        y={internalStartY}
        width={internalWidth}
        height={internalHeight}
        fill="#F8F9FA"
        stroke="none"
      />
    );

    // Drawer section (bottom 40% if drawers exist)
    let shelfAreaHeight = internalHeight;
    if (drawers > 0) {
      const drawerAreaHeight = internalHeight * 0.4;
      shelfAreaHeight = internalHeight * 0.6;
      const actualDrawers = Math.min(drawers, 3);
      const drawerHeight = drawerAreaHeight / actualDrawers;

      for (let i = 0; i < actualDrawers; i++) {
        const drawerY = internalStartY + shelfAreaHeight + (i * drawerHeight);
        elements.push(
          <rect
            key={`cabinet-drawer-${i}`}
            x={internalStartX + 8}
            y={drawerY + 3}
            width={internalWidth - 16}
            height={drawerHeight - 6}
            fill="#FFFFFF"
            stroke="#6C757D"
            strokeWidth="1"
            rx="3"
          />
        );
        
        // Drawer handle
        elements.push(
          <circle
            key={`cabinet-handle-${i}`}
            cx={internalStartX + internalWidth - 20}
            cy={drawerY + drawerHeight / 2}
            r="3"
            fill="#495057"
          />
        );
      }
    }

    // Shelf section (upper area)
    if (shelves > 0) {
      const actualShelves = Math.min(shelves, 4);
      const shelfSpacing = shelfAreaHeight / (actualShelves + 1);
      
      for (let i = 0; i < actualShelves; i++) {
        const shelfY = internalStartY + ((i + 1) * shelfSpacing);
        elements.push(
          <line
            key={`cabinet-shelf-${i}`}
            x1={internalStartX + 5}
            y1={shelfY}
            x2={internalStartX + internalWidth - 5}
            y2={shelfY}
            stroke="#495057"
            strokeWidth="1.5"
          />
        );

        // Add some items on shelves
        for (let j = 0; j < 3; j++) {
          elements.push(
            <rect
              key={`cabinet-item-${i}-${j}`}
              x={internalStartX + 15 + (j * 25)}
              y={shelfY - 8}
              width="20"
              height="6"
              fill="#DEE2E6"
              stroke="#ADB5BD"
              strokeWidth="0.5"
              rx="1"
            />
          );
        }
      }
    }

    // Door divisions
    if (doors > 1) {
      const doorWidth = drawWidth / doors;
      for (let i = 1; i < doors; i++) {
        const doorX = startX + (i * doorWidth);
        elements.push(
          <line
            key={`cabinet-door-${i}`}
            x1={doorX}
            y1={startY}
            x2={doorX}
            y2={startY + drawHeight}
            stroke="#495057"
            strokeWidth="1.5"
            strokeDasharray="8,4"
          />
        );
      }
    }

    return elements;
  };

  // 📦 REALISTIC STORAGE UNIT - Modular storage design
  const renderStorageUnit = () => {
    const elements: JSX.Element[] = [];
    const shelves = configuration.shelves || 4;
    const drawers = configuration.drawers || 2;

    // Main storage frame
    elements.push(
      <rect
        key="storage-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#2D2D2D"
        strokeWidth="2"
      />
    );

    const internalWidth = drawWidth - 6;
    const internalHeight = drawHeight - 6;
    const internalStartX = startX + 3;
    const internalStartY = startY + 3;

    // Divide into compartments
    const leftWidth = internalWidth * 0.6; // 60% for shelving
    const rightWidth = internalWidth * 0.4; // 40% for drawers/cubbies

    // Left section: Open shelves
    const actualShelves = Math.min(shelves, 5);
    const shelfSpacing = internalHeight / (actualShelves + 1);
    
    for (let i = 0; i < actualShelves; i++) {
      const shelfY = internalStartY + ((i + 1) * shelfSpacing);
      elements.push(
        <line
          key={`storage-shelf-${i}`}
          x1={internalStartX + 5}
          y1={shelfY}
          x2={internalStartX + leftWidth - 5}
          y2={shelfY}
          stroke="#495057"
          strokeWidth="2"
        />
      );
    }

    // Vertical divider
    elements.push(
      <line
        key="storage-divider"
        x1={internalStartX + leftWidth}
        y1={internalStartY}
        x2={internalStartX + leftWidth}
        y2={internalStartY + internalHeight}
        stroke="#495057"
        strokeWidth="2"
      />
    );

    // Right section: Drawers and cubbies
    const rightStartX = internalStartX + leftWidth;
    const actualDrawers = Math.min(drawers, 4);
    const drawerHeight = internalHeight / actualDrawers;

    for (let i = 0; i < actualDrawers; i++) {
      const drawerY = internalStartY + (i * drawerHeight);
      
      elements.push(
        <rect
          key={`storage-drawer-${i}`}
          x={rightStartX + 5}
          y={drawerY + 5}
          width={rightWidth - 10}
          height={drawerHeight - 10}
          fill="#F8F9FA"
          stroke="#6C757D"
          strokeWidth="1"
          rx="2"
        />
      );
      
      // Handle
      elements.push(
        <rect
          key={`storage-handle-${i}`}
          x={rightStartX + rightWidth - 15}
          y={drawerY + drawerHeight / 2 - 2}
          width="8"
          height="4"
          fill="#495057"
          rx="2"
        />
      );
    }

    // Labels
    elements.push(
      <text
        key="storage-label-left"
        x={internalStartX + leftWidth / 2}
        y={internalStartY + 15}
        textAnchor="middle"
        fontSize="9"
        fill="#6C757D"
      >
        OPEN SHELVES
      </text>
    );

    elements.push(
      <text
        key="storage-label-right"
        x={rightStartX + rightWidth / 2}
        y={internalStartY + 15}
        textAnchor="middle"
        fontSize="9"
        fill="#6C757D"
      >
        STORAGE BINS
      </text>
    );

    return elements;
  };

  const renderFurniture = () => {
    switch (furnitureType.toLowerCase()) {
      case 'wardrobe':
        return renderWardrobe();
      case 'bookshelf':
        return renderBookshelf();
      case 'storage_unit':
        return renderStorageUnit();
      case 'bed':
        return renderBed();
      case 'cabinet':
      case 'kitchen_cabinet':
        return renderCabinet();
      default:
        return renderCabinet(); // Safe fallback
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