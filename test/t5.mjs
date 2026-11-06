import fs from 'fs';
const src = fs.readFileSync('' + new URL('../udvidelse/', import.meta.url).pathname + 'qr.js', 'utf8');
const balanced = src.slice(src.indexOf('  function balanced'), src.indexOf('  NH.stripBai'));
const f = new Function(balanced + '; return stripBai;')();
for (const [ind, ud] of [
  ['(usa and historie) and ((bhs=OnShelf OR bhs=NotForLoan) AND ((bfi="Lager på HB")) and bai=715900)', '(usa and historie) and ((bhs=OnShelf OR bhs=NotForLoan) AND ((bfi="Lager på HB")))'],
  ['(sp=eng and ti="harry potter and the*" and rowling) and (bai=715900)', 'sp=eng and ti="harry potter and the*" and rowling'],
  ['(heste) and (bai=715900)', 'heste'],
]) console.log(f(ind) === ud ? 'OK  ' : 'FEJL', f(ind));
