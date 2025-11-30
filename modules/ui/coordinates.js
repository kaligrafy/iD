import { event as d3_event, select as d3_select } from 'd3-selection';

export function uiCoordinates(context) {
    var _selection = d3_select(null);
    var _pixelCoords = [0, 0];
    var _geoCoords = [0, 0];
    var _initialized = false;

    function update() {
        // Always get a fresh reference to the element
        var coordsElement = d3_select('.coordinates-display');
        if (coordsElement.empty()) {
            return;
        }
        
        // Verify the element is still in the DOM
        var node = coordsElement.node();
        if (!node || !node.parentNode) {
            return;
        }

        var lat = _geoCoords[1].toFixed(6);
        var lon = _geoCoords[0].toFixed(6);
        var x = Math.round(_pixelCoords[0]);
        var y = Math.round(_pixelCoords[1]);

        var displayText = 'Lat: ' + lat + ' Lon: ' + lon + ' | Pixel: ' + x + ', ' + y;
        coordsElement.text(displayText);
    }

    function coordinates(selection) {
        _selection = selection;
        
        // Initialize with default text
        _selection.text('Lat: 0.000000 Lon: 0.000000 | Pixel: 0, 0');

        // Wait for map to be ready before setting up event handler
        if (!_initialized) {
            _initialized = true;
            
            // Use a small delay to ensure map is ready
            var setupHandler = function() {
                var surface = context.surface();
                if (surface.empty()) {
                    setTimeout(setupHandler, 100);
                    return;
                }
                
                // Listen to mouse move events on the map surface
                // Use a unique namespace to avoid conflicts
                surface.on('mousemove.coordinates-display', function() {
                    // Re-select the element each time to ensure we have a valid reference
                    var coordsElement = d3_select('.coordinates-display');
                    if (coordsElement.empty()) {
                        return;
                    }
                    _selection = coordsElement;
                    
                    var containerNode = context.container().node();
                    if (!containerNode) {
                        return;
                    }

                    // Get mouse position relative to container
                    var rect = containerNode.getBoundingClientRect();
                    var event = d3_event;
                    if (!event) {
                        return;
                    }

                    _pixelCoords[0] = event.clientX - rect.left - (containerNode.clientLeft || 0);
                    _pixelCoords[1] = event.clientY - rect.top - (containerNode.clientTop || 0);

                    // Convert to geographic coordinates using map's mouseCoordinates
                    try {
                        var geo = context.map().mouseCoordinates();
                        if (geo && geo.length === 2 && !isNaN(geo[0]) && !isNaN(geo[1])) {
                            _geoCoords = geo;
                        }
                    } catch (e) {
                        // If mouseCoordinates fails, try using projection directly
                        try {
                            var projection = context.projection;
                            var map = context.map();
                            var dimensions = map.dimensions();
                            
                            // Convert pixel coords to map coordinates
                            var px = [
                                _pixelCoords[0] - dimensions[0] / 2,
                                _pixelCoords[1] - dimensions[1] / 2
                            ];
                            _geoCoords = projection.invert(px);
                        } catch (e2) {
                            // If all else fails, keep previous coordinates
                        }
                    }

                    update();
                });
            };
            
            setTimeout(setupHandler, 100);
        }

        update();
    }

    return coordinates;
}

