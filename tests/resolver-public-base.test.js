const assert = require('node:assert/strict');
const {playbackBase} = require('../server');
const previous = process.env.YANI_RESOLVER_PUBLIC_BASE;
try {
 delete process.env.YANI_RESOLVER_PUBLIC_BASE;
 assert.equal(playbackBase({headers:{host:'127.0.0.1:8790'}}),'http://127.0.0.1:8790');
 process.env.YANI_RESOLVER_PUBLIC_BASE='https://resolver.example:18443/access-key/';
 assert.equal(playbackBase({headers:{host:'internal:8790'}}),'https://resolver.example:18443/access-key');
 const playlist = require('../server').rewritePlaylist('#EXTM3U\nnext.m3u8\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"','https://cdn.example/master.m3u8',()=>playbackBase({headers:{host:'untrusted.example'}})+'/hls/id/p');
 assert.ok(!playlist.includes('http://'));
 assert.equal((playlist.match(/https:\/\/resolver.example:18443\/access-key\/hls\/id\/p/g)||[]).length,2);
 for(const base of ['http://resolver.example/key','https://user:password@resolver.example/key','https://resolver.example/key?secret=x','https://resolver.example/key#fragment']){
  process.env.YANI_RESOLVER_PUBLIC_BASE=base;
  assert.throws(()=>playbackBase({headers:{host:'internal'}}),/public base/i);
 }
} finally {
 if(previous===undefined)delete process.env.YANI_RESOLVER_PUBLIC_BASE;else process.env.YANI_RESOLVER_PUBLIC_BASE=previous;
}
console.log('resolver public base tests passed');
