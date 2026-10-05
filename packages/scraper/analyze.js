const fs = require('fs');
const html = fs.readFileSync('page.html', 'utf8');

const classMatches = html.match(/class="([^"]+)"/g) || [];
const classCounts = {};

classMatches.forEach(match => {
  const classesStr = match.replace('class="', '').replace('"', '');
  classesStr.split(' ').forEach(cls => {
    if (cls.length > 3) {
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    }
  });
});

const topClasses = Object.entries(classCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

console.log("Top Classes:", topClasses);

// Search for price container
let priceIndex = html.indexOf('€');
while (priceIndex !== -1) {
    const snippet = html.substring(Math.max(0, priceIndex - 100), priceIndex + 10);
    console.log("Snippet near €:", snippet);
    priceIndex = html.indexOf('€', priceIndex + 1);
    if(priceIndex > 0) break; // just print a few
}
