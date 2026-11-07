const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(alloha) {
    const events = [], pending = [], opened = [], picked = [], dialogs = [], backs = [];
    let activity = {};
    const lampa = {Activity: {active: () => activity}, Loading: {
        start: (back, message) => { backs.push(back); events.push(message); }, stop: () => events.push('stop')
    }, Select: {show: options => dialogs.push(options), close: () => events.push('close')}};
    const window = {};
    vm.runInNewContext(fs.readFileSync('src/ui-playback-operation.js', 'utf8'), {window});
    const manager = window.LampaYaniPlaybackOperation.create({lampa});
    const resolve = () => new Promise((yes, no) => pending.push({yes, no}));
    const sandbox = {window, Lampa: lampa, beginPlaybackOperation: (message, options) => manager.begin(message, options),
        nativePlayback: {cancel() {}}, playbackLaunchGeneration: 0, playbackReturnState: {session: 1},
        videoData: {retain() {}}, ALLOHA_RESOLVED_SOURCES: [], videoSourceUrl: video => video.yani_stream_url || video.iframe_url,
        isAllohaUrl: () => false, isSibnetPlaybackSource: () => false, isExternalPlayableUrl: () => false,
        isVkPlaybackSource: () => false, isCvhPlaybackSource: () => false, t: key => key,
        setLoading: value => events.push(value), console: {warn() {}},
        LampaYaniStreamResolver: {canResolve: () => true, resolve}, resolveInOrder: resolve,
        launchResolvedVideo: (...args) => opened.push(args), chooseEpisode: (...args) => picked.push(args)};
    window.LampaYaniStreamResolver = sandbox.LampaYaniStreamResolver;
    const source = fs.readFileSync('src/ui.js', 'utf8');
    vm.runInNewContext(source.slice(source.indexOf('    function launchVideo('), source.indexOf('    function launchResolvedVideo(')), sandbox);
    vm.runInNewContext(source.slice(source.indexOf('    function launchAllohaDirect('), source.indexOf('    function launchAllohaPlayer(')), sandbox);
    const card = {yani_id: 42}, selected = {number: '3', iframe_url: 'https://provider/3'}, group = {videos: [selected]};
    const launch = () => alloha ? sandbox.launchAllohaDirect(card, group, selected, selected.iframe_url, [], {}) : sandbox.launchVideo(card, group, group.videos, selected);
    return {events, pending, opened, picked, dialogs, backs, launch, card, group, selected, navigate: () => { activity = {}; }};
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

for (const alloha of [false, true]) {
    test((alloha ? 'Alloha' : 'generic') + ' manual stream resolution cancels and suppresses late launch without explicit target', async () => {
        const s = setup(alloha); s.launch();
        assert.equal(typeof s.events[0], 'string', 'native loader has a phase label');
        assert.equal(s.backs.length, 1);
        s.backs[0](); s.pending[0].yes({url: 'https://media/video.mp4'}); await flush();
        assert.equal(s.opened.length, 0);
        assert.equal(s.selected.yani_stream_url, undefined);
    });
    test((alloha ? 'Alloha' : 'generic') + ' failures offer safe retry and same-episode source selection', async () => {
        const s = setup(alloha); s.launch();
        s.pending[0].no(new Error('https://private/stream?token=secret')); await flush();
        assert.equal(s.dialogs.length, 1);
        assert.ok(!JSON.stringify(s.dialogs[0]).includes('secret'));
        s.dialogs[0].onSelect(s.dialogs[0].items.find(item => item.action === 'retry'));
        assert.equal(s.pending.length, 2);
        s.pending[1].no(new Error('offline')); await flush();
        s.dialogs[1].onSelect(s.dialogs[1].items.find(item => item.action === 'alternate'));
        assert.equal(s.picked[0][0], s.card);
        assert.equal(s.picked[0][1], s.group);
        assert.equal(s.picked[0][2][0], s.selected);
        assert.equal(s.picked[0][3].chooseSource, true);
        assert.equal(s.picked[0][3].episode, s.selected);
    });
    test((alloha ? 'Alloha' : 'generic') + ' owner navigation suppresses late resolution', async () => {
        const s = setup(alloha); s.launch(); s.navigate();
        s.pending[0].yes({url: 'https://media/video.mp4'}); await flush();
        assert.equal(s.opened.length, 0);
    });
}
