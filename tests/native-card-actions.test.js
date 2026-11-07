const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context={window:{},setTimeout};
vm.runInNewContext(fs.readFileSync('src/ui-native-card-actions.js','utf8'),context);
const api=context.window.LampaYaniNativeCardActions;
assert.equal(api.actionState({number:2,time:65,duration:900},12,'yummyanime').label,'Продолжить: серия 2 · 1:05');
assert.equal(api.actionState({number:2,time:899,duration:900},3,'yummyanime').episode,3);
assert.equal(api.actionState({number:2,time:899,duration:900},0,'yummyanime').label,'Смотреть');
assert.equal(api.actionState({number:3,time:899,duration:900},3,'yummyanime').label,'Смотреть');
assert.equal(api.actionState({number:2,time:10,duration:900,finished_episodes:{2:true}},3,'yummyanime').episode,3);
assert.equal(api.actionState({number:2,time:10,duration:900,finished_episodes:{2:true}},2,'yummyanime').label,'Смотреть');
assert.equal(api.actionState({number:NaN,time:60,duration:900},12,'yummyanime').label,'Смотреть');
assert.equal(api.actionState({number:2,time:60,duration:900},12,'bwa').label,'Смотреть');
class Element {
 constructor(classes='',text=''){this.classes=new Set(classes.split(' '));this.value=text;this.handlers={};this.length=1;this.children=[];}
 first(){return this;} find(s){if(s==='span')return {text:v=>{this.value=v;return this;}};return new Empty();}
 clone(){const c=new Element([...this.classes].join(' '),this.value);c.handlers={...this.handlers};return c;}
 removeClass(s){s.split(' ').forEach(x=>this.classes.delete(x));return this;} addClass(s){this.classes.add(s);return this;}
 off(s){delete this.handlers[s];return this;} on(s,fn){this.handlers[s]=fn;return this;} trigger(s){if(this.handlers[s])this.handlers[s]();return this;}
 after(c){this.children.push(c);return this;} css(){return this;} text(){return this.value;}
}
class Empty extends Element {constructor(){super();this.length=0;} }
(async()=>{
let active={}, source='yummyanime', calls=[], menus=0, settings=[], deferred=[];
let hasBwa=true;
const owner=active, movie={};const play=new Element('button--play button--priority','Смотреть');play.on('hover:enter',()=>menus++);
const bwa=new Element('', 'BWA');bwa.on('hover:enter',()=>calls.push('bwa'));
const render={find(s){if(s==='.button--play')return play;if(s==='.full-start-new__buttons')return new Element();if(s==='.buttons--container > .full-start__button')return {each(fn){if(hasBwa)fn.call(bwa,0,bwa);}};return new Empty();}};
const lampa={Storage:{get:()=>source},Activity:{active:()=>active},SettingsApi:{addParam(p){settings.push(p);}}};
const instance=api.create({lampa,$:x=>x,openPlayback:(m,o)=>calls.push(o),resolveCard:()=>Promise.resolve({yani_episodes:{aired:12}}),getPlayback:()=>({number:4,time:75,duration:900}),defer:fn=>deferred.push(fn)});
instance.decorate(owner,movie,render);instance.decorate(owner,movie,render);assert.equal(play.children.length,0);
deferred.splice(0).forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));
assert.equal(play.children.length,2,'one clone and episode button');
assert.equal(play.value,'Продолжить: серия 4 · 1:15');assert.ok(movie.yani_card);
play.off('hover:enter').on('hover:enter',()=>menus++); // Native groupButtons rebinds on every content toggle.
instance.refresh();
play.trigger('hover:enter');assert.equal(calls[0].resume,true);
const others=play.children.find(x=>x.classes.has('yani-other-sources'));others.trigger('hover:enter');assert.equal(menus,1);
const choose=play.children.find(x=>x.classes.has('yani-choose-episode'));choose.trigger('hover:enter');assert.equal(calls[1].chooseEpisode,true);
source='ask';instance.refresh();play.trigger('hover:enter');assert.equal(menus,2);
source='bwa';instance.refresh();play.trigger('hover:enter');assert.equal(calls[2],'bwa');
active={};play.trigger('hover:enter');choose.trigger('hover:enter');assert.equal(calls.length,3,'stale owner is inert');
active=owner;play.trigger('hover:enter');assert.equal(calls.length,4,'returning owner remains usable');
hasBwa=false;play.trigger('hover:enter');assert.equal(menus,3,'missing BWA keeps native source menu reachable');
active={};others.trigger('hover:enter');assert.equal(menus,3,'stale source clone is inert');
active=owner;
api.create({lampa,$:x=>x,openPlayback(){}});
assert.equal(settings.length,1);assert.equal(settings[0].component,'player');assert.equal(settings[0].param.name,'yani_native_default_source');
console.log('native card actions tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});

