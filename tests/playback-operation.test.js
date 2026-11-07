const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const file = path.join(__dirname, '../src/ui-playback-operation.js');
assert.ok(fs.existsSync(file), 'playback operation module exists');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);

for (const action of ['finish', 'fail', 'cancel']) {
    let activity = {}, controller = 'owner-a', captured;
    const lampa = {
        Activity: {active: () => activity},
        Controller: {enabled: () => ({name: controller}), toggle: name => { controller = name; }},
        Loading: {start: () => { captured = controller; controller = 'loading'; }, stop: () => { controller = captured; }}
    };
    const manager = context.window.LampaYaniPlaybackOperation.create({lampa});
    const op = manager.begin('Видео');
    activity = {};
    controller = 'owner-b';
    op[action]();
    assert.strictEqual(controller, 'owner-b', action + ' preserves current activity controller after stale native Loading.stop');
}

function setup() {
    let owner = {};
    const events = [];
    const starts = [];
    const dialogs = [];
    const lampa = {
        Activity: {active: () => owner},
        Loading: {
            start: (back, message) => { starts.push({back, message}); events.push('start'); },
            stop: () => events.push('stop')
        },
        Select: {
            show: (options) => { dialogs.push(options); events.push('show'); },
            close: () => events.push('close')
        }
    };
    const manager = context.window.LampaYaniPlaybackOperation.create({lampa, onCancel: () => events.push('default cancel')});
    return {manager, events, starts, dialogs, lampa, changeOwner: () => { owner = {}; }};
}

{
    const s = setup();
    const op = s.manager.begin('Загрузка серий');
    assert.strictEqual(s.starts[0].message, 'Загрузка серий');
    assert.strictEqual(op.current(), true);
    assert.strictEqual(op.finish(), true);
    assert.strictEqual(op.current(), false);
    assert.strictEqual(op.finish(), false);
    op.cancel();
    assert.deepStrictEqual(s.events, ['start', 'stop']);
}
{
    const s = setup();
    const op = s.manager.begin('Загрузка', {onCancel: () => s.events.push('return')});
    s.starts[0].back();
    s.starts[0].back();
    assert.strictEqual(op.current(), false, 'Back invalidates late callbacks');
    assert.strictEqual(op.finish(), false);
    assert.strictEqual(op.fail({message: 'Ошибка'}), false);
    assert.deepStrictEqual(s.events, ['start', 'stop', 'return']);
}
{
    const s = setup();
    const old = s.manager.begin('Каталог');
    const next = s.manager.begin('Видео');
    const before = s.events.slice();
    old.cancel();
    old.finish();
    old.fail({message: 'Ошибка'});
    s.starts[0].back();
    assert.deepStrictEqual(s.events, before, 'old callbacks cannot stop new loader or return to old UI');
    assert.strictEqual(next.current(), true);
    next.cancel();
    assert.strictEqual(s.events[s.events.length - 1], 'default cancel');
}
{
    const s = setup();
    const op = s.manager.begin('Видео');
    s.changeOwner();
    assert.strictEqual(op.current(), false);
    assert.strictEqual(op.finish(), false, 'owner navigation prevents launch');
    op.cancel();
    assert.ok(!s.events.includes('default cancel'));
    assert.strictEqual(s.dialogs.length, 0);
}
{
    const s = setup();
    let retries = 0;
    let alternatives = 0;
    const op = s.manager.begin('Видео');
    assert.strictEqual(op.fail({message: 'Не удалось загрузить видео', retry: () => { retries++; }, alternate: () => { alternatives++; }}), true);
    assert.strictEqual(op.current(), false);
    const dialog = s.dialogs[0];
    assert.deepStrictEqual(Array.from(dialog.items, (item) => item.title), ['Повторить', 'Выбрать другой источник']);
    assert.strictEqual(s.events.indexOf('stop') < s.events.indexOf('show'), true);
    dialog.onSelect(dialog.items[0]);
    assert.strictEqual(retries, 1);
    assert.strictEqual(s.events[s.events.length - 1], 'close');
    dialog.onSelect(dialog.items[1]);
    assert.strictEqual(alternatives, 0, 'a dialog action is consumed once');
}
{
    const s = setup();
    let alternatives = 0;
    s.manager.begin('Видео').fail({alternate: () => { alternatives++; }});
    const dialog = s.dialogs[0];
    dialog.onSelect(dialog.items[0]);
    assert.strictEqual(alternatives, 1);
}
{
    const s = setup();
    s.manager.begin('Видео').fail({retry: () => s.events.push('retry')});
    const dialog = s.dialogs[0];
    dialog.onBack();
    dialog.onBack();
    assert.deepStrictEqual(s.events, ['start', 'stop', 'show', 'close', 'default cancel']);
}
for (const navigation of ['owner', 'new request']) {
    const s = setup();
    s.manager.begin('Видео').fail({retry: () => s.events.push('retry')});
    const dialog = s.dialogs[0];
    if (navigation === 'owner') s.changeOwner();
    else s.manager.begin('Новый запрос');
    const before = s.events.slice();
    dialog.onSelect(dialog.items[0]);
    dialog.onBack();
    assert.deepStrictEqual(s.events, before, navigation + ' invalidates error dialog callbacks');
}
{
    const s = setup();
    const op = s.manager.begin('Видео');
    s.changeOwner();
    assert.strictEqual(op.fail({retry: () => {}}), false);
    assert.strictEqual(s.dialogs.length, 0, 'late failures after navigation never show a dialog');
}
{
    const s = setup();
    s.manager.begin('Видео').fail({retry: () => s.events.push('retry')});
    s.lampa.Select.close = s.changeOwner;
    s.dialogs[0].onSelect(s.dialogs[0].items[0]);
    assert.ok(!s.events.includes('retry'), 'closing a dialog may navigate away synchronously');
}
{
    const s = setup();
    s.manager.begin('Видео').fail({retry: () => {}});
    s.lampa.Select.close = s.changeOwner;
    s.dialogs[0].onBack();
    assert.ok(!s.events.includes('default cancel'), 'Back must not restore old UI after close navigates away');
}
for (const action of ['retry', 'back']) {
    const s = setup();
    s.manager.begin('Видео').fail({retry: () => s.events.push('retry')});
    const dialog = s.dialogs[0];
    s.lampa.Select.close = () => { s.events.push('close'); dialog.onBack(); };
    if (action === 'retry') dialog.onSelect(dialog.items[0]);
    else dialog.onBack();
    assert.deepStrictEqual(s.events, ['start', 'stop', 'show', 'close', action === 'retry' ? 'retry' : 'default cancel'], 'recursive Select.onBack is consumed once');
}
{
    const s = setup();
    const secret = 'https://private.example/stream?token=secret';
    s.manager.begin('Видео').fail({error: new Error(secret), title: secret, retry: () => {}});
    const dialog = s.dialogs[0];
    assert.ok(!JSON.stringify(dialog).includes(secret), 'only safe explicit message may be rendered');
    assert.ok(dialog.title);
    assert.strictEqual(dialog.items.length, 1);
}

console.log('Playback operation tests passed');
