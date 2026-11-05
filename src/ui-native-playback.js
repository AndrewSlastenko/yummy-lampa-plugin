(function (window) {
    'use strict';

    function finite(value) { return typeof value === 'number' && isFinite(value); }
    // Keep the existing Anime Progress extension's timeline identity.
    function timelineHash(id, number, videoId, voice) {
        var key = 'home-yani-progress|' + id + '|' + number + '|' + (videoId || '') + '|' + (voice || '');
        var hash = 0;
        for (var i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
        return (hash & 0x7fffffff) || 1;
    }

    function create(deps) {
        var generation = 0;
        function cancel() { generation += 1; }
        function prepare(context, current) {
            cancel();
            if (!context || !context.card || !context.card.yani_id || !context.selected ||
                !deps.timeline || !deps.timeline.view || !deps.timeline.update) return current;
            var session = generation, returned = false;
            var selected = context.selected;
            var hash = timelineHash(context.card.yani_id, deps.number(selected), selected.video_id, deps.voice(context));
            var time = Math.max(0, Number(current.time) || 0);
            var duration = Math.max(0, Number(selected.duration) || 0);
            deps.timeline.update({hash:hash,time:time,duration:duration,percent:duration ? time / duration * 100 : 0});
            var out = Object.assign({}, current);
            out.timeline = Object.assign({}, deps.timeline.view(hash), {
                hash:hash,
                handler:function (percent, position, length) {
                    if (returned || generation !== session || !deps.isCurrent(context)) return;
                    if (!finite(percent) || !finite(position) || !finite(length) || position < 0 || length < 0) return;
                    returned = true;
                    // Lampa's native wrapper maps playback_completion to this
                    // sentinel; an ordinary Back can also round to 100 percent.
                    var finished = percent === 100 && position === 0 && length === 0;
                    if (!finished && length === 0 && position === 0) return;
                    if (finished) position = length = duration;
                    deps.timeline.update({hash:hash,time:position,duration:length,percent:finished ? 100 : percent});
                    deps.progress(context, position, length, finished);
                    if (!finished || !deps.enabled()) return;
                    var navigation = deps.beforeAdvance(context);
                    // Android.timeCall deletes its old callback after returning
                    // from this handler. Start the next intent on a later turn.
                    deps.defer(function () {
                        if (generation === session && deps.isCurrent(context, navigation) && deps.enabled()) deps.advance(context);
                    });
                }
            });
            return out;
        }
        return {prepare:prepare,cancel:cancel};
    }
    window.LampaYaniNativePlayback = {create:create};
}(window));
