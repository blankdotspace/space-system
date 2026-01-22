import { describe, it, expect } from 'vitest';
import { comprehensiveCleanup } from '../src/common/lib/utils/gridCleanup';
import { FidgetInstanceData } from '@/common/fidgets';

describe('Grid Cleanup', () => {
  it('should handle real-world overlapping layout', () => {
    const layout = [
      {
        h: 4,
        i: "feed:49cb1f1f-6fb1-4bf8-b3da-c3d7b031243f",
        maxH: 36,
        maxW: 36,
        minH: 2,
        minW: 4,
        w: 4,
        x: 0,
        y: 0
      },
      {
        h: 1,
        i: "gallery:ea28ed1a-c4ad-48b2-8bca-fb4fb3c8bc8c",
        maxH: 36,
        maxW: 36,
        minH: 1,
        minW: 1,
        w: 1,
        x: 0,
        y: 0
      },
      {
        h: 2,
        i: "text:626b18af-a2b9-457b-b3eb-fc9f85c6293f",
        maxH: 36,
        maxW: 36,
        minH: 2,
        minW: 3,
        w: 3,
        x: 0,
        y: 0
      }
    ];

    console.log('\nOriginal Layout:');
    layout.forEach(fidget => {
      console.log(`${fidget.i}:`);
      console.log(`  Position: (${fidget.x}, ${fidget.y})`);
      console.log(`  Size: ${fidget.w}x${fidget.h}`);
      console.log(`  Min Size: ${fidget.minW}x${fidget.minH}`);
      console.log('---');
    });

    // Create a mock config object that matches what Space expects
    const fidgetInstanceDatums: { [key: string]: FidgetInstanceData } = {
      "feed:49cb1f1f-6fb1-4bf8-b3da-c3d7b031243f": {
        id: "feed:49cb1f1f-6fb1-4bf8-b3da-c3d7b031243f",
        fidgetType: "feed",
        config: {
          editable: true,
          settings: {},
          data: {}
        }
      },
      "gallery:ea28ed1a-c4ad-48b2-8bca-fb4fb3c8bc8c": {
        id: "gallery:ea28ed1a-c4ad-48b2-8bca-fb4fb3c8bc8c",
        fidgetType: "gallery",
        config: {
          editable: true,
          settings: {},
          data: {}
        }
      },
      "text:626b18af-a2b9-457b-b3eb-fc9f85c6293f": {
        id: "text:626b18af-a2b9-457b-b3eb-fc9f85c6293f",
        fidgetType: "text",
        config: {
          editable: true,
          settings: {},
          data: {}
        }
      }
    };

    // Use the exported comprehensiveCleanup function
    const { cleanedLayout, cleanedFidgetInstanceDatums, hasChanges: _hasChanges } = comprehensiveCleanup(
      layout,
      fidgetInstanceDatums,
      false, // hasProfile
      false  // hasFeed
    );

    // Compute removed fidgets by comparing original and cleaned data
    const originalFidgetIds = Object.keys(fidgetInstanceDatums);
    const cleanedFidgetIds = Object.keys(cleanedFidgetInstanceDatums);
    const removedFidgetIds = originalFidgetIds.filter(id => !cleanedFidgetIds.includes(id));

    console.log('\nCleaned Layout:');
    cleanedLayout.forEach((fidget, index) => {
      console.log(`Fidget ${index + 1} (ID: ${fidget.i}):`);
      console.log(`  Position: (${fidget.x}, ${fidget.y})`);
      console.log(`  Size: ${fidget.w}x${fidget.h}`);
      console.log(`  Min Size: ${fidget.minW}x${fidget.minH}`);
      console.log('---');
    });

    if (removedFidgetIds.length > 0) {
      console.log('\nRemoved Fidgets:');
      removedFidgetIds.forEach(id => console.log(`- ${id}`));
    }

    // All fidgets should be kept
    expect(cleanedLayout).toHaveLength(3);
    expect(removedFidgetIds).toHaveLength(0);
    
    // No fidgets should overlap
    for (let i = 0; i < cleanedLayout.length; i++) {
      for (let j = i + 1; j < cleanedLayout.length; j++) {
        const f1 = cleanedLayout[i];
        const f2 = cleanedLayout[j];
        expect(
          f1.x < f2.x + f2.w &&
          f1.x + f1.w > f2.x &&
          f1.y < f2.y + f2.h &&
          f1.y + f1.h > f2.y
        ).toBe(false);
      }
    }

    // Verify minimum width constraints are respected
    const feedFidget = cleanedLayout.find(f => f.i === "feed:49cb1f1f-6fb1-4bf8-b3da-c3d7b031243f")!;
    const galleryFidget = cleanedLayout.find(f => f.i === "gallery:ea28ed1a-c4ad-48b2-8bca-fb4fb3c8bc8c")!;
    const textFidget = cleanedLayout.find(f => f.i === "text:626b18af-a2b9-457b-b3eb-fc9f85c6293f")!;

    expect(feedFidget.w).toBeGreaterThanOrEqual(4);
    expect(galleryFidget.w).toBeGreaterThanOrEqual(1);
    expect(textFidget.w).toBeGreaterThanOrEqual(3);
  });
}); 