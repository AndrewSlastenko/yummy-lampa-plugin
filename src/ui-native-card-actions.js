(function (window) {
    'use strict';
    function positive(value) { var n = Number(value); return isFinite(n) && n > 0 ? n : 0; }
    function actionState(progress, ceiling, source) {
        var state = {label: 'Смотреть', episode: 0, time: 0};
        if (source !== 'yummyanime' || !progress) return state;
        var number = positive(progress.number || progress.episode);
        var time = positive(progress.time || progress.position), duration = positive(progress.duration);
        if (!number || Math.floor(number) !== number) return state;
        var finished = progress.finished || progress.completed || progress.finished_episodes && progress.finished_episodes[number] || duration && time / duration >= 0.95;
        if (finished) {
            if (number + 1 <= positive(ceiling)) {
                state.episode = number + 1;
                state.label = 'Продолжить: серия ' + state.episode + ' · 0:00';
            }
        } else if (time > 0 && duration > time) {
            state.episode = number; state.time = Math.floor(time);
            state.label = 'Продолжить: серия ' + number + ' · ' + Math.floor(state.time / 60) + ':' + ('0' + state.time % 60).slice(-2);
        }
        return state;
    }
    function create(deps) {
        var L = deps.lampa, $ = deps.$, states = [];
        var defer = deps.defer || function (fn) { setTimeout(fn, 0); };
        function source() {
            var value = L.Storage && L.Storage.get('yani_native_default_source', 'yummyanime');
            return value === 'bwa' || value === 'ask' ? value : 'yummyanime';
        }
        function ceiling(card, progress) {
            var episodes = card && (card.yani_episodes || card.episodes) || {};
            return positive(episodes.aired || episodes.released) || positive(episodes.count || episodes.total) || positive(card && (card.episodes_aired || card.episodes_count)) || positive(progress && progress.episodes_aired);
        }
        function update(state) {
            if (!state.play) return;
            state.play.off('hover:enter').on('hover:enter', function () { route(state, false); });
            var card = state.movie.yani_card;
            var progress = card && deps.getPlayback ? deps.getPlayback(card) : null;
            state.play.find('span').text(actionState(progress, ceiling(card, progress), source()).label);
        }
        // Call after progress changes or returning focus to a full card.
        function refresh() { states.forEach(update); }
        function active(state) { return !L.Activity || !L.Activity.active || L.Activity.active() === state.owner; }
        function route(state, choose) {
            if (!active(state)) return;
            var selected = source(), found = false;
            if (selected === 'yummyanime') return deps.openPlayback(state.movie, choose ? {chooseEpisode: true} : {resume: true});
            if (selected === 'bwa') state.render.find('.buttons--container > .full-start__button').each(function () {
                var button = $(this);
                if (!found && button.text().trim() === 'BWA') { found = true; button.trigger('hover:enter'); }
            });
            if (!found) state.other.trigger('hover:enter');
        }
        function decorate(owner, movie, render) {
            if (!owner || !movie || !render) return;
            var existing = states.filter(function (s) { return s.owner === owner && s.render === render; })[0];
            if (existing) { update(existing); return; }
            var state = {owner: owner, movie: movie, render: render};
            states.push(state); if (states.length > 8) states.shift();
            defer(function () {
                var play = render.find('.button--play').first();
                if (!play.length || render.find('.yani-other-sources').length) return;
                state.play = play;
                // Native groupButtons binds Watch after full/complite. Clone its
                // completed handler here so the original source menu stays reachable.
                var other = play.clone(true).removeClass('button--play button--priority focus hover').addClass('yani-other-sources');
                state.other = other; other.find('span').text('Другие источники');
                // Keep native focus handlers, but gate the captured menu callback.
                var menu = other.clone(true);
                other.off('hover:enter').on('hover:enter', function () { if (active(state)) menu.trigger('hover:enter'); });
                var choose = play.clone(true).removeClass('button--play button--priority focus hover').addClass('yani-choose-episode');
                choose.find('span').text('Выбрать серию');
                choose.off('hover:enter').on('hover:enter', function () { route(state, true); });
                play.after(other); play.after(choose);
                play.off('hover:enter').on('hover:enter', function () { route(state, false); });
                render.find('.full-start-new__buttons').css('flex-wrap', 'wrap');
                update(state);
            });
            if (deps.resolveCard) Promise.resolve().then(function () { return movie.yani_card || deps.resolveCard(movie); }).then(function (card) {
                if (card) { movie.yani_card = card; update(state); }
            }).catch(function () { /* Native sources remain usable when mapping fails. */ });
        }
        if (L.SettingsApi && L.SettingsApi.addParam && !L.__yaniNativeCardActionsSettings) {
            L.__yaniNativeCardActionsSettings = true;
            L.SettingsApi.addParam({component: 'player', param: {name: 'yani_native_default_source', type: 'select', values: {yummyanime: 'YummyAnime', bwa: 'BWA', ask: 'Спрашивать'}, default: 'yummyanime'}, field: {name: 'Аниме: источник по умолчанию'}, onChange: refresh});
        }
        return {decorate: decorate, refresh: refresh};
    }
    window.LampaYaniNativeCardActions = {create: create, actionState: actionState};
}(window));
