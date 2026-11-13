// Turns dist-artifact/index.html (one inlined file) into artifact/patient-slot-review.html:
// the artifact host adds its own <!doctype>, <html>, <head> and <body>, so this keeps only
// what goes inside them, with the <title> first.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-artifact/index.html', 'utf8');
const head = src.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = src.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>Patient Slot Review</title>';
const fonts = head.match(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/gi) ?? [];
const styles = head.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? [];
const scripts = head.match(/<script[^>]*>[\s\S]*?<\/script>/gi) ?? [];

const out = [
  '<title>Patient Slot Review</title>',
  ...fonts,
  ...styles,
  body.trim(),
  ...scripts,
  '',
].join('\n');

if (!title) throw new Error('no title');
if (!scripts.length) throw new Error('no inlined script found: did the single-file build run?');
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/patient-slot-review.html', out);
console.log(`artifact/patient-slot-review.html: ${(out.length / 1024).toFixed(0)} KB, ${scripts.length} script(s), ${styles.length} style block(s)`);
