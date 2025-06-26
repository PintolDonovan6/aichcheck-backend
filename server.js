const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing search query" });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(`https://m.facebook.com/search/people/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('a[href*="/profile.php"], a[href*="/people/"]', { timeout: 10000 });

    const results = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/profile.php"], a[href*="/people/"]'));
      const seen = new Set();
      const profiles = [];

      for (let a of anchors) {
        const name = a.innerText.trim();
        const link = a.href;
        const img = a.querySelector('img')?.src || '';
        if (name && link && !seen.has(link)) {
          seen.add(link);
          profiles.push({ name, profileUrl: link, image: img });
        }
        if (profiles.length >= 5) break;
      }

      return profiles;
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scraping failed", detail: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`📡 Aich Check backend running on port ${PORT}`);
});
