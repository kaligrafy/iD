describe('iD.uiFieldLaneList helpers', () => {

    describe('laneCountKey', () => {
        describe.each([
            ['width:lanes', 'lanes'],
            ['width:lanes:start', 'lanes'],
            ['width:lanes:forward:start', 'lanes:forward'],
            ['width:lanes:backward:end', 'lanes:backward'],
            ['change:lanes', 'lanes'],
            ['change:lanes:forward', 'lanes:forward'],
            ['change:lanes:backward', 'lanes:backward'],
            ['turn:lanes', 'lanes'],
            ['turn:lanes:forward', 'lanes:forward'],
            ['turn:lanes:backward', 'lanes:backward'],
            ['turn:lanes:both_ways', 'lanes:both_ways']
        ])('%s', (key, expected) => {
            it(`reads count from ${expected}`, () => {
                expect(iD.laneCountKey(key)).toBe(expected);
            });
        });
    });

    describe('laneKind', () => {
        describe.each([
            ['width:lanes', 'width'],
            ['width:lanes:forward:start', 'width'],
            ['change:lanes', 'change'],
            ['change:lanes:backward', 'change'],
            ['turn:lanes', 'turn'],
            ['turn:lanes:forward', 'turn']
        ])('%s', (key, expected) => {
            it(`is ${expected}`, () => {
                expect(iD.laneKind(key)).toBe(expected);
            });
        });
    });

    describe('laneTagValue', () => {
        describe.each([
            ['left|right', 'left|right'],
            [['left', 'through'], ''],
            [undefined, ''],
            [null, ''],
        ])('%j', (raw, expected) => {
            it(`-> ${JSON.stringify(expected)}`, () => {
                expect(iD.laneTagValue(raw)).toBe(expected);
            });
        });
    });

    describe('laneCountFromTags', () => {
        describe.each([
            ['3', 3],
            [['2', '3'], undefined],
            ['', undefined],
            [undefined, undefined],
        ])('%j', (raw, expected) => {
            it(`-> ${expected}`, () => {
                expect(iD.laneCountFromTags(raw)).toBe(expected);
            });
        });
    });

    describe('splitLaneValues', () => {
        describe.each([
            // [value, count, expected]
            ['3|3|2.5', 3, ['3', '3', '2.5']],
            ['3|3', 3, ['3', '3', '']],            // pad to count
            ['3|3|2|2', 2, ['3', '3']],            // truncate to count
            ['', 3, ['', '', '']],                 // empty value, known count
            ['yes|no', 0, ['yes', 'no']],          // unknown count -> use the value's lanes
            ['', 0, []],                           // unknown count, empty value
            [['left', 'through'], 2, ['', '']],    // multiselect conflict
        ])('(%s, %i)', (value, count, expected) => {
            it(`-> ${JSON.stringify(expected)}`, () => {
                expect(iD.splitLaneValues(value, count)).toEqual(expected);
            });
        });
    });

    describe('joinLaneValues', () => {
        describe.each([
            [['3', '3', '2.5'], '3|3|2.5'],
            [['3', '', ''], '3||'],                // keep interior/trailing gaps
            [['', '', ''], undefined],             // all empty -> clear the tag
            [[], undefined]
        ])('%j', (values, expected) => {
            it(`-> ${expected}`, () => {
                expect(iD.joinLaneValues(values)).toBe(expected);
            });
        });
    });

    describe('canonicalTurn', () => {
        describe.each([
            ['left||right', 'left|none|right'],         // bare gaps -> explicit none
            ['|||', 'none|none|none|none'],
            ['left|none|right', 'left|none|right'],      // already canonical
            ['left;through|right', 'left;through|right'] // multi-turn cell untouched
        ])('%s', (value, expected) => {
            it(`-> ${expected}`, () => {
                expect(iD.canonicalTurn(value)).toBe(expected);
            });
        });
    });

    describe('serializeLaneValues', () => {
        describe.each([
            // [kind, values, expected]
            ['turn', ['left', '', 'right'], 'left|none|right'],   // turn fills gaps with none
            ['turn', ['', '', ''], undefined],                    // all blank -> clear
            ['width', ['3', '', '2'], '3||2'],                    // width keeps gaps
            ['width', ['', ''], undefined],
            ['change', ['yes', 'no'], 'yes|no']
        ])('(%s, %j)', (kind, values, expected) => {
            it(`-> ${expected}`, () => {
                expect(iD.serializeLaneValues(kind, values)).toBe(expected);
            });
        });
    });

    describe('widthPatterns', () => {
        it('returns nothing below 2 lanes', () => {
            expect(iD.widthPatterns(1, '↑')).toEqual([]);
        });
        it('offers the merge and partial-lane cases for 3 lanes', () => {
            const values = iD.widthPatterns(3, '↑').map(p => p.value);
            expect(values).toContain('');         // all full
            expect(values).toContain('||0');      // merge right
            expect(values).toContain('0||');      // merge left
            expect(values).toContain('0||0');     // merge both ends
            expect(values).toContain('||1.5');    // partial 1.5 m right
            expect(values).toContain('1.5||');    // partial 1.5 m left
        });
        it('omits the nonsensical both-ends merge (0|0) for 2 lanes', () => {
            const values = iD.widthPatterns(2, '↑').map(p => p.value);
            expect(values).toContain('|0');       // merge right kept
            expect(values).toContain('0|');       // merge left kept
            expect(values).not.toContain('0|0');  // both ends -> no middle lane
        });
        it.each([
            ['|0', '↑/  or  /↓'],          // merge right + its 180° reverse
            ['0|', '\\↑  or  ↓\\'],         // merge left
            ['|1.5', '↑|1.5  or  1.5|↓'],  // multi-char width stays intact (not 5.1)
            ['1.5|', '1.5|↑  or  ↓|1.5']
        ])('labels %s with both directions (start)', (value, label) => {
            const opt = iD.widthPatterns(2, '↑').find(p => p.value === value);
            expect(opt.title).toBe(label);
        });
        // :end mirrors the merge diagonals vs :start (a lane closes, not opens)
        it.each([
            ['|0', '↑\\  or  \\↓'],   // start was ↑/ ; end flips the diagonal
            ['0|', '/↑  or  ↓/']      // start was \↑
        ])('mirrors %s diagonals for the transition end', (value, label) => {
            const opt = iD.widthPatterns(2, '↑', true).find(p => p.value === value);
            expect(opt.title).toBe(label);
        });
    });

    describe('turnPatterns', () => {
        it('emits curated cases with explicit none for 3 lanes', () => {
            const values = iD.turnPatterns(3).map(p => p.value);
            expect(values).toContain('left|none|none');
            expect(values).toContain('left|through|right');
        });
        it('returns nothing for an uncurated lane count', () => {
            expect(iD.turnPatterns(99)).toEqual([]);
        });
    });

    // A missing/invalid `lanes` tag yields NaN; pattern generators must not throw.
    describe('commonPatterns with NaN count', () => {
        it.each(['width', 'change', 'turn'])('returns [] for %s', (kind) => {
            expect(iD.commonPatterns(kind, NaN, '↑')).toEqual([]);
        });
    });

    describe('changePatterns', () => {
        it('offers all-open/all-closed and one closed boundary each for 3 lanes', () => {
            const values = iD.changePatterns(3).map(p => p.value);
            expect(values).toContain('yes|yes|yes');     // all open
            expect(values).toContain('no|no|no');        // all closed
            expect(values).toContain('no|not_left|yes'); // close boundary 1
            expect(values).toContain('yes|not_right|no'); // close boundary 2
        });
        it('only offers all-open/all-closed for 2 lanes (single boundary)', () => {
            expect(iD.changePatterns(2).map(p => p.value)).toEqual(['yes|yes', 'no|no']);
        });
        it('returns nothing for fewer than 2 lanes', () => {
            expect(iD.changePatterns(1)).toEqual([]);
            expect(iD.changePatterns(NaN)).toEqual([]);
        });
    });

    describe('laneCountMismatch', () => {
        it.each([
            ['', 3],                  // no value set
            ['left|through|right', 3], // matches
            ['yes|yes', 2],
            ['1|1.5', NaN]            // no lane count to compare against
        ])('is silent for %s with count %s', (value, count) => {
            expect(iD.laneCountMismatch(value, count)).toBeUndefined();
        });

        it.each([
            ['left|right', 3, 2],
            ['yes|yes|yes|yes', 2, 4],
            ['1', 2, 1]
        ])('flags %s (count %s) as having %s lanes', (value, count, actual) => {
            expect(iD.laneCountMismatch(value, count)).toBe(actual);
        });
    });

    describe('matchPattern', () => {
        it('matches a bare-gap turn value to its none form', () => {
            const match = iD.matchPattern('turn', iD.turnPatterns(3), 'left||');
            expect(match && match.value).toBe('left|none|none');
        });
        it('matches the empty width value to the all-full case', () => {
            const match = iD.matchPattern('width', iD.widthPatterns(3, '↑'), '');
            expect(match && match.value).toBe('');
        });
    });

    describe('change pictographs (v5 symbols, per boundary)', () => {
        it.each([
            ['yes|yes', '⋮'],            // shared boundary, both sides -> one dotted
            ['no|no', '|'],              // closed
            ['yes|no', '⋮|'],            // open from the left only
            ['no|yes', '|⋮'],            // open from the right only
            ['yes|yes|yes', '⋮ ⋮'],
            ['no|yes|no', '|⋮ ⋮|'],      // matches v5
            ['yes|not_right|no', '⋮ |'], // matches v5
            // only_left / only_right are synonyms of not_right / not_left
            ['yes|only_left|no', '⋮ |'],
            ['yes|not_right|no', '⋮ |'],
            ['no|only_right|yes', '| ⋮']
        ])('changeLabel(%s) -> %s', (value, label) => {
            expect(iD.changeLabel(value)).toBe(label);
        });
        it('labels common change patterns with symbols', () => {
            const titles = iD.changePatterns(2).map(p => p.title);
            expect(titles).toEqual(['⋮', '|']);   // all open, all closed
        });
    });

    describe('change boundaries (custom editor)', () => {
        it.each([
            ['yes|yes', ['⋮']],
            ['no|no', ['|']],
            ['yes|no|yes', ['⋮|', '|⋮']]
        ])('changeBoundaries(%s) -> glyphs', (value, glyphs) => {
            expect(iD.changeBoundaries(value)).toEqual(glyphs);
        });

        it.each([
            [['⋮'], 'yes|yes'],
            [['|'], 'no|no'],
            [['⋮', '|'], 'yes|not_right|no'],   // close right boundary only
            [['⋮|', '|⋮'], 'yes|no|yes']
        ])('boundariesToValue(%s) -> %s', (glyphs, value) => {
            expect(iD.boundariesToValue(glyphs)).toBe(value);
        });

        // editing must be stable: glyphs -> value -> glyphs is the identity.
        // Rows are wrapped once so it.each passes the glyph array as one arg.
        it.each([[['⋮']], [['|']], [['⋮|']], [['|⋮']], [['⋮', '|', '⋮|', '|⋮']]])(
            'round-trips %j through boundariesToValue', (glyphs) => {
                expect(iD.changeBoundaries(iD.boundariesToValue(glyphs))).toEqual(glyphs);
            });
    });

    describe('cell options (grid)', () => {
        it.each([
            ['width', '1.5', '1.5'],
            ['turn', 'left', '↰'],
            ['turn', 'left;through', '↰↑'],
            ['turn', 'none', ''],
            ['turn', '', '']
        ])('cellDisplay(%s, %s) -> %s', (kind, value, label) => {
            expect(iD.cellDisplay(kind, value)).toBe(label);
        });

        it.each([
            ['width', '1.5', '1.5'],
            ['change', '⋮', '⋮'],             // change cells are boundary glyphs (identity)
            ['turn', '↰', 'left'],
            ['turn', '↰↑', 'left;through'],
            ['turn', '⇖', 'merge_to_left'],   // distinct from slight_left ↖
            ['turn', '↖', 'slight_left'],
            ['turn', '', '']                  // cleared cell -> none on serialize
        ])('cellValue(%s, %s) -> %s', (kind, label, value) => {
            expect(iD.cellValue(kind, label)).toBe(value);
        });

        it('round-trips every turn cell option through display/value', () => {
            iD.cellOptions('turn').forEach(opt => {
                expect(iD.cellValue('turn', opt.value)).toBe(opt.title);
                expect(iD.cellDisplay('turn', opt.title)).toBe(opt.value);
            });
        });
    });
});
