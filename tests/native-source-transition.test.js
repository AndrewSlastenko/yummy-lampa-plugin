const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/ui.js', 'utf8');
const events = [];
let returning = true, pending = true;
const render = {find(selector) { assert.equal(selector, '.yani-other-sources'); return {trigger(event) {
    assert.equal(event, 'hover:enter');
    assert.equal(returning, false, 'pending root restoration must be invalidated before opening Select');
    assert.equal(pending, false); events.push('sources');
}}; }};
const owner = {activity: {render: () => render}};
const context = {Lampa: {Activity: {active: () => owner}, Controller: {toggle: name => events.push(name)}},
    cancelExternalRestore() { pending = false; }, clearPlaybackReturn() { returning = false; },
    restorePlaybackInteraction() { throw new Error('a delayed root restore would steal Select focus'); }};
vm.runInNewContext(source.slice(source.indexOf('    function openNativeSourceChoices('), source.indexOf('    function openYummyForMovie(')), context);
context.openNativeSourceChoices();
assert.deepEqual(events, ['content', 'sources']);
console.log('native source transition tests passed');
