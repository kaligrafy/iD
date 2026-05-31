describe('iD.prerequisiteTagSatisfied', () => {

    describe.each([
        // [description, prerequisiteTag, tags, expected]
        ['value: match', { key: 'a', value: 'lane' }, { a: 'lane' }, true],
        ['value: mismatch', { key: 'a', value: 'lane' }, { a: 'track' }, false],
        ['value: absent', { key: 'a', value: 'lane' }, {}, false],
        ['values: includes', { key: 'a', values: ['lane', 'share_busway'] }, { a: 'share_busway' }, true],
        ['values: excludes', { key: 'a', values: ['lane', 'share_busway'] }, { a: 'track' }, false],
        ['valueNot: differs', { key: 'a', valueNot: 'no' }, { a: 'lane' }, true],
        ['valueNot: equals', { key: 'a', valueNot: 'no' }, { a: 'no' }, false],
        ['valuesNot: excluded', { key: 'a', valuesNot: ['no'] }, { a: 'lane' }, true],
        ['valuesNot: included', { key: 'a', valuesNot: ['no'] }, { a: 'no' }, false],
        ['bare key: present', { key: 'a' }, { a: 'whatever' }, true],
        ['bare key: absent', { key: 'a' }, {}, false],
        ['keyNot: absent', { keyNot: 'a' }, {}, true],
        ['keyNot: present', { keyNot: 'a' }, { a: 'x' }, false],
        // array of conditions => OR semantics
        ['OR: first matches', [{ key: 'a', value: 'lane' }, { key: 'b', value: 'lane' }], { a: 'lane' }, true],
        ['OR: second matches', [{ key: 'a', value: 'lane' }, { key: 'b', value: 'lane' }], { b: 'lane' }, true],
        ['OR: none matches', [{ key: 'a', value: 'lane' }, { key: 'b', value: 'lane' }], { c: 'lane' }, false]
    ])('%s', (_desc, prerequisiteTag, tags, expected) => {
        it(`returns ${expected}`, () => {
            expect(iD.prerequisiteTagSatisfied(prerequisiteTag, tags)).toBe(expected);
        });
    });
});
