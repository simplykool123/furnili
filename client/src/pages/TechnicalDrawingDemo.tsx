import React from 'react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { FurnitureTechnicalDrawing } from '@/components/FurnitureTechnicalDrawing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TechnicalDrawingDemo() {
  // Sample data that would come from BOM calculation
  const sampleBomResult = {
    id: 1,
    calculationNumber: "CALC-001",
    totalBoardArea: 25.5,
    boardAreaByThickness: { "18mm": 20.5, "6mm": 5.0 },
    totalEdgeBanding2mm: 45.2,
    totalEdgeBanding0_8mm: 12.3,
    totalMaterialCost: 25000,
    totalHardwareCost: 8500,
    totalCost: 33500,
    items: [
      {
        id: 1,
        itemType: "Panel",
        itemCategory: "Main Structure",
        partName: "Side Panel",
        materialType: "Plywood",
        length: 2400,
        width: 600,
        thickness: 18,
        quantity: 2,
        unit: "Nos",
        edgeBandingType: "2mm",
        edgeBandingLength: 12.0,
        unitRate: 2500,
        totalCost: 5000,
        area_sqft: 30.9,
        description: "Side panels for wardrobe"
      },
      {
        id: 2,
        itemType: "Panel",
        itemCategory: "Internal",
        partName: "Shelf",
        materialType: "Plywood",
        length: 1160,
        width: 580,
        thickness: 18,
        quantity: 4,
        unit: "Nos",
        edgeBandingType: "0.8mm",
        edgeBandingLength: 6.96,
        unitRate: 1200,
        totalCost: 4800,
        area_sqft: 49.5,
        description: "Internal shelves"
      }
    ],
    consolidatedItems: [
      {
        description: "18mm Plywood",
        quantity: 15.5,
        unit: "Sqft",
        rate: 180,
        amount: 2790
      },
      {
        description: "2mm Edge Banding",
        quantity: 45.2,
        unit: "Mtr",
        rate: 15,
        amount: 678
      }
    ]
  };

  const dimensions = {
    height: 2400,
    width: 1200,
    depth: 600
  };

  const configuration = {
    shelves: 4,
    drawers: 3,
    doors: 2,
    shutters: 0
  };

  return (
    <ResponsiveLayout title="2D Technical Drawing Demo">
      <div className="space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📐 2D Technical Drawing Feature
              <span className="text-sm font-normal text-gray-600">
                Just like your attached image!
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              This feature automatically generates professional 2D technical drawings 
              showing your furniture design with precise dimensions, shelves, drawers, 
              and internal layout - exactly like the example image you shared!
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-900">📏 Dimensions</h4>
                <p className="text-sm text-blue-700">H: 2400mm × W: 1200mm × D: 600mm</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-semibold text-green-900">🏗️ Configuration</h4>
                <p className="text-sm text-green-700">4 Shelves, 3 Drawers, 2 Doors</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <h4 className="font-semibold text-orange-900">💰 Total Cost</h4>
                <p className="text-sm text-orange-700">₹ 33,500</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* The 2D Technical Drawing Component */}
        <FurnitureTechnicalDrawing
          bomResult={sampleBomResult}
          furnitureType="wardrobe"
          dimensions={dimensions}
          configuration={configuration}
          unitOfMeasure="mm"
        />

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-3">🎯 Features Implemented</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">✅ Working Features</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Professional line drawings with dimensions</li>
                  <li>• Automatic shelf and drawer positioning</li>
                  <li>• Proper scaling and proportions</li>
                  <li>• Technical specifications display</li>
                  <li>• Material breakdown from BOM</li>
                  <li>• Clean, printable format</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">🔄 Next Steps</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Integrate with BOM Calculator results</li>
                  <li>• Add 3D depth visualization</li>
                  <li>• Export to PDF/PNG formats</li>
                  <li>• Multiple view angles (side, top)</li>
                  <li>• Custom furniture type templates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}