const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');

const app = express();
const port = 3000;

// Serve static files from public directory
app.use(express.static('public'));

// Function to read and parse markdown files
async function renderMarkdown(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return marked(content);
    } catch (error) {
        console.error('Error reading markdown file:', error);
        return '<p>Content not found</p>';
    }
}

// Function to wrap content in HTML template
async function wrapInTemplate(content, title) {
    try {
        const template = await fs.readFile('templates/layout.html', 'utf-8');
        return template
            .replace('{{title}}', title)
            .replace('{{content}}', content);
    } catch (error) {
        console.error('Error reading template:', error);
        return content;
    }
}

// Function to get blog post metadata
async function getBlogPostMetadata(filename) {
    try {
        const content = await fs.readFile(path.join(__dirname, 'content', 'blog', filename), 'utf-8');
        const lines = content.split('\n');
        const title = lines[0].replace('# ', '');
        const publishedMatch = content.match(/\*Published: (.*?)\*/);
        const published = publishedMatch ? publishedMatch[1] : 'Unknown date';
        return {
            title,
            published,
            slug: filename.replace('.md', '')
        };
    } catch (error) {
        console.error('Error reading blog post:', error);
        return null;
    }
}

// Route for blog index
app.get('/blog', async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname, 'content', 'blog'));
        const posts = await Promise.all(
            files
                .filter(file => file.endsWith('.md'))
                .map(file => getBlogPostMetadata(file))
        );
        
        const content = `
# Blog Posts

${posts
    .filter(post => post !== null)
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .map(post => `
## [${post.title}](/blog/${post.slug})

*Published: ${post.published}*
    `.trim()).join('\n\n')}
        `.trim();
        
        const html = await wrapInTemplate(marked(content), 'Blog');
        res.send(html);
    } catch (error) {
        console.error('Error generating blog index:', error);
        res.status(500).send('Error generating blog index');
    }
});

// Route for pages
app.get('/pages/:page', async (req, res) => {
    const pagePath = path.join(__dirname, 'content', 'pages', `${req.params.page}.md`);
    const content = await renderMarkdown(pagePath);
    const html = await wrapInTemplate(content, req.params.page.charAt(0).toUpperCase() + req.params.page.slice(1));
    res.send(html);
});

// Route for blog posts
app.get('/blog/:post', async (req, res) => {
    const postPath = path.join(__dirname, 'content', 'blog', `${req.params.post}.md`);
    const content = await renderMarkdown(postPath);
    const html = await wrapInTemplate(content, req.params.post.replace(/-/g, ' '));
    res.send(html);
});

// Home page route
app.get('/', async (req, res) => {
    const indexPath = path.join(__dirname, 'content', 'pages', 'index.md');
    const content = await renderMarkdown(indexPath);
    const html = await wrapInTemplate(content, 'Home');
    res.send(html);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 