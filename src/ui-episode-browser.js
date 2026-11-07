(function (window) {
    'use strict';

    function create(deps) {
        var memory = {};
        function open(card, group, videos, options) {
            card = card || {};
            group = group || {};
            options = options || {};
            videos = videos || [];
            var key = JSON.stringify([card.yani_id || card.id || '', group.title || group.voice || '', group.player || group.provider || '']);
            var state = memory[key] || (memory[key] = {});
            var value = deps.value || function (video) { return video.number; };
            var title = deps.title || function (unused, video) { return 'Серия ' + value(video); };
            var chunks = [], metadata = false;
            var restoreParent;
            function playback() { return deps.getPlayback ? deps.getPlayback(card.yani_id || card.id) : null; }
            function same(a, b) { return a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b); }
            function find(number) {
                for (var i = 0; i < videos.length; i++) if (same(value(videos[i]), number)) return i;
                return -1;
            }
            function meta(video) {
                var data = video.data || {};
                var arc = video.arc_title || video.arc_name || video.arc || data.arc_title || data.arc_name || data.arc;
                var season = video.season_title || video.season_name || video.season || data.season_title || data.season_name || data.season;
                if (arc && typeof arc !== 'object') return String(arc);
                if (season && typeof season !== 'object') return /^\d+$/.test(String(season)) ? 'Сезон ' + season : String(season);
                return '';
            }
            videos.forEach(function (video) { if (meta(video)) metadata = true; });
            videos.forEach(function (video, index) {
                var label = metadata ? meta(video) : '';
                var last = chunks[chunks.length - 1];
                if (!last || last.meta !== label || last.indices.length >= 25) {
                    last = {meta: label, indices: []};
                    chunks.push(last);
                }
                last.indices.push(index);
            });
            function rangeOf(index) {
                for (var i = 0; i < chunks.length; i++) if (chunks[i].indices.indexOf(index) >= 0) return i;
                return 0;
            }
            function rangeTitle(chunk) {
                var first = value(videos[chunk.indices[0]]), last = value(videos[chunk.indices[chunk.indices.length - 1]]);
                var neutral = 'Серии ' + (first === undefined || first === null || first === '' ? chunk.indices[0] + 1 : first) + '–' + (last === undefined || last === null || last === '' ? chunk.indices[chunk.indices.length - 1] + 1 : last);
                return chunk.meta ? chunk.meta + ' · ' + neutral : neutral;
            }
            function parentBack() { if (options.onBack) options.onBack(); return false; }
            function restore() {
                var latest = playback();
                if (latest && !same(latest.number, state.progress)) {
                    var current = find(latest.number);
                    if (current >= 0) { state.index = current; state.range = rangeOf(current); }
                    state.progress = latest.number;
                }
                showEpisodes(state.range || 0, restoreParent);
                return false;
            }
            function jump(back, parent) {
                deps.input({title: 'Перейти к серии', value: '', free: true, nosave: true, layout: 'nums', keyboard: 'lampa'}, function (number) {
                    var index = find(String(number === undefined || number === null ? '' : number).replace(',', '.').trim());
                    if (index >= 0) { state.index = index; state.range = rangeOf(index); showEpisodes(state.range, parent); }
                    else back();
                });
                return false;
            }
            function actions(items, ranges) {
                if (ranges) items.push({title: 'Диапазоны серий', action: 'ranges'});
                items.push({title: 'Перейти к серии…', action: 'jump'});
                if (options.onVoices) items.push({title: 'Выбрать озвучку', action: 'voices'});
                if (options.resettable && options.onReset) items.push({title: 'Сбросить прогресс серий', action: 'reset'});
            }
            function handle(item, back, parent) {
                if (item.action === 'jump') return jump(back, parent);
                if (item.action === 'voices') return options.onVoices();
                if (item.action === 'reset') return options.onReset(restore);
            }
            function showRanges(back) {
                var items = chunks.map(function (chunk, index) { return {title: rangeTitle(chunk), range: index}; });
                actions(items, false);
                deps.showSelect({title: metadata ? 'Сезоны и арки' : 'Диапазоны серий', items: items, selected: state.range || 0,
                    onBack: function () { back(); return false; },
                    onSelect: function (item) {
                        if (item.range !== undefined) {
                            state.range = item.range;
                            showEpisodes(item.range, function () { showRanges(back); });
                        } else handle(item, function () { showRanges(back); }, function () { showRanges(back); });
                    }});
            }
            function showEpisodes(range, back) {
                var indices = videos.length > 40 || metadata ? (chunks[range] ? chunks[range].indices : []) : videos.map(function (video, index) { return index; });
                var current = playback();
                var selected = 0;
                var items = indices.map(function (index, row) {
                    var video = videos[index], label = title(card, video);
                    var watched = video.watched || {};
                    var duration = Number(video.duration || watched.duration || 0);
                    var finished = current && current.finished_episodes && current.finished_episodes[String(value(video))] ||
                        watched.completed || watched.finished || duration > 0 && Number(watched.end_time || watched.time || 0) / duration >= 0.95;
                    if (finished && label.indexOf('✓') < 0) label = '✓ ' + label;
                    if (current && same(value(video), current.number) && label.indexOf('▶') < 0) label = '▶ ' + label;
                    if (index === state.index) selected = row;
                    return {title: label, video: video, episodeIndex: index, selected: index === state.index};
                });
                state.range = range;
                if (!items.length) items.push({title: 'Нет доступных серий', action: 'empty'});
                var controls = [];
                actions(controls, videos.length > 40 || metadata);
                selected += controls.length;
                items = controls.concat(items);
                var reopen = function () { showEpisodes(range, back); };
                deps.showSelect({title: 'Выбрать серию' + (group.title ? ' · ' + group.title : ''), items: items, selected: selected,
                    onBack: function () { if (back) back(); else parentBack(); return false; },
                    onSelect: function (item) {
                        if (item.video) {
                            state.index = item.episodeIndex;
                            restoreParent = back;
                            var saved = playback(); state.progress = saved && saved.number;
                            if (options.onSelect) options.onSelect(item.video, function () {
                                var result = restore();
                                return result;
                            });
                        } else if (item.action === 'ranges') showRanges(reopen);
                        else handle(item, reopen, back);
                    }});
            }
            var saved = playback(), current = saved ? find(saved.number) : -1;
            if (state.index === undefined || (saved && !same(saved.number, state.progress))) {
                state.index = current >= 0 ? current : 0;
                state.range = rangeOf(state.index);
            }
            state.progress = saved && saved.number;
            if (metadata && videos.length <= 40) showRanges(parentBack);
            else showEpisodes(state.range || 0);
        }
        return {open: open};
    }
    window.LampaYaniEpisodeBrowser = {create: create};
})(window);
