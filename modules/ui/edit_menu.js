import { select as d3_select } from 'd3-selection';
import { dispatch as d3_dispatch } from 'd3-dispatch';

import { geoVecAdd } from '../geo';
import { localizer } from '../core/localizer';
import { uiTooltip } from './tooltip';
import { utilRebind } from '../util/rebind';
import { utilHighlightEntities } from '../util/util';
import { utilGetDimensions } from '../util/dimensions';
import { svgIcon } from '../svg/icon';


export function uiEditMenu(context) {
    var dispatch = d3_dispatch('toggled');

    var _menu = d3_select(null);
    var _operations = [];
    // the position the menu should be displayed relative to
    var _anchorLoc = [0, 0];
    var _anchorLocLonLat = [0, 0];
    // a string indicating how the menu was opened
    var _triggerType = '';

    var _vpTopMargin = 85; // viewport top margin
    var _vpBottomMargin = 45; // viewport bottom margin
    var _vpSideMargin = 35;   // viewport side margin

    var _menuTop = false;
    var _menuHeight;
    var _menuWidth;
    // whether the menu is displayed on the left of the anchor (near the right edge)
    var _menuLeft = false;

    // the cascading submenu flyout (e.g. clone types) and its delayed-close timer
    var _submenu = d3_select(null);
    var _submenuTimer;

    // hardcode these values to make menu positioning easier
    var _verticalPadding = 4;

    // see also `.edit-menu .tooltip` CSS; include margin
    var _tooltipWidth = 210;

    // offset the menu slightly from the target location
    var _menuSideMargin = 10;

    var _tooltips = [];

    var editMenu = function(selection) {

        var isTouchMenu = _triggerType.includes('touch') || _triggerType.includes('pen');

        // Operations flagged `hiddenFromEditMenu` don't appear at the top level;
        // they are surfaced inside a submenu opened by a container operation
        // (e.g. the clone types under the `clone` operation).
        var topOps = _operations.filter(function(op) {
            return !op.hiddenFromEditMenu && (!isTouchMenu || !op.mouseOnly);
        });

        if (!topOps.length) return;

        // Position the menu above the anchor for stylus and finger input
        // since the mapper's hand likely obscures the screen below the anchor
        _menuTop = isTouchMenu;

        // Show labels for touch input since there aren't hover tooltips
        var showLabels = isTouchMenu;
        var buttonHeight = showLabels ? 32 : 34;
        if (showLabels) {
            // Get a general idea of the width based on the length of the label
            _menuWidth = 52 + Math.min(120, 6 * Math.max.apply(Math, topOps.map(function(op) {
                return (op.title && op.title.length) || 10;
            })));
        } else {
            _menuWidth = 44;
        }

        _menuHeight = _verticalPadding * 2 + topOps.length * buttonHeight;
        _tooltips = [];

        _menu = selection
            .append('div')
            .attr('class', 'edit-menu')
            .classed('touch-menu', isTouchMenu)
            .style('padding', _verticalPadding + 'px 0');

        renderButtons(_menu, topOps, showLabels, true);

        updatePosition();

        var initialScale = context.projection.scale();
        context.map()
            .on('move.edit-menu', function() {
                if (initialScale !== context.projection.scale()) {
                    editMenu.close();
                }
            })
            .on('drawn.edit-menu', function(info) {
                if (info.full) updatePosition();
            });

        dispatch.call('toggled', this, true);


        // Render operation buttons into `container`. `withLabels` adds text
        // labels; `isMainMenu` adds tooltips and the submenu hover handling.
        function renderButtons(container, ops, withLabels, isMainMenu) {

            var height = withLabels ? 32 : 34;

            var buttons = container.selectAll('.edit-menu-item')
                .data(ops, function(d) { return d.id; });

            buttons.exit().remove();

            // enter
            var buttonsEnter = buttons.enter()
                .append('button')
                .attr('class', function (d) { return 'edit-menu-item edit-menu-item-' + d.id; })
                .style('height', height + 'px')
                .on('click', click)
                // don't listen for `mouseup` because we only care about non-mouse pointer types
                .on('pointerup', pointerup)
                .on('pointerdown mousedown', function pointerdown(d3_event) {
                    // don't let button presses also act as map input - #1869
                    d3_event.stopPropagation();
                })
                .on('mouseenter.highlight', function(d3_event, d) {
                    if (d3_select(this).classed('disabled')) return;

                    if (d.relatedEntityIds) {
                        utilHighlightEntities(d.relatedEntityIds(), true, context);
                    }

                    if (d.getAuxiliaryGeometry) {
                        drawAuxiliaryGeometry(context, d.getAuxiliaryGeometry());
                    }
                })
                .on('mouseleave.highlight', function(d3_event, d) {
                    if (d.relatedEntityIds) {
                        utilHighlightEntities(d.relatedEntityIds(), false, context);
                    }

                    if (d.getAuxiliaryGeometry) {
                        drawAuxiliaryGeometry(context, []);
                    }
                });

            if (isMainMenu) {
                buttonsEnter.on('mouseenter.submenu', function(d3_event, d) {
                    // Container ops (e.g. clone) open a flyout beside the menu;
                    // other items close any open flyout.
                    if (d.subOperations) {
                        openSubmenu(this, d);
                    } else {
                        closeSubmenu();
                    }
                });
            }

            buttonsEnter.each(function(d) {
                var sel = d3_select(this);

                // Container ops show their title/description in the submenu header
                // instead of a hover tooltip that would overlap the flyout.
                if (isMainMenu && !d.subOperations) {
                    var tooltip = uiTooltip()
                        .scrollContainer(context.container().select('.over-map'))
                        .heading(() => d.title)
                        .title(d.tooltip)
                        .keys(d.keys && d.keys.length ? [d.keys[0]] : []);

                    _tooltips.push(tooltip);
                    sel.call(tooltip);
                }

                sel.append('div')
                    .attr('class', 'icon-wrap')
                    .call(svgIcon(d.icon && d.icon() || '#iD-operation-' + d.id, 'operation'));
            });

            if (withLabels) {
                buttonsEnter.append('span')
                    .attr('class', 'label')
                    .each(function(d) {
                        d3_select(this).call(d.title);
                    });
            }

            // update
            buttonsEnter
                .merge(buttons)
                .classed('disabled', d => {
                    // interruptible operations are not shown as disabled.
                    const reason = d.disabled();
                    return reason && !d.interrupts?.[reason];
                });
        }


        // Open the cascading flyout for a container operation, anchored to the
        // right (or left near the viewport edge) of the hovered button.
        function openSubmenu(buttonNode, operation) {
            closeSubmenu();

            _submenu = _menu
                .append('div')
                .attr('class', 'edit-menu edit-menu-submenu')
                .style('padding', _verticalPadding + 'px 0')
                .style('top', (buttonNode.offsetTop - _verticalPadding) + 'px')
                .on('mouseenter', cancelCloseSubmenu)
                .on('mouseleave', scheduleCloseSubmenu);

            // grow rightward when the menu sits on the right of the anchor, else leftward
            _submenu.style(_menuLeft ? 'right' : 'left', _menuWidth + 'px');

            // header: container title + description (replaces the hover tooltip)
            var header = _submenu.append('div').attr('class', 'edit-menu-submenu-header');
            header.append('div').attr('class', 'edit-menu-submenu-title').call(operation.title);
            header.append('div').attr('class', 'edit-menu-submenu-description').call(operation.tooltip());

            renderButtons(_submenu, operation.subOperations(), true, false);
        }

        function closeSubmenu() {
            cancelCloseSubmenu();
            if (!_submenu.empty()) {
                _submenu.remove();
                _submenu = d3_select(null);
            }
        }

        // Delay closing so the pointer can travel from the button to the flyout.
        function scheduleCloseSubmenu() {
            cancelCloseSubmenu();
            _submenuTimer = window.setTimeout(closeSubmenu, 120);
        }

        function cancelCloseSubmenu() {
            if (_submenuTimer) {
                window.clearTimeout(_submenuTimer);
                _submenuTimer = null;
            }
        }


        var lastPointerUpType;
        // `pointerup` is always called before `click`
        function pointerup(d3_event) {
            lastPointerUpType = d3_event.pointerType;
        }

        function click(d3_event, operation) {
            d3_event.stopPropagation();

            // Container operation: open its flyout submenu instead of performing
            // (handles touch input, where there is no hover).
            if (operation.subOperations) {
                openSubmenu(this, operation);
                return;
            }

            if (operation.relatedEntityIds) {
                utilHighlightEntities(operation.relatedEntityIds(), false, context);
            }

            const disabled = operation.disabled();
            if (disabled) {
                const interrupt = operation.interrupts?.[disabled];
                if (interrupt) {
                    interrupt();
                } else if (lastPointerUpType === 'touch' ||
                    lastPointerUpType === 'pen') {
                    // there are no tooltips for touch interactions so flash feedback instead
                    context.ui().flash
                        .duration(4000)
                        .iconName('#iD-operation-' + operation.id)
                        .iconClass('operation disabled')
                        .label(operation.tooltip())();
                }
            } else {
                if (lastPointerUpType === 'touch' ||
                    lastPointerUpType === 'pen') {
                    context.ui().flash
                        .duration(2000)
                        .iconName('#iD-operation-' + operation.id)
                        .iconClass('operation')
                        .label(operation.annotation() || operation.title)();
                }

                operation();
                editMenu.close();
            }
            lastPointerUpType = null;
        }
    };

    function updatePosition() {

        if (!_menu || _menu.empty()) return;

        var anchorLoc = context.projection(_anchorLocLonLat);

        var viewport = context.surfaceRect();

        if (anchorLoc[0] < 0 ||
            anchorLoc[0] > viewport.width ||
            anchorLoc[1] < 0 ||
            anchorLoc[1] > viewport.height) {
            // close the menu if it's gone offscreen

            editMenu.close();
            return;
        }

        var menuLeft = displayOnLeft(viewport);
        // remember the side so the submenu flyout grows away from the viewport edge
        _menuLeft = menuLeft;

        var offset = [0, 0];

        offset[0] = menuLeft ? -1 * (_menuSideMargin + _menuWidth) : _menuSideMargin;

        if (_menuTop) {
            if (anchorLoc[1] - _menuHeight < _vpTopMargin) {
                // menu is near top viewport edge, shift downward
                offset[1] = -anchorLoc[1] + _vpTopMargin;
            } else {
                offset[1] = -_menuHeight;
            }
        } else {
            if (anchorLoc[1] + _menuHeight > (viewport.height - _vpBottomMargin)) {
                // menu is near bottom viewport edge, shift upwards
                offset[1] = -anchorLoc[1] - _menuHeight + viewport.height - _vpBottomMargin;
            } else {
                offset[1] = 0;
            }
        }

        var origin = geoVecAdd(anchorLoc, offset);
        // repositioning the menu to account for the top menu height
        var _verticalOffset = parseFloat(utilGetDimensions(d3_select('.top-toolbar-wrap'))[1]);
        origin[1] -= _verticalOffset;

        _menu
            .style('left', origin[0] + 'px')
            .style('top', origin[1] + 'px');

        var tooltipSide = tooltipPosition(viewport, menuLeft);
        _tooltips.forEach(function(tooltip) {
            tooltip.placement(tooltipSide);
        });

        function displayOnLeft(viewport) {
            if (localizer.textDirection() === 'ltr') {
                if ((anchorLoc[0] + _menuSideMargin + _menuWidth) > (viewport.width - _vpSideMargin)) {
                    // right menu would be too close to the right viewport edge, go left
                    return true;
                }
                // prefer right menu
                return false;

            } else { // rtl
                if ((anchorLoc[0] - _menuSideMargin - _menuWidth) < _vpSideMargin) {
                    // left menu would be too close to the left viewport edge, go right
                    return false;
                }
                // prefer left menu
                return true;
            }
        }

        function tooltipPosition(viewport, menuLeft) {
            if (localizer.textDirection() === 'ltr') {
                if (menuLeft) {
                    // if there's not room for a right-side menu then there definitely
                    // isn't room for right-side tooltips
                    return 'left';
                }
                if ((anchorLoc[0] + _menuSideMargin + _menuWidth + _tooltipWidth) > (viewport.width - _vpSideMargin)) {
                    // right tooltips would be too close to the right viewport edge, go left
                    return 'left';
                }
                // prefer right tooltips
                return 'right';

            } else { // rtl
                if (!menuLeft) {
                    return 'right';
                }
                if ((anchorLoc[0] - _menuSideMargin - _menuWidth - _tooltipWidth) < _vpSideMargin) {
                    // left tooltips would be too close to the left viewport edge, go right
                    return 'right';
                }
                // prefer left tooltips
                return 'left';
            }
        }
    }

    editMenu.close = function () {

        context.map()
            .on('move.edit-menu', null)
            .on('drawn.edit-menu', null);

        if (_submenuTimer) {
            window.clearTimeout(_submenuTimer);
            _submenuTimer = null;
        }
        // the submenu is a child of _menu, so removing _menu drops it too
        _menu.remove();
        _submenu = d3_select(null);
        _tooltips = [];

        // Clean up any auxiliary overlays
        drawAuxiliaryGeometry(context, []);

        dispatch.call('toggled', this, false);
    };

    editMenu.anchorLoc = function(val) {
        if (!arguments.length) return _anchorLoc;
        _anchorLoc = val;
        _anchorLocLonLat = context.projection.invert(_anchorLoc);
        return editMenu;
    };

    editMenu.triggerType = function(val) {
        if (!arguments.length) return _triggerType;
        _triggerType = val;
        return editMenu;
    };

    editMenu.operations = function(val) {
        if (!arguments.length) return _operations;
        _operations = val;
        return editMenu;
    };

    return utilRebind(editMenu, dispatch, 'on');
}


// Helper function to draw/remove reflect axis overlay
function drawAuxiliaryGeometry(context, d) {
    const surface = context.surface();
    // Append to the OSM data layer to be in the same coordinate space as map features
    const container = surface.selectAll('.data-layer.osm .auxiliary');
    const paths = container.selectAll('path')
        .data(d, d => d.id);

    paths.exit().remove();
    const enter = paths.enter()
        .append('path');

    enter.merge(paths)
        .attr('class', d => d.klass)
        .attr('d', d => d.path);
}
