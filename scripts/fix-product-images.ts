import { db } from '../server/db';
import { salesProducts } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Original Step Early website image URLs
const imageUpdates = [
  {
    name: "Arcade Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Arcade_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Trigon Workstation", 
    imageUrl: "https://stepearly.com/cdn/shop/products/Trigon_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Clique Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Clique_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Pentagon Office Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Pentagon_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Trefoil Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Trefoil_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Rhombus Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Rhombus_C_Leg_LinearSharing_2048x2048.jpg"
  },
  {
    name: "Classy Arcade Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Classy_Arcade_C_Leg_LinearSharing_2048x2048.jpg"
  },
  {
    name: "Helix Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Helix_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Classic 60 Workstation",
    imageUrl: "https://stepearly.com/cdn/shop/products/Partition_base_Linear_sharing_2048x2048.jpg"
  }
];

async function fixProductImages() {
  try {
    console.log('Updating product images...');
    
    for (const update of imageUpdates) {
      console.log(`Updating ${update.name}...`);
      
      const result = await db.update(salesProducts)
        .set({ 
          imageUrl: update.imageUrl,
          updatedAt: new Date()
        })
        .where(eq(salesProducts.name, update.name))
        .returning();
      
      if (result.length > 0) {
        console.log(`✅ Updated ${update.name} image`);
      } else {
        console.log(`❌ Product not found: ${update.name}`);
      }
    }
    
    console.log('🎉 Image update completed!');
    
    // Verify the updates
    const products = await db.select().from(salesProducts);
    console.log('\nVerification:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    products.forEach(p => {
      console.log(`${p.name}: ${p.imageUrl ? '✅ HAS IMAGE' : '❌ NO IMAGE'}`);
    });
    
  } catch (error) {
    console.error('Error updating product images:', error);
    throw error;
  }
}

export { fixProductImages };

// Run the script
fixProductImages()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });