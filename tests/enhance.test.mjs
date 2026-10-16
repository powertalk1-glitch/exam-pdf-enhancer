import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enhance} from '../src/enhance.mjs';
test('faint ink becomes black, paper becomes white, source unchanged',()=>{
 const input=new Uint8ClampedArray([180,180,180,255,245,245,245,255]);
 const out=enhance(input,2,1,{mode:'bw',threshold:205,strength:50,background:15,thicken:0});
 assert.deepEqual([...out],[0,0,0,255,255,255,255,255]); assert.equal(input[0],180);
});
