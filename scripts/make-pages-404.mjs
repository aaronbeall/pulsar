// Writes dist/404.html for GitHub Pages, which serves one site-wide 404.html from the root
// for any missing path. It's the app's page (app/index.html), so a refresh or deep link on
// an app route such as /pulsar/app/workout still loads the app, plus a small redirect:
// - a missing path outside the app goes to the homepage (/pulsar/);
// - a deep link into a PR preview, such as /pulsar/pr-12/app/workout, goes to that preview's
//   own app root instead of booting the live app on a preview URL.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/app/index.html', 'utf8');
// The site's base path, read from the built asset URLs (e.g. "/pulsar/assets/app-123.js").
const base = html.match(/src="([^"]*\/)assets\//)?.[1] ?? '/';
const redirect = `<script>
  (function () {
    var path = location.pathname;
    var preview = path.match(/^(.*?\\/pr-\\d+\\/)/);
    if (preview) {
      var target = path.indexOf(preview[1] + 'app/') === 0 ? preview[1] + 'app/' : preview[1];
      if (path !== target) location.replace(target);
    } else if (path.indexOf(${JSON.stringify(base)} + 'app/') !== 0) {
      location.replace(${JSON.stringify(base)});
    }
  })();
</script>`;
writeFileSync('dist/404.html', html.replace('<head>', `<head>\n    ${redirect}`));
