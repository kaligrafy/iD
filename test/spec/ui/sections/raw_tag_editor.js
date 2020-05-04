describe('iD.uiSectionRawTagEditor', function() {
    var taglist, element, entity, context;

    function render(tags) {
<<<<<<< HEAD:test/spec/ui/raw_tag_editor.js

        entity = iD.osmNode({ id: 'n12345', tags: tags });
        context = iD.coreContext();
        context.history().merge([entity]);

        taglist = iD.uiRawTagEditor(context)
=======
        taglist = iD.uiSectionRawTagEditor('raw-tag-editor', context)
>>>>>>> b7e6bb26c1c87acd3c0f800672fb5369076ecd71:test/spec/ui/sections/raw_tag_editor.js
            .entityIDs([entity.id])
            .presets([{isFallback: function() { return false; }}])
            .tags(tags)
            .expandedByDefault(true);

        element = d3.select('body')
            .append('div')
            .attr('class', 'ui-wrap')
            .call(taglist.render);
    }

    beforeEach(function () {
<<<<<<< HEAD:test/spec/ui/raw_tag_editor.js
        render({ highway: 'residential' });
=======
        entity = iD.osmNode({id: 'n12345'});
        context = iD.coreContext().init();
        context.history().merge([entity]);
        render({highway: 'residential'});
>>>>>>> b7e6bb26c1c87acd3c0f800672fb5369076ecd71:test/spec/ui/sections/raw_tag_editor.js
    });

    afterEach(function () {
        d3.selectAll('.ui-wrap')
            .remove();
    });


    it('creates input elements for each key-value pair', function () {
        expect(element.selectAll('input[value=highway]')).not.to.be.empty;
        expect(element.selectAll('input[value=residential]')).not.to.be.empty;
    });

    it('creates a pair of empty input elements if the entity has no tags', function () {
        element.remove();
        render({});
        expect(element.select('.tag-list').selectAll('input.value').property('value')).to.be.empty;
        expect(element.select('.tag-list').selectAll('input.key').property('value')).to.be.empty;
    });

    it('adds tags when clicking the add button', function (done) {
        happen.click(element.selectAll('button.add-tag').node());
        setTimeout(function() {
            expect(element.select('.tag-list').selectAll('input').nodes()[2].value).to.be.empty;
            expect(element.select('.tag-list').selectAll('input').nodes()[3].value).to.be.empty;
            done();
        }, 20);
    });

    it('removes tags when clicking the remove button', function (done) {
        taglist.on('change', function(tags) {
            expect(tags).to.eql({highway: undefined});
            done();
        });
        iD.utilTriggerEvent(element.selectAll('button.remove'), 'mousedown');
    });

    it('adds tags when pressing the TAB key on last input.value', function (done) {
        expect(element.selectAll('.tag-list li').nodes().length).to.eql(1);
        var input = d3.select('.tag-list li:last-child input.value').nodes()[0];
        happen.keydown(d3.select(input).node(), {keyCode: 9});
        setTimeout(function() {
            expect(element.selectAll('.tag-list li').nodes().length).to.eql(2);
            expect(element.select('.tag-list').selectAll('input').nodes()[2].value).to.be.empty;
            expect(element.select('.tag-list').selectAll('input').nodes()[3].value).to.be.empty;
            done();
        }, 20);
    });

    it('does not add a tag when pressing TAB while shift is pressed', function (done) {
        expect(element.selectAll('.tag-list li').nodes().length).to.eql(1);
        var input = d3.select('.tag-list li:last-child input.value').nodes()[0];
        happen.keydown(d3.select(input).node(), {keyCode: 9, shiftKey: true});
        setTimeout(function() {
            expect(element.selectAll('.tag-list li').nodes().length).to.eql(1);
            done();
        }, 20);
    });
});
