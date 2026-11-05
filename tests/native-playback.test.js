const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(enabled = true) {
    const window = {};
    const file = 'src/ui-native-playback.js';
    if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), {window, isFinite, Object, String, Number, Math});
    assert.equal(typeof window.LampaYaniNativePlayback?.create, 'function', 'native playback adapter must exist');
    const queue = [], roads = {}, progress = [], advanced = [], events = [], followers=[];
    const selected = {number:'1',video_id:11,duration:1200,watched:{end_time:108},data:{dubbing:'Voice A'}};
    const context = {card:{yani_id:42},group:{player:'kodik'},videos:[selected,{number:'2',video_id:12}],selected};
    let current = context, active = true, navigation = 1;
    const api = window.LampaYaniNativePlayback.create({
        timeline:{view:hash=>roads[hash] || {hash,time:0,duration:0,percent:0},
            update:r=>{roads[r.hash]=r;followers.forEach(f=>f({data:{hash:r.hash,road:r}}));},
            listener:{follow:(event,fn)=>followers.push(fn)}},
        number:v=>v.number, voice:c=>c.selected.data.dubbing,
        isCurrent:(c,token)=>c===current && active && (token === undefined || token === navigation), enabled:()=>enabled,
        progress:(c,time,duration,finished)=>progress.push({c,time,duration,finished}),
        beforeAdvance:()=>{events.push('before');return navigation;}, advance:c=>advanced.push(c),
        defer:fn=>queue.push(fn)
    });
    const item = {url:'https://example/one.m3u8',title:'Example · Серия 1',time:108,headers:{Referer:'https://example/'},quality:{'1080p':'https://example/one.m3u8'}};
    return {api,context,item,roads,queue,progress,advanced,events,followers,
        flush:()=>{while(queue.length)queue.shift()();},setCurrent:c=>current=c,leave:()=>active=false,navigate:()=>navigation++};
}

test('native progress resumes and preserves source metadata without mutating caller data',()=>{
    const s=setup(), before=JSON.stringify(s.item), out=s.api.prepare(s.context,s.item);
    assert.equal(JSON.stringify(s.item),before);
    assert.equal(out.timeline.time,108);assert.equal(out.timeline.duration,1200);
    assert.equal(s.roads[out.timeline.hash].time,108);
    assert.deepEqual(out.headers,s.item.headers);assert.deepEqual(out.quality,s.item.quality);
    out.timeline.handler(20,240,1200);
    assert.equal(s.progress[0].time,240);assert.equal(s.progress[0].finished,false);
    assert.equal(s.roads[out.timeline.hash].time,240);assert.equal(s.advanced.length,0);
});

test('actual Android Timeline.update completion advances once without a timeCall callback',()=>{
    const s=setup(),out=s.api.prepare(s.context,s.item);
    assert.equal(s.followers.length,1,'one listener for the native wrapper result path');
    s.followers[0]({data:{hash:String(out.timeline.hash),road:{time:0,duration:0,percent:100}}});
    s.flush();assert.equal(s.progress.length,1);assert.equal(s.progress[0].finished,true);
    assert.equal(s.advanced.length,1);
});

test('the serialized native playlist retains its current timeline identity',()=>{
    const source=fs.readFileSync('src/ui.js','utf8');
    const fragment=source.slice(source.indexOf('    function openExternalVideo('),source.indexOf('    function openExternalUri('));
    let sent;
    const Lampa={Activity:{active:()=>({})},Android:{openPlayer:(url,data)=>sent=JSON.parse(JSON.stringify(data))}};
    const sandbox={Lampa,window:{Lampa},nativePlaybackActivity:null,
        LampaYaniUiUtils:{normalizeVideoUrl:x=>x},cleanPlaybackTitle:x=>x,prepareExternalRestore(){},
        tryExternalOpen:(name,fn)=>fn()};
    vm.runInNewContext(fragment,sandbox);
    const timeline={hash:12345,time:0,duration:1200,percent:0,handler(){}};
    assert.equal(sandbox.openExternalVideo('https://cdn/2.mp4','Series2',{
        timeline,playlist:[{url:'https://cdn/2.mp4',title:'Series2',timeline}]}),true);
    assert.equal(sent.timeline.hash,12345);assert.equal(sent.playlist[0].timeline?.hash,12345);
});
test('real completion records finished progress before exactly one deferred advance',()=>{
    const s=setup(),out=s.api.prepare(s.context,s.item);
    out.timeline.handler(100,0,0);out.timeline.handler(100,0,0);
    assert.equal(s.progress.length,1);assert.equal(s.progress[0].time,1200);
    assert.equal(s.progress[0].finished,true);assert.equal(s.advanced.length,0);
    s.flush();assert.equal(s.advanced.length,1);assert.equal(s.advanced[0],s.context);
});
test('Back near the end never advances, including a rounded 100 percent',()=>{
    for(const values of [[99,1199,1200],[100,1200,1200],[0,0,0]]){
        const s=setup(),out=s.api.prepare(s.context,s.item);out.timeline.handler(...values);s.flush();
        assert.equal(s.advanced.length,0);assert.notEqual(s.progress[0]?.finished,true);
    }
});
test('disabled auto-next still persists completion',()=>{
    const s=setup(false),out=s.api.prepare(s.context,s.item);out.timeline.handler(100,0,0);s.flush();
    assert.equal(s.progress[0].finished,true);assert.equal(s.advanced.length,0);
});
test('a newer launch or navigation invalidates a queued completion',()=>{
    for(const cancel of [s=>s.api.cancel(),s=>s.leave(),s=>s.setCurrent({}),s=>s.navigate()]){
        const s=setup(),out=s.api.prepare(s.context,s.item);out.timeline.handler(100,0,0);cancel(s);s.flush();
        assert.equal(s.advanced.length,0);
    }
});

test('unknown-duration native completion is not offered again by Continue Watching after reload',()=>{
    const window={LampaYani:{}};
    vm.runInNewContext(fs.readFileSync('src/ui-home-sections.js','utf8'),{window});
    const entry=JSON.parse(JSON.stringify({anime_id:42,number:'2',video_id:12,time:0,duration:0,finished_episodes:{'2':true}}));
    assert.equal(window.LampaYaniHomeSections.isContinueEntry(entry),false);
    entry.number='3';entry.video_id=13;
    assert.equal(window.LampaYaniHomeSections.isContinueEntry(entry),true);
});
test('late reports cannot change a newer session history',()=>{
    const s=setup(),out=s.api.prepare(s.context,s.item);
    s.api.prepare(s.context,{...s.item,url:'https://example/new-token'});
    out.timeline.handler(50,600,1200);out.timeline.handler(100,0,0);s.flush();
    assert.equal(s.progress.length,0);assert.equal(s.advanced.length,0);
});
test('native results identify a launch while progress survives signed URL changes',()=>{
    const s=setup(),first=s.api.prepare(s.context,s.item);
    first.timeline.handler(20,240,1200);
    const stable=Object.keys(s.roads).filter(k=>k!==String(first.timeline.hash))[0];
    assert.ok(stable,'a separate durable progress identity is stored');
    assert.equal(s.roads[stable].time,240);
    const second=s.api.prepare(s.context,{...s.item,url:'https://other/token',time:240});
    assert.notEqual(second.timeline.hash,first.timeline.hash);
    assert.equal(second.timeline.time,240);assert.equal(s.roads[stable].time,240);
    // The Android wrapper can deliver an old result after the same episode was reopened.
    s.followers[0]({data:{hash:String(first.timeline.hash),road:{time:0,duration:0,percent:100}}});
    s.flush();assert.equal(s.advanced.length,0);assert.equal(s.progress.length,1);
    s.followers[0]({data:{hash:String(second.timeline.hash),road:{time:0,duration:0,percent:100}}});
    s.flush();assert.equal(s.advanced.length,1);assert.equal(s.roads[stable].percent,100);
    s.context.selected.data.dubbing='Voice B';
    s.api.prepare(s.context,s.item).timeline.handler(30,360,1200);
    assert.equal(s.roads[stable].percent,100,'another voice has separate progress');
    s.context.selected.data.dubbing='Voice A';s.context.selected.number='2';
    s.api.prepare(s.context,s.item).timeline.handler(40,480,1200);
    assert.equal(s.roads[stable].percent,100,'another episode has separate progress');
});

test('unknown duration completion remains explicit without inventing a duration',()=>{
    const s=setup();s.context.selected.duration=0;
    s.api.prepare(s.context,s.item).timeline.handler(100,0,0);s.flush();
    assert.equal(s.progress[0].time,0);assert.equal(s.progress[0].duration,0);
    assert.equal(s.progress[0].finished,true);assert.equal(s.advanced.length,1);
});
test('invalid native data does not corrupt progress or advance',()=>{
    for(const args of [[100,-1,100],[100,Infinity,0],[NaN,0,0],[1,0,-1]]){
        const s=setup();s.api.prepare(s.context,s.item).timeline.handler(...args);s.flush();
        assert.equal(s.progress.length,0);assert.equal(s.advanced.length,0);
    }
});
test('unsupported caller payload passes through unchanged',()=>{
    const s=setup();assert.equal(s.api.prepare(null,s.item),s.item);
});

test('anime identifiers reach Home AFR without changing media query or existing fragment',()=>{
    const s=setup();s.context.card.yani_remote_ids={mal_id:1535};
    assert.equal(s.api.mediaUrl(s.context,'https://cdn/video?token=a#chapter=2','op_ed'),
        'https://cdn/video?token=a#chapter=2&homeafr_anime=1535:1:3');
    assert.equal(s.api.mediaUrl(s.context,'https://cdn/video','ed'),'https://cdn/video#homeafr_anime=1535:1:2');
    assert.equal(s.api.mediaUrl(s.context,'https://cdn/video','off'),'https://cdn/video');
    assert.equal(s.api.mediaUrl(s.context,'https://cdn/video','suggest'),'https://cdn/video');
    s.context.selected.number='1.5';
    assert.equal(s.api.mediaUrl(s.context,'https://cdn/video','op'),'https://cdn/video');
});

test('automatic external continuation keeps the Android player, internal continuation stays internal',()=>{
    const window={LampaYani:{},Lampa:{},LampaYaniUiUtils:{}};
    const sandbox={window,Lampa:window.Lampa,LampaYaniUiUtils:window.LampaYaniUiUtils,console};
    vm.runInNewContext(fs.readFileSync('src/ui-playback-menu.js','utf8'),sandbox);
    const calls=[];
    const menu=window.LampaYaniPlaybackMenu.create({
        t:x=>x,playbackTargetPreference:()=> 'ask',androidExternalPlayerAvailable:()=>true,
        openExternalPlayer:()=>{calls.push('external');return true;},playInternalPlayer:()=>{calls.push('internal');return true;}
    });
    menu.showDirectPlaybackOptions({}, {}, [], {autoAdvance:true,playbackTarget:'external'});
    assert.deepEqual(calls,['external']);
    calls.length=0;menu.showDirectPlaybackOptions({}, {}, [], {autoAdvance:true});
    assert.deepEqual(calls,['internal']);
});

test('an older resolver cannot open its episode after a newer launch has started',async()=>{
    const source=fs.readFileSync('src/ui.js','utf8');
    const fragment=source.slice(source.indexOf('    function launchVideo('),source.indexOf('    function launchResolvedVideo('));
    const pending=[],opened=[];
    const sandbox={nativePlayback:{cancel(){}},playbackLaunchGeneration:0,playbackReturnState:{session:1},ALLOHA_RESOLVED_SOURCES:[],videoData:{retain(){}},
        videoSourceUrl:v=>v.iframe_url,isAllohaUrl:()=>false,isSibnetPlaybackSource:()=>false,
        isExternalPlayableUrl:()=>false,setLoading(){},console,
        LampaYaniStreamResolver:{canResolve:()=>true,resolve:()=>new Promise(resolve=>pending.push(resolve))},
        launchResolvedVideo:(...args)=>opened.push(args)};
    sandbox.window={LampaYaniStreamResolver:sandbox.LampaYaniStreamResolver};
    vm.runInNewContext(fragment,sandbox);
    const first={number:'2',iframe_url:'https://provider/2'},second={number:'7',iframe_url:'https://provider/7'};
    sandbox.launchVideo({yani_id:42},{},[first],first,{playbackTarget:'external'});
    sandbox.launchVideo({yani_id:42},{},[second],second,{playbackTarget:'external'});
    pending[0]({url:'https://media/2.mp4'});await Promise.resolve();await Promise.resolve();
    assert.equal(opened.length,0,'the stale resolution must be ignored');
    pending[1]({url:'https://media/7.mp4'});await Promise.resolve();await Promise.resolve();
    assert.equal(opened.length,1);assert.equal(opened[0][3],second);
});

test('abandoned automatic resolution never owns the global loading overlay',async()=>{
    const source=fs.readFileSync('src/ui.js','utf8');
    const fragment=source.slice(source.indexOf('    function launchVideo('),source.indexOf('    function launchResolvedVideo('));
    const loads=[],opened=[];let resolve;
    const navigation={session:1};
    const sandbox={nativePlayback:{cancel(){}},playbackLaunchGeneration:0,playbackReturnState:navigation,
        ALLOHA_RESOLVED_SOURCES:[],videoData:{retain(){}},videoSourceUrl:v=>v.iframe_url,
        isAllohaUrl:()=>false,isSibnetPlaybackSource:()=>false,isExternalPlayableUrl:()=>false,
        setLoading:state=>loads.push(state),console,
        LampaYaniStreamResolver:{canResolve:()=>true,resolve:()=>new Promise(r=>resolve=r)},
        launchResolvedVideo:(...args)=>opened.push(args)};
    sandbox.window={LampaYaniStreamResolver:sandbox.LampaYaniStreamResolver};
    vm.runInNewContext(fragment,sandbox);
    sandbox.launchVideo({yani_id:42},{},[],{iframe_url:'https://provider/2'},{playbackTarget:'external'});
    navigation.session=2;resolve({url:'https://media/2.mp4'});await Promise.resolve();await Promise.resolve();
    assert.deepEqual(loads,[]);assert.deepEqual(opened,[]);
});

test('stale Alloha errors cannot open an embedded fallback or touch navigation',async()=>{
    const source=fs.readFileSync('src/ui.js','utf8');
    const fragment=source.slice(source.indexOf('    function launchAllohaDirect('),source.indexOf('    function launchAllohaPlayer('));
    const effects=[];let reject,current=true;
    const sandbox={resolveInOrder:()=>new Promise((a,b)=>reject=b),setLoading:x=>effects.push('loading'),
        blockAllohaPlayback:()=>effects.push('fallback'),chooseEpisode:()=>effects.push('picker'),
        Lampa:{Noty:{show:()=>effects.push('notice')}},t:x=>x,console};
    vm.runInNewContext(fragment,sandbox);
    sandbox.launchAllohaDirect({}, {videos:[]}, {}, 'https://alloha/2', [],{playbackTarget:'external',isCurrent:()=>current});
    current=false;reject(new Error('offline'));await Promise.resolve();await Promise.resolve();
    assert.deepEqual(effects,[]);
});


test('end of the native voice group returns to its episode picker without launching another source',()=>{
    const source=fs.readFileSync('src/ui.js','utf8');
    const fragment=source.slice(source.indexOf('    var nativePlayback ='),source.indexOf('    var playbackWatcher ='));
    const context={card:{yani_id:42},group:{player:'kodik'},videos:[{number:'37'}]};
    const picked=[],launched=[];let deps;
    const sandbox={LampaYaniNativePlayback:{create:d=>{deps=d;return {}; }},
        Lampa:{Timeline:{},Noty:{show(){}},Activity:{active:()=>null}},
        autoNextEnabled:()=>true,nextEpisodeVideo:()=>null,autoNextEndMessage:()=> 'last',
        chooseEpisode:(...a)=>picked.push(a),launchVideo:(...a)=>launched.push(a)};
    vm.runInNewContext(fragment,sandbox);deps.advance(context);
    assert.deepEqual(picked,[[context.card,context.group,context.videos]]);
    assert.equal(launched.length,0);
});

test('unavailable automatic native stream returns to the same source picker',async()=>{
    const source=fs.readFileSync('src/ui.js','utf8');
    const fragment=source.slice(source.indexOf('    function launchAllohaDirect('),source.indexOf('    function launchAllohaPlayer('));
    const picked=[],fallback=[];let reject;
    const context={card:{yani_id:42},group:{videos:[{number:'2'}]}};
    const sandbox={resolveInOrder:()=>new Promise((a,b)=>reject=b),setLoading(){},console:{warn(){}},
        chooseEpisode:(...a)=>picked.push(a),blockAllohaPlayback:()=>fallback.push(true),
        Lampa:{Noty:{show(){}}},t:x=>x};
    vm.runInNewContext(fragment,sandbox);
    sandbox.launchAllohaDirect(context.card,context.group,context.group.videos[0],'https://provider/2',[],
        {playbackTarget:'external',autoAdvance:true,isCurrent:()=>true});
    reject(new Error('unavailable'));await Promise.resolve();await Promise.resolve();
    assert.deepEqual(picked,[[context.card,context.group,context.group.videos]]);assert.deepEqual(fallback,[]);
});
