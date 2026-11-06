// Writes dist/404.html for GitHub Pages, which serves one site-wide 404.html from the root
// for any missing path. The live app's copy is its own index.html (so client-side routes
// survive a refresh), plus a small redirect: a deep link into a PR preview, such as
// /pulsar/pr-12/workout, also lands here, so send it to that preview's own root instead
// of booting the live app on a preview URL.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const redirect = `<script>
  (function () {
    var m = location.pathname.match(/^(.*?\\/pr-\\d+\\/)/);
    if (m && location.pathname !== m[1]) location.replace(m[1]);
  })();
</script>`;
writeFileSync('dist/404.html', html.replace('<head>', `<head>\n    ${redirect}`));
