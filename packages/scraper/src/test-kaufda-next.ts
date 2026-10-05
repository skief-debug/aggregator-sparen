import fs from "fs";

(async () => {
  const r = await fetch("https://www.kaufda.de/Geschaefte/Lidl");
  const html = await r.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (match) {
    fs.writeFileSync("kaufda-next-data.json", match[1]);
    console.log("Saved to kaufda-next-data.json, size:", match[1].length);
  } else {
    console.log("Not found");
  }
})();
