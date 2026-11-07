(function (window) {
    'use strict';

    function isAnimeCategory(object) {
        if (!object || ['category', 'category_full'].indexOf(object.component) < 0) return false;
        return object.url === 'anime' || /^(аниме|anime)$/i.test(String(object.title || '').trim());
    }

    function install(deps) {
        var L = deps.lampa, $ = deps.$;
        if (!L || !L.Component || !L.Select || L.__yaniNativeShell) return false;
        L.__yaniNativeShell = true;

        function decorate(Original) {
            if (!Original || Original.__yaniNativeCategory) return Original;
            function Wrapped(object) {
                var returned = Original.apply(this, arguments);
                var comp = returned && typeof returned === 'object' ? returned : this;
                if (!isAnimeCategory(object) || !L.Head || !L.Head.addElement) return comp;
                var action;
                function remove() { if (action) action.remove(); action = null; }
                var start = comp.start;
                comp.start = function () {
                    if (!action) {
                        action = $('<div class="head__action selector yani-native-search" style="width:auto;padding:0 .6em" title="Поиск аниме" aria-label="Поиск аниме"><span style="font-size:.85em;white-space:nowrap">Поиск аниме</span></div>');
                        L.Head.addElement(action, function () {
                            deps.openSearch(function () { L.Controller.toggle('head'); });
                        });
                    }
                    if (start) return start.apply(this, arguments);
                };
                ['pause', 'stop', 'destroy'].forEach(function (name) {
                    var original = comp[name];
                    comp[name] = function () { remove(); if (original) return original.apply(this, arguments); };
                });
                return comp;
            }
            Wrapped.prototype = Original.prototype;
            Wrapped.__yaniNativeCategory = true;
            return Wrapped;
        }

        var add = L.Component.add;
        L.Component.add = function (name, component) {
            return add.call(this, name, name === 'category_full' || name === 'category' ? decorate(component) : component);
        };
        ['category', 'category_full'].forEach(function (name) {
            var existing = L.Component.get(name);
            if (existing) L.Component.add(name, existing);
        });

        if (L.Listener && L.Listener.follow) L.Listener.follow('full', function (event) {
            if (event.type !== 'complite' || !event.object || !event.object.activity) return;
            var movie = event.data && event.data.movie;
            if (!movie || !deps.isAnime(movie)) return;
            var render = event.object.activity.render();
            if (deps.decorateCard) deps.decorateCard(event.object, movie, render, event.link);
            var container = render.find('.buttons--container').first();
            if (!container.length || render.find('.view--yummy-native-source').length) return;
            var owner = event.object;
            var button = $('<div class="full-start__button selector view--yummy-native-source"><svg><use xlink:href="#sprite-play"></use></svg><span>YummyAnime</span></div>');
            button.on('hover:enter', function () {
                if (L.Activity.active() !== owner) return;
                L.Select.close();
                deps.openPlayback(movie);
            });
            container.append(button);
        });
        return true;
    }

    window.LampaYaniNativeShell = {install: install, isAnimeCategory: isAnimeCategory};
}(window));
