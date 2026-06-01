describe('iD.uiFieldBusLanes helpers', () => {

    describe('busLaneSequence', () => {
        describe.each([
            [2, 'right', 'yes|designated'],
            [3, 'right', 'yes|yes|designated'],
            [2, 'left', 'designated|yes'],
            [3, 'left', 'designated|yes|yes'],
            [3, 'opposite_left', 'yes|yes|designated'],
            [1, 'right', 'designated'],
            [0, 'right', undefined]
        ])('(%i, %s)', (count, side, expected) => {
            it(`is ${expected}`, () => {
                expect(iD.busLaneSequence(count, side)).toBe(expected);
            });
        });
    });

    describe('motorVehicleFromBus', () => {
        describe.each([
            ['yes|yes|designated', 'yes|yes|no'],
            ['designated|yes', 'no|yes'],
            ['designated', 'no']
        ])('%s', (bus, expected) => {
            it(`is ${expected}`, () => {
                expect(iD.motorVehicleFromBus(bus)).toBe(expected);
            });
        });
    });

    describe('writeBusLanes', () => {
        it('mirrors bus:lanes into motor_vehicle:lanes (bus lane closed)', () => {
            const diff = iD.writeBusLanes('right', { lanes: '3', oneway: 'yes' });
            expect(diff['bus:lanes']).toBe('yes|yes|designated');
            expect(diff['motor_vehicle:lanes']).toBe('yes|yes|no');
        });

        it('clears motor_vehicle:lanes for "none"', () => {
            const diff = iD.writeBusLanes('none', { lanes: '3' });
            expect(diff['motor_vehicle:lanes']).toBeUndefined();
        });

        it('clears every bus-lane key for "none"', () => {
            const diff = iD.writeBusLanes('none', { lanes: '3', oneway: 'yes', 'bus:lanes': 'yes|yes|designated' });
            expect(diff['bus:lanes']).toBeUndefined();
            expect(diff['busway:right']).toBeUndefined();
        });

        it('writes a one-way right bus lane', () => {
            const diff = iD.writeBusLanes('right', { lanes: '3', oneway: 'yes' });
            expect(diff['bus:lanes']).toBe('yes|yes|designated');
            expect(diff['lanes:bus']).toBe('1');
            expect(diff['busway:right']).toBe('lane');
            expect(diff['busway:left']).toBeUndefined();
        });

        it('writes a two-way left bus lane on the backward direction', () => {
            const diff = iD.writeBusLanes('left', { lanes: '4', oneway: 'no', 'lanes:forward': '2', 'lanes:backward': '2' });
            expect(diff['bus:lanes:backward']).toBe('designated|yes');
            expect(diff['lanes:bus:backward']).toBe('1');
            expect(diff['busway:left']).toBe('lane');
        });

        describe.each([
            ['fewer than 2 lanes', { lanes: '1', oneway: 'yes' }, 'right'],
            ['two-way >2 lanes without split', { lanes: '4', oneway: 'no' }, 'right'],
            ['both on a one-way road', { lanes: '3', oneway: 'yes' }, 'both']
        ])('returns null for %s', (_label, tags, side) => {
            it('null', () => {
                expect(iD.writeBusLanes(side, tags)).toBeNull();
            });
        });
    });

    describe('readBusLanes round-trips writeBusLanes', () => {
        // apply a write diff on top of the base road tags, dropping cleared keys
        function apply(base, diff) {
            const tags = Object.assign({}, base);
            Object.keys(diff).forEach(key => {
                if (diff[key] === undefined) delete tags[key];
                else tags[key] = diff[key];
            });
            return tags;
        }

        describe.each([
            ['one-way right', { lanes: '3', oneway: 'yes' }, 'right'],
            ['one-way left', { lanes: '2', oneway: 'yes' }, 'left'],
            ['two-way right', { lanes: '4', oneway: 'no', 'lanes:forward': '2', 'lanes:backward': '2' }, 'right'],
            ['two-way both', { lanes: '4', oneway: 'no', 'lanes:forward': '2', 'lanes:backward': '2' }, 'both'],
            ['two-way opposite_left', { lanes: '4', oneway: 'no', 'lanes:forward': '2', 'lanes:backward': '2' }, 'opposite_left'],
            ['empty is none', { lanes: '3', oneway: 'yes' }, 'none']
        ])('%s', (_label, base, side) => {
            it(`reads back "${side}"`, () => {
                const tags = apply(base, iD.writeBusLanes(side, base));
                expect(iD.readBusLanes(tags)).toBe(side);
            });
        });

        it('returns "" for an unsupported combination', () => {
            expect(iD.readBusLanes({ lanes: '3', oneway: 'yes', 'bus:lanes': 'yes|designated|yes' })).toBe('');
        });
    });
});
