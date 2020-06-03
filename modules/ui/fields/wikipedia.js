import { dispatch as d3_dispatch } from 'd3-dispatch';
import { select as d3_select, event as d3_event } from 'd3-selection';

import { fileFetcher } from '../../core/file_fetcher';
import { t, localizer } from '../../core/localizer';
import { actionChangeTags } from '../../actions/change_tags';
import { services } from '../../services/index';
import { svgIcon } from '../../svg/icon';
import { uiCombobox } from '../combobox';
import { utilGetSetValue, utilNoAuto, utilRebind } from '../../util';


export function uiFieldWikipedia(field, context) {
  const dispatch = d3_dispatch('change');
  const wikipedia = services.wikipedia;
  const wikidata = services.wikidata;
  let _langInput = d3_select(null);
  let _titleInput = d3_select(null);
  let _wikiURL = '';
  let _entityIDs;
  let _tags;

  let _dataWikipedia = [];
  fileFetcher.get('wmf_sitematrix')
    .then(d => {
      _dataWikipedia = d;
      if (_tags) updateForTags(_tags);
    })
    .catch(() => { /* ignore */ });


  const langCombo = uiCombobox(context, 'wikipedia-lang')
    .fetcher((value, callback) => {
      const v = value.toLowerCase();
      callback(_dataWikipedia
        .filter(d => {
          return d[0].toLowerCase().indexOf(v) >= 0 ||
            d[1].toLowerCase().indexOf(v) >= 0 ||
            d[2].toLowerCase().indexOf(v) >= 0;
        })
        .map(d => ({ value: d[1] }))
      );
    });

  const titleCombo = uiCombobox(context, 'wikipedia-title')
    .fetcher((value, callback) => {
      if (!value) {
        value = '';
        for (let i in _entityIDs) {
          let entity = context.hasEntity(_entityIDs[i]);
          if (entity.tags.name) {
            value = entity.tags.name;
            break;
          }
        }
      }
      const searchfn = value.length > 7 ? wikipedia.search : wikipedia.suggestions;
      searchfn(language()[2], value, (query, data) => {
        callback( data.map(d => ({ value: d })) );
      });
    });


  function wiki(selection) {
    let wrap = selection.selectAll('.form-field-input-wrap')
      .data([0]);

    wrap = wrap.enter()
      .append('div')
      .attr('class', `form-field-input-wrap form-field-input-${field.type}`)
      .merge(wrap);


    let langContainer = wrap.selectAll('.wiki-lang-container')
      .data([0]);

    langContainer = langContainer.enter()
      .append('div')
      .attr('class', 'wiki-lang-container')
      .merge(langContainer);


    _langInput = langContainer.selectAll('input.wiki-lang')
      .data([0]);

    _langInput = _langInput.enter()
      .append('input')
      .attr('type', 'text')
      .attr('class', 'wiki-lang')
      .attr('placeholder', t('translate.localized_translation_language'))
      .call(utilNoAuto)
      .call(langCombo)
      .merge(_langInput);

    utilGetSetValue(_langInput, language()[1]);

    _langInput
      .on('blur', changeLang)
      .on('change', changeLang);


    let titleContainer = wrap.selectAll('.wiki-title-container')
      .data([0]);

    titleContainer = titleContainer.enter()
      .append('div')
      .attr('class', 'wiki-title-container')
      .merge(titleContainer);

    _titleInput = titleContainer.selectAll('input.wiki-title')
      .data([0]);

    _titleInput = _titleInput.enter()
      .append('input')
      .attr('type', 'text')
      .attr('class', 'wiki-title')
      .attr('id', field.domId)
      .attr('maxlength', context.maxCharsForTagValue() - 4)
      .call(utilNoAuto)
      .call(titleCombo)
      .merge(_titleInput);

    _titleInput
      .on('blur', blur)
      .on('change', change);


    let link = titleContainer.selectAll('.wiki-link')
      .data([0]);

    link = link.enter()
      .append('button')
      .attr('class', 'form-field-button wiki-link')
      .attr('tabindex', -1)
      .attr('title', t('icons.view_on', { domain: 'wikipedia.org' }))
      .call(svgIcon('#iD-icon-out-link'))
      .merge(link);

    link
      .on('click', () => {
        d3_event.preventDefault();
        if (_wikiURL) window.open(_wikiURL, '_blank');
      });
  }


  function language() {
    const value = utilGetSetValue(_langInput).toLowerCase();
    const locale = localizer.localeCode().toLowerCase();
    let localeLanguage;
    return _dataWikipedia.find(d => {
      if (d[2] === locale) localeLanguage = d;
      return d[0].toLowerCase() === value || d[1].toLowerCase() === value || d[2] === value;
    }) || localeLanguage || ['English', 'English', 'en'];
  }


  function changeLang() {
    utilGetSetValue(_langInput, language()[1]);
    change(true);
  }


  function blur() {
    change(true);
  }


  function change(skipWikidata) {
    let value = utilGetSetValue(_titleInput);
    const m = value.match(/https?:\/\/([-a-z]+)\.wikipedia\.org\/(?:wiki|\1-[-a-z]+)\/([^#]+)(?:#(.+))?/);
    const l = m && _dataWikipedia.find(d => m[1] === d[2]);
    let syncTags = {};

    if (l) {
      // Normalize title http://www.mediawiki.org/wiki/API:Query#Title_normalization
      value = decodeURIComponent(m[2]).replace(/_/g, ' ');
      if (m[3]) {
        let anchor;
        // try {
        // leave this out for now - #6232
          // Best-effort `anchordecode:` implementation
          // anchor = decodeURIComponent(m[3].replace(/\.([0-9A-F]{2})/g, '%$1'));
        // } catch (e) {
        anchor = decodeURIComponent(m[3]);
        // }
        value += '#' + anchor.replace(/_/g, ' ');
      }
      value = value.slice(0, 1).toUpperCase() + value.slice(1);
      utilGetSetValue(_langInput, l[1]);
      utilGetSetValue(_titleInput, value);
    }

    if (value) {
      syncTags.wikipedia = (language()[2] + ':' + value).substr(0, context.maxCharsForTagValue());
    } else {
      syncTags.wikipedia = undefined;
    }

    dispatch.call('change', this, syncTags);


    if (skipWikidata || !value || !language()[2]) return;

    // attempt asynchronous update of wikidata tag..
    const initGraph = context.graph();
    const initEntityIDs = _entityIDs;

    wikidata.itemsByTitle(language()[2], value, (err, data) => {
      if (err || !data || !Object.keys(data).length) return;

      // If graph has changed, we can't apply this update.
      if (context.graph() !== initGraph) return;

      const qids = Object.keys(data);
      const value = qids && qids.find(id => id.match(/^Q\d+$/));

      let actions = initEntityIDs.map((entityID) => {
        let entity = context.entity(entityID).tags;
        let currTags = Object.assign({}, entity);  // shallow copy
        if (currTags.wikidata !== value) {
            currTags.wikidata = value;
            return actionChangeTags(entityID, currTags);
        }
      }).filter(Boolean);

      if (!actions.length) return;

      // Coalesce the update of wikidata tag into the previous tag change
      context.overwrite(
        function actionUpdateWikidataTags(graph) {
          actions.forEach(function(action) {
            graph = action(graph);
          });
          return graph;
        },
        context.history().undoAnnotation()
      );

      // do not dispatch.call('change') here, because entity_editor
      // changeTags() is not intended to be called asynchronously
    });
  }


  wiki.tags = (tags) => {
    _tags = tags;
    updateForTags(tags);
  };

  function updateForTags(tags) {

    const value = typeof tags[field.key] === 'string' ? tags[field.key] : '';
    const m = value.match(/([^:]+):([^#]+)(?:#(.+))?/);
    const l = m && _dataWikipedia.find(d => m[1] === d[2]);
    let anchor = m && m[3];

    // value in correct format
    if (l) {
      utilGetSetValue(_langInput, l[1]);
      utilGetSetValue(_titleInput, m[2] + (anchor ? ('#' + anchor) : ''));
      if (anchor) {
        try {
          // Best-effort `anchorencode:` implementation
          anchor = encodeURIComponent(anchor.replace(/ /g, '_')).replace(/%/g, '.');
        } catch (e) {
          anchor = anchor.replace(/ /g, '_');
        }
      }
      _wikiURL = 'https://' + m[1] + '.wikipedia.org/wiki/' +
        m[2].replace(/ /g, '_') + (anchor ? ('#' + anchor) : '');

    // unrecognized value format
    } else {
      utilGetSetValue(_titleInput, value);
      if (value && value !== '') {
        utilGetSetValue(_langInput, '');
        _wikiURL = `https://en.wikipedia.org/wiki/Special:Search?search=${value}`;
      } else {
        _wikiURL = '';
      }
    }
  }


  wiki.entityIDs = (val) => {
    if (!arguments.length) return _entityIDs;
    _entityIDs = val;
    return wiki;
  };


  wiki.focus = () => {
    _titleInput.node().focus();
  };


  return utilRebind(wiki, dispatch, 'on');
}

uiFieldWikipedia.supportsMultiselection = false;
