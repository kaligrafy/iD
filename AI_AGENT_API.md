# AI Agent API Documentation

This document describes how AI agents can programmatically interact with the iD editor to edit OpenStreetMap data.

## Overview

The iD editor provides a programmatic interface that allows AI agents to interact with the map by clicking at specific pixel coordinates. This enables agents to select features (roads, nodes, ways, etc.) and perform editing operations without requiring direct DOM manipulation or virtual mouse events.

## Accessing the Context

The iD editor exposes its functionality through a `context` object. When iD is initialized, you can access the context through the global `iD` object:

```javascript
// Initialize iD context
var context = iD.coreContext();

// Or if iD is already initialized and exposed globally
var context = window.id.context; // Adjust based on your setup
```

## Programmatic Map Clicks

### `context.clickAtPixel(x, y, options)`

Simulates a mouse click at the specified pixel coordinates on the map. This function allows AI agents to select map features like roads, nodes, buildings, and other OSM entities.

#### Parameters

- **`x`** (number, required): The X coordinate in pixels relative to the iD container element. The origin (0, 0) is at the top-left corner of the map container.
- **`y`** (number, required): The Y coordinate in pixels relative to the iD container element.
- **`options`** (object, optional): An object containing modifier key states:
  - `shiftKey` (boolean): Whether the Shift key should be considered pressed (default: `false`)
  - `ctrlKey` (boolean): Whether the Ctrl key should be considered pressed (default: `false`)
  - `altKey` (boolean): Whether the Alt key should be considered pressed (default: `false`)
  - `metaKey` (boolean): Whether the Meta/Cmd key should be considered pressed (default: `false`)

#### Returns

- **`true`**: If the click was successfully dispatched
- **`false`**: If the click could not be dispatched (e.g., container not found, no element at coordinates)

#### Behavior

When `clickAtPixel` is called:

1. The function converts the pixel coordinates to client/viewport coordinates
2. It finds the DOM element at those coordinates using `document.elementFromPoint()`
3. It creates synthetic `mousedown` and `mouseup` events
4. These events bubble up to the surface element where D3 event handlers are attached
5. The click handlers process the event and select the appropriate feature (node, way, relation, etc.)

#### Coordinate System

**Important**: The coordinates are relative to the iD container element, not the browser viewport or the page. To get the correct coordinates:

1. Get the bounding rectangle of the iD container:
   ```javascript
   var container = document.getElementById('id-container'); // or however you access it
   var rect = container.getBoundingClientRect();
   ```

2. Calculate relative coordinates:
   ```javascript
   // If you have viewport/client coordinates
   var x = clientX - rect.left - container.clientLeft;
   var y = clientY - rect.top - container.clientTop;
   ```

3. Or use the context's helper:
   ```javascript
   var rect = context.surfaceRect(); // Returns bounding rect of surface
   ```

## Usage Examples

### Basic Click to Select a Feature

```javascript
// Click at coordinates (500, 300) to select a feature
var success = context.clickAtPixel(500, 300);
if (success) {
    console.log('Click dispatched successfully');
    // The feature at that location should now be selected
    var selectedIDs = context.selectedIDs();
    console.log('Selected entities:', selectedIDs);
}
```

### Click with Modifier Keys

```javascript
// Click with Shift key held (for multi-select - adds to selection)
context.clickAtPixel(500, 300, { shiftKey: true });

// Click with Ctrl key held
context.clickAtPixel(500, 300, { ctrlKey: true });

// Click with Alt key held
context.clickAtPixel(500, 300, { altKey: true });

// Click with Meta/Cmd key held
context.clickAtPixel(500, 300, { metaKey: true });

// Multiple modifier keys
context.clickAtPixel(500, 300, { shiftKey: true, ctrlKey: true });
```

**Note**: The Shift key is the most commonly used modifier for multi-select. When `shiftKey: true` is set, the function automatically manages the `behavior-multiselect` CSS class on the map surface to match human interaction behavior.

### Finding Coordinates from Visual Elements

If you're using a browser automation tool or screenshot analysis:

```javascript
// Example: Get coordinates from a screenshot analysis result
// Assuming you've identified a feature at viewport coordinates (800, 400)
var viewportX = 800;
var viewportY = 400;

// Convert to container-relative coordinates
var container = context.container().node();
var rect = container.getBoundingClientRect();
var x = viewportX - rect.left - container.clientLeft;
var y = viewportY - rect.top - container.clientTop;

// Click at the converted coordinates
context.clickAtPixel(x, y);
```

### Selecting Multiple Features

Multi-select works exactly like when a human user holds Shift and clicks multiple features:

```javascript
// Select first feature (single selection)
context.clickAtPixel(500, 300);
var selectedIDs = context.selectedIDs();
console.log('Selected:', selectedIDs); // e.g., ['n123']

// Select additional feature with Shift key (adds to selection)
context.clickAtPixel(600, 400, { shiftKey: true });
selectedIDs = context.selectedIDs();
console.log('Selected:', selectedIDs); // e.g., ['n123', 'w456']

// Select another feature with Shift (adds to selection)
context.clickAtPixel(700, 500, { shiftKey: true });
selectedIDs = context.selectedIDs();
console.log('Selected:', selectedIDs); // e.g., ['n123', 'w456', 'n789']

// Click without Shift key (replaces selection)
context.clickAtPixel(800, 600);
selectedIDs = context.selectedIDs();
console.log('Selected:', selectedIDs); // e.g., ['n999'] - only the new one
```

**Multi-select behavior:**
- **Without Shift**: Clicking selects only that feature (replaces previous selection)
- **With Shift**: Clicking adds the feature to the current selection (if not already selected) or removes it (if already selected)
- The `behavior-multiselect` CSS class is automatically set/cleared to match human behavior

### Clicking on Different Feature Types

The function works with all OSM feature types:

- **Nodes**: Click on point features (POIs, standalone nodes)
- **Ways**: Click on roads, buildings, boundaries (lines and areas)
- **Relations**: Click on relation members
- **Notes**: Click on OSM notes
- **QA Errors**: Click on validation errors

```javascript
// Click on a road (way)
context.clickAtPixel(500, 300);

// Click on a building (area/way)
context.clickAtPixel(600, 400);

// Click on a POI (node/point)
context.clickAtPixel(700, 500);
```

## Integration with Other iD Features

### Checking Selection State

After clicking, check what was selected:

```javascript
context.clickAtPixel(500, 300);

// Get selected entity IDs
var selectedIDs = context.selectedIDs();
if (selectedIDs.length > 0) {
    console.log('Selected:', selectedIDs);
    
    // Get the first selected entity
    var entity = context.entity(selectedIDs[0]);
    console.log('Entity type:', entity.type);
    console.log('Entity tags:', entity.tags);
}
```

### Getting Map Coordinates

Convert pixel coordinates to geographic coordinates:

```javascript
// Get the map's projection function
var projection = context.projection;

// Convert pixel coordinates to lat/lon
// Note: This requires the pixel coordinates in the map's coordinate system
// You may need to use context.map().mouseCoordinates() or similar
```

### Current Mode

Check what mode the editor is in:

```javascript
var mode = context.mode();
console.log('Current mode:', mode.id); // e.g., 'browse', 'select', 'draw-line'
```

## Best Practices

1. **Wait for Map to Load**: Ensure the map is fully loaded before clicking:
   ```javascript
   // Wait for map to be ready
   context.map().on('drawn', function() {
       // Map is ready, safe to click
       context.clickAtPixel(500, 300);
   });
   ```

2. **Handle Edge Cases**: Always check the return value:
   ```javascript
   if (!context.clickAtPixel(x, y)) {
       console.warn('Click failed - no element at coordinates or container not ready');
   }
   ```

3. **Account for UI Elements**: Be aware that UI panels (sidebars, toolbars) may overlay the map. Adjust coordinates accordingly or ensure panels are closed.

4. **Zoom Level**: Features may not be clickable at all zoom levels. Ensure you're zoomed in enough (typically zoom level 16+ for editing).

5. **Coordinate Precision**: Use integer pixel coordinates. Fractional coordinates may work but are not necessary.

## Limitations

- **Element Detection**: The function uses `document.elementFromPoint()` which may not always detect SVG elements correctly in all browsers. If a click fails, try slightly different coordinates.

- **Event Timing**: Some operations may require a small delay between clicks or after map updates. Use `setTimeout` if needed:
  ```javascript
  context.clickAtPixel(500, 300);
  setTimeout(function() {
      // Perform next operation
  }, 100);
  ```

- **Coordinate System**: Coordinates must be relative to the container, not the viewport. Always convert if you have viewport coordinates.

## Troubleshooting

### Click Not Working

1. Verify the container exists:
   ```javascript
   var container = context.container().node();
   if (!container) {
       console.error('Container not found');
   }
   ```

2. Check if coordinates are within bounds:
   ```javascript
   var rect = context.surfaceRect();
   if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
       console.error('Coordinates out of bounds');
   }
   ```

3. Ensure map is loaded and features are rendered:
   ```javascript
   // Wait for map to be drawn
   context.map().on('drawn', function() {
       // Now safe to click
   });
   ```

### Wrong Feature Selected

- The click selects whatever element is at the exact pixel coordinates. If multiple features overlap, the topmost element is selected.
- Try adjusting coordinates slightly if you're not selecting the intended feature.
- Use zoom to make features larger and easier to target.

## Related Context Methods

- `context.selectedIDs()`: Get array of currently selected entity IDs
- `context.entity(id)`: Get entity object by ID
- `context.mode()`: Get current editor mode
- `context.map()`: Access map object for pan/zoom operations
- `context.surfaceRect()`: Get bounding rectangle of map surface

## See Also

- [API.md](API.md) - General iD API documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - iD architecture overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines

