const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/ui.js', 'utf8');
let owner = {}, queue = [], restored = [];
const root = {}, snapshot = {controller:'content', element:root, collection:root, reopen() {}};
const playback = {nativeReturn:{snapshot,session:3,owner}};
const state = {active:false,session:3};
const context = {Lampa:{Activity:{active:()=>owner}}, playbackContext:playback, playbackReturnState:state,
    cancelExternalRestore(){}, setTimeout(fn){queue.push(fn);}, restorePlaybackInteraction(s){restored.push(s);}};
vm.runInNewContext(source.slice(source.indexOf('    function restoreNativePlaybackReturn('), source.indexOf('    var nativePlayback =')), context);
context.restoreNativePlaybackReturn(playback);
assert.equal(restored.length,0,'native Activity resume must settle first');
queue.shift()();
assert.equal(restored[0],snapshot);assert.equal(state.active,true);assert.equal(state.element,root);
context.restoreNativePlaybackReturn(playback);owner={};queue.shift()();assert.equal(restored.length,1,'a late native result cannot reopen a departed card');
owner=playback.nativeReturn.owner;context.restoreNativePlaybackReturn(playback);state.session++;queue.shift()();assert.equal(restored.length,1,'a newer launch owns navigation');
console.log('native return lifecycle tests passed');
