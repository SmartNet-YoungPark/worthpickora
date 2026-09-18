import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { optimizeProductImage } from '../lib/optimize-product-image.ts';

test('large images shrink with aspect ratio and transparency preserved', async()=>{
  const input=await sharp({create:{width:2400,height:1200,channels:4,background:{r:20,g:100,b:40,alpha:0.5}}}).png().toBuffer();
  const output=await optimizeProductImage('data:image/png;base64,'+input.toString('base64'));
  const bytes=Buffer.from(output.split(',')[1],'base64');
  const metadata=await sharp(bytes).metadata();
  assert.equal(metadata.width,800);assert.equal(metadata.height,400);
  assert.equal(metadata.hasAlpha,true);assert.equal(metadata.format,'webp');
  assert.ok(bytes.length<input.length);
  assert.equal(await optimizeProductImage(output),output,'already small images are not repeatedly re-encoded');
});
test('references are not downloaded or changed; malformed embedded images fail',async()=>{
  for(const value of ['', '/api/products/one/image?scope=admin&v=rev', 'https://example.com/photo.jpg']) assert.equal(await optimizeProductImage(value),value);
  await assert.rejects(optimizeProductImage('data:image/png;base64,YmFk'));
});
