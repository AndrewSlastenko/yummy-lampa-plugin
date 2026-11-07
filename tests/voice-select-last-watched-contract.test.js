const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const menuSource = fs.readFileSync('src/ui-playback-menu.js', 'utf8');
const utilsSource = fs.readFileSync('src/ui-utils.js', 'utf8');
const uiSource = fs.readFileSync('src/ui.js', 'utf8');

assert.match(menuSource, /function lastWatchedVoice\(voices, card\)/);
assert.match(menuSource, /function markLastWatchedVoice\(voices, card\)/);
assert.match(menuSource, /selectedVoice >= 0 \? selectedVoice : 0/);
assert.match(menuSource, /last\.selected = true/);
assert.match(menuSource, /getPreferredVoice/);
assert.match(uiSource, /yani_last_voice/);

function createMenu(overrides) {
    const shown = [];
    const context = {
        Lampa: {
            Select: {show: function () {}},
            Controller: {toggle: function () {}, collectionSet: function () {}, collectionFocus: function () {}},
            Noty: {show: function () {}},
            Loading: {start: function () {}, stop: function () {}}
        },
        LampaYaniApi: {},
        LampaYaniAuth: {token: function () { return ''; }},
        document: {querySelector: function () { return overrides && overrides.testFocus || null; }, documentElement: {contains: function () { return Boolean(overrides && overrides.testFocus); }}},
        $: function () { return {length: 0, closest: function () { return {length: 0}; }}; },
        setTimeout: function (fn) { fn(); },
        console: console,
        URL: URL,
        Object: Object,
        Array: Array,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Math: Math,
        Date: Date,
        Promise: Promise,
        isFinite: isFinite,
        parseFloat: parseFloat,
        JSON: JSON
    };
    context.window = context;
    vm.runInNewContext(utilsSource + '\n' + fs.readFileSync('src/episode.js', 'utf8') + '\n' + fs.readFileSync('src/ui-episode-browser.js', 'utf8') + '\n' + menuSource, context);
    const deps = Object.assign({
        t: function (key) { return key; },
        showYummySelect: function (params) { shown.push(params); return true; },
        getPlayback: function () { return null; },
        loadVideos: function () { return Promise.resolve({response: []}); },
        playerMatchesPreference: function (group, preference) {
            return String(group && group.player || '').toLowerCase().indexOf(String(preference || '').toLowerCase()) >= 0;
        }
    }, overrides || {});
    return {api: context.window.LampaYaniPlaybackMenu.create(deps), shown: shown};
}

(async function () {
    const videos = [
        {number: '1', video_id: 'a1', iframe_url: 'https://media.example/a1', data: {dubbing: 'Studio Band', player: 'Kodik'}},
        {number: '10', video_id: 'a10', iframe_url: 'https://media.example/a10', data: {dubbing: 'Studio Band', player: 'Kodik'}},
        {number: '1', video_id: 'b1', iframe_url: 'https://media.example/b1', data: {dubbing: 'AniLibria', player: 'Kodik'}},
        {number: '10', video_id: 'b10', iframe_url: 'https://media.example/b10', data: {dubbing: 'AniLibria', player: 'Kodik'}}
    ];

    const withHistory = createMenu({
        getPlayback: function () {
            return {number: '10', video_id: 'b10', voice: 'AniLibria', player: 'kodik'};
        },
        loadVideos: function () { return Promise.resolve({response: videos}); }
    });
    withHistory.api.openVideos({yani_id: 42, title: 'Test'});
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(withHistory.shown.length, 1, 'the voice picker must open when several dubbings exist');
    const items = withHistory.shown[0].items;
    const selected = items.filter(function (item) { return item.selected; });
    assert.strictEqual(selected.length, 1);
    assert.ok(selected[0].group.title.indexOf('AniLibria') >= 0, 'the last-watched dubbing must be selected');
    assert.ok(String(selected[0].title).indexOf('▶ ') === 0);
    assert.strictEqual(withHistory.shown[0].selected, items.indexOf(selected[0]));

    const byName = createMenu({
        getPlayback: function () {
            return {number: '10', voice: 'Studio Band', player: 'kodik'};
        },
        loadVideos: function () { return Promise.resolve({response: videos}); }
    });
    byName.api.openVideos({yani_id: 42, title: 'Test'});
    await Promise.resolve();
    await Promise.resolve();
    const named = byName.shown[0].items.filter(function (item) { return item.selected; })[0];
    assert.ok(named.group.title.indexOf('Studio Band') >= 0, 'a saved voice name must select that dubbing when video_id is missing');

    const fresh = createMenu({
        getPlayback: function () { return null; },
        loadVideos: function () { return Promise.resolve({response: videos}); }
    });
    fresh.api.openVideos({yani_id: 42, title: 'Test'});
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(fresh.shown[0].items.filter(function (item) { return item.selected; }).length, 0,
        'without playback history the picker must not preselect a dubbing');

    const launched = [];
    const exact = createMenu({
        getPlayback: () => ({number: '10', voice: 'Studio Band', player: 'kodik'}),
        loadVideos: () => Promise.resolve({response: videos}),
        launchVideo: (card, group, playlist, video) => launched.push({group, video})
    });
    exact.api.openVideos({yani_id: 42}, {resume: true});
    await Promise.resolve(); await Promise.resolve();
    assert.strictEqual(launched[0].group.title, 'Studio Band', 'resume matches the saved voice as well as provider');
    const missing = createMenu({
        getPlayback: () => ({number: '10', voice: 'Deleted Voice', player: 'kodik'}),
        loadVideos: () => Promise.resolve({response: videos.slice(0, 2)}),
        launchVideo: () => { throw new Error('must not silently resume another voice'); }
    });
    missing.api.openVideos({yani_id: 42}, {resume: true});
    await Promise.resolve(); await Promise.resolve();
    assert.strictEqual(missing.shown[0].title, 'choose_voice', 'missing saved voice requires explicit choice even with one remaining voice');
    const episodes = createMenu({testFocus: {}, loadVideos: () => Promise.resolve({response: videos.slice(0, 2)}), launchVideo: () => {}});
    episodes.api.openVideos({yani_id: 42}, {chooseEpisode: true});
    await Promise.resolve(); await Promise.resolve();
    assert.ok(episodes.shown[0].items.some(row => row.action === 'jump'), 'episode browser is integrated');
    episodes.shown[0].onSelect(episodes.shown[0].items.find(row => row.video));
    assert.strictEqual(typeof episodes.api.playbackReturnState.reopen, 'function');
    episodes.api.restorePlaybackInteraction();
    assert.ok(episodes.shown.length >= 2, 'player return reopens the episode browser');
    assert.strictEqual(episodes.api.playbackReturnState.active, true, 'episode return retains the original card navigation until root Back');
    assert.strictEqual(episodes.shown[episodes.shown.length - 1].onBack(), false);
    assert.strictEqual(episodes.api.playbackReturnState.active, false, 'player → episode list → Back restores the original card');
    const chooseSaved = createMenu({
        getPlayback: () => ({number: '10', voice: 'Studio Band', player: 'kodik'}),
        loadVideos: () => Promise.resolve({response: videos})
    });
    chooseSaved.api.openVideos({yani_id: 42}, {chooseEpisode: true});
    await Promise.resolve(); await Promise.resolve();
    assert.ok(chooseSaved.shown[0].items.some(row => row.video), 'choose episodes directly opens the saved exact voice');
    const alternateLaunches = [];
    const alternate = createMenu({loadVideos: () => Promise.resolve({response: videos}), launchVideo: (card, group, list, video) => alternateLaunches.push(video.number)});
    alternate.api.chooseEpisode({yani_id: 42}, {videos: videos.slice(0, 2)}, videos, {chooseSource: true, episode: videos[1]});
    await Promise.resolve(); await Promise.resolve();
    assert.strictEqual(alternate.shown[0].title, 'choose_voice');
    alternate.shown[0].onSelect(alternate.shown[0].items[0]);
    assert.deepStrictEqual(alternateLaunches, ['10'], 'explicit alternate source keeps the chosen episode');
    const nextLaunches = [];
    const completed = createMenu({
        getPlayback: () => ({number: '1', voice: 'Studio Band', player: 'kodik', finished_episodes: {'1': true}}),
        loadVideos: () => Promise.resolve({response: videos}),
        launchVideo: (card, group, list, video) => nextLaunches.push(video.number)
    });
    completed.api.openVideos({yani_id: 42}, true);
    await Promise.resolve(); await Promise.resolve();
    assert.deepStrictEqual(nextLaunches, ['10'], 'completed resume advances only to a verified available episode');
    const final = createMenu({
        getPlayback: () => ({number: '10', voice: 'Studio Band', player: 'kodik', finished_episodes: {'10': true}}),
        loadVideos: () => Promise.resolve({response: videos}),
        launchVideo: () => { throw new Error('completed final episode must not resume'); }
    });
    final.api.openVideos({yani_id: 42}, true);
    await Promise.resolve(); await Promise.resolve();
    assert.ok(final.shown[0].items.some(row => row.video), 'completed final episode opens episode selection');
    let canceled = false, finishCalls = 0;
    const cancel = createMenu({
        loadVideos: () => Promise.resolve({response: videos}),
        beginOperation: () => ({current: () => !canceled, finish: () => {finishCalls++; return !canceled;}})
    });
    cancel.api.openVideos({yani_id: 42}); canceled = true;
    await Promise.resolve(); await Promise.resolve();
    assert.strictEqual(cancel.shown.length, 0, 'late video payload is ignored after cancellation');
    let parentCalls = 0;
    const back = createMenu();
    back.api.showPlaybackSelect({onBack: () => {parentCalls++; return false;}, items: []});
    assert.strictEqual(back.shown[0].onBack(), false, 'child Back false consumes root focus restoration');
    assert.strictEqual(parentCalls, 1);

    console.log('voice select last watched contract tests passed');
})().catch(function (error) {
    console.error(error);
    process.exit(1);
});
