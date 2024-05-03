require('dotenv').config();

const axios = require('axios');
const xml2js = require('xml2js');
const yargs = require('yargs');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: `${process.env.APIKEY}`
});

const rssUrls = [
  // ニュースサイトのRSSフィードURLを追加
];

const argv = yargs
    .option('prompt', {
        alias: 'p',
        description: 'Provide the prompt for news suggestions',
        type: 'string',
        demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;

async function fetchNewsFromRSS(url) {
    const response = await axios.get(url);
    const parsedData = await xml2js.parseStringPromise(response.data);
    if (parsedData.rss && parsedData.rss.channel) {
        return parsedData.rss.channel[0].item.map(item => item.title[0]);
    } else if (parsedData.feed && parsedData.feed.entry) {
        return parsedData.feed.entry.map(entry => entry.title[0]);
    };
}

async function suggestNews(prompt) {
    try {
        const allNews = [];
        for (const url of rssUrls) {
            const newsItems = await fetchNewsFromRSS(url);
            allNews.push(...newsItems);
        }

        const completions = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {"role": "user", "content": `Given the prompt: "${prompt}", which of the following news titles are most relevant? ${allNews.join('\n')}`}
            ],
            max_tokens: 200,
        });

        const suggestions = completions.choices[0].message.content.split('\n');
        console.log("Suggested news based on your prompt:");
        suggestions.forEach(item => console.log(`- ${item}`));

    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}

suggestNews(argv.prompt);
