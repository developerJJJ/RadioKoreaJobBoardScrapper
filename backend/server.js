const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 5000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.use(cors());
app.use(express.json());

app.get('/api/jobs', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit) || 20;

    const fetchPage = async (pageNum) => {
      const url = `https://www.radiokorea.com/bulletin/bbs/board.php?bo_table=c_jobs&page=${pageNum}`;
      try {
        const { data } = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 15000
        });
        const $ = cheerio.load(data);
        const jobs = [];
        $('.board_list li').each((index, element) => {
          if (index === 0 || $(element).hasClass('notice')) return;
          const area = $(element).find('.area').text().trim();
          const category = $(element).find('.category').text().trim();
          const subject = $(element).find('.subject').text().trim();
          const writer = $(element).find('.writer').text().trim();
          const date = $(element).find('.date').text().trim();
          const link = $(element).find('.subject').closest('a').attr('href') || 
                       $(element).find('a.thumb:has(.subject)').attr('href') ||
                       $(element).find('a[href*="wr_id"]').attr('href');
          if (subject) {
            jobs.push({
              id: link ? link.split('wr_id=')[1]?.split('&')[0] : Math.random().toString(36).substr(2, 9),
              area,
              category,
              subject,
              writer,
              date,
              link: link ? (link.startsWith('http') ? link : `https://www.radiokorea.com/bulletin/bbs/${link}`) : '#'
            });
          }
        });
        return jobs;
      } catch (err) {
        console.error(`Error fetching page ${pageNum}:`, err.message);
        return [];
      }
    };

    if (page) {
      const result = await fetchPage(page);
      return res.json(result);
    }

    const totalPages = Math.min(limit, 100);
    console.log(`Politely scraping ${totalPages} pages...`);
    
    const results = [];
    for (let i = 1; i <= totalPages; i++) {
      const pageResult = await fetchPage(i);
      results.push(pageResult);
      if (i < totalPages) await delay(1000); // Respectful 1000ms delay between pages
    }
    
    // Flatten array and remove potential duplicates based on content (subject + writer)
    const allJobs = results.flat();
    const seen = new Set();
    const uniqueJobs = allJobs.filter(job => {
      const duplicateKey = `${job.subject.normalize('NFC')}|${job.writer.normalize('NFC')}`;
      if (seen.has(duplicateKey)) return false;
      seen.add(duplicateKey);
      return true;
    });

    res.json(uniqueJobs);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
