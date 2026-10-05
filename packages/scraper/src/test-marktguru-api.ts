import fs from "fs";

(async () => {
  const apiKey = "8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=";
  const clientKey = "WU/RH+PMGDi+gkZer3WbMelt6zcYHSTytNB7VpTia90=";
  
  // Try to find the exact endpoint for offers, maybe search?
  // Let's try to query retailers first to get the Lidl ID, or just search for Lidl.
  try {
    const res = await fetch("https://api.marktguru.de/api/v1/offers?retailerIds=126679&limit=20&zipCode=19053", {
      headers: {
        "x-apikey": apiKey,
        "x-clientkey": "FtBfWwvvo8TcBpzGO5lHmTGi68ayFC/DTT4YPQuXcTA=",
        "origin": "https://www.marktguru.de",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
      }
    });
    const text = await res.text();
    console.log("Status:", res.status, res.statusText);
    console.log("Response text:", text.substring(0, 1000));
    const data = JSON.parse(text);
    console.log(JSON.stringify(data, null, 2).substring(0, 1000));
    fs.writeFileSync("marktguru-api-test.json", JSON.stringify(data, null, 2));
  } catch(e) {
    console.log("Error:", e.message);
  }
})();
