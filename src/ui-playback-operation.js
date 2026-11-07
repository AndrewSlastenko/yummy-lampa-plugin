(function (window) {
    'use strict';

    function create(deps) {
        deps = deps || {};
        var lampa = deps.lampa || window.Lampa || {};
        var active = null;
        var generation = 0;

        function owner() {
            return lampa.Activity && lampa.Activity.active ? lampa.Activity.active() : null;
        }

        function begin(message, options) {
            options = options || {};
            // Retire before starting the next loader, without reopening its parent UI.
            if (active) active.retire();
            var token = ++generation;
            var activity = owner();
            var phase = 'loading';
            var loading = true;
            var operation;

            function owns() {
                return active === operation && generation === token;
            }

            function valid() {
                return owns() && activity === owner();
            }

            function stop() {
                if (owns() && loading) {
                    loading = false;
                    var controller = lampa.Controller;
                    var enabled = controller && controller.enabled ? controller.enabled() : null;
                    var currentController = enabled && enabled.name;
                    if (lampa.Loading && lampa.Loading.stop) lampa.Loading.stop();
                    // Native Loading.stop restores its captured controller even after navigation.
                    // Keep the new activity's controller, without reviving an obsolete loading layer.
                    if (owns() && activity !== owner() && currentController && currentController !== 'loading' &&
                        controller && controller.toggle) {
                        enabled = controller.enabled ? controller.enabled() : null;
                        if (!enabled || enabled.name !== currentController) controller.toggle(currentController);
                    }
                }
            }

            function retire() {
                stop();
                phase = 'done';
                if (active === operation) active = null;
            }

            function closeError() {
                if (phase !== 'error') return;
                phase = 'closing';
                if (lampa.Select && lampa.Select.close) lampa.Select.close();
            }

            function cancel() {
                if (!owns() || (phase !== 'loading' && phase !== 'error')) return;
                var notify = valid();
                if (notify) closeError();
                retire();
                var callback = options.onCancel || deps.onCancel;
                if (notify && activity === owner() && generation === token && typeof callback === 'function') callback();
            }

            function current() {
                return phase === 'loading' && valid();
            }

            function finish() {
                var ready = current();
                if (owns() && phase === 'loading') retire();
                return ready;
            }

            function fail(details) {
                details = details || {};
                if (!current()) {
                    if (owns() && phase === 'loading') retire();
                    return false;
                }
                stop();
                phase = 'error';
                var items = [];
                if (typeof details.retry === 'function') items.push({title: 'Повторить', action: 'retry'});
                if (typeof details.alternate === 'function') items.push({title: 'Выбрать другой источник', action: 'alternate'});
                if (lampa.Select && lampa.Select.show) {
                    lampa.Select.show({
                        // The caller supplies localized safe text; never inspect an Error or URL.
                        title: typeof details.message === 'string' && details.message ? details.message : 'Не удалось начать просмотр',
                        items: items,
                        onSelect: function (item) {
                            if (phase !== 'error' || !valid() || items.indexOf(item) === -1) return;
                            var callback = item.action === 'retry' ? details.retry : details.alternate;
                            closeError();
                            retire();
                            // Select.close may synchronously change activity or start another operation.
                            if (activity === owner() && generation === token && typeof callback === 'function') callback();
                        },
                        onBack: cancel
                    });
                } else {
                    cancel();
                }
                return true;
            }

            operation = {current: current, finish: finish, cancel: cancel, fail: fail, retire: retire};
            active = operation;
            if (lampa.Loading && lampa.Loading.start) lampa.Loading.start(cancel, message);
            return operation;
        }

        return {begin: begin};
    }

    window.LampaYaniPlaybackOperation = {create: create};
})(window);
