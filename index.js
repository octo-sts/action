const actionsToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
const actionsUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;

if (!actionsToken || !actionsUrl) {
    console.log(`::error::Missing required environment variables; have you set 'id-token: write' in your workflow permissions?`);
    process.exit(1);
}

const scope = process.env.INPUT_SCOPE;
const identity = process.env.INPUT_IDENTITY;
const domain = process.env.INPUT_DOMAIN;

if (!scope || !identity) {
    console.log(`::error::Missing required inputs 'scope' and 'identity'`);
    process.exit(1);
}

async function fetchWithRetry(url, options = {}, retries = 3, initialDelay = 1000) {
    let attempt = 1;
    while (retries > 0) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            console.warn(`Attempt ${attempt} failed. Error: ${error.message}`);
            const jitter = Math.floor(Math.random() * 5000);
            const delay = Math.min(2 ** attempt * initialDelay + jitter, 10000); // Limit max delay to 10 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
            retries--;
        }
    }
    throw new Error(`Fetch failed after ${attempt} attempts.`);
}

(async function main() {
    // You can use await inside this function block
    try {
        const res = await fetchWithRetry(`${actionsUrl}&audience=${domain}`, { headers: { 'Authorization': `Bearer ${actionsToken}` } }, 5);
        const json = await res.json();
        const res2 = await fetchWithRetry(`https://${domain}/sts/exchange?scope=${scope}&identity=${identity}`, { headers: { 'Authorization': `Bearer ${json.value}` } });
        const json2 = await res2.json();

        if (!json2.token) { console.log(`::error::${json2.message}`); process.exit(1); }
        const tok = json2.token;

        const crypto = require('crypto');
        const tokHash = crypto.createHash('sha256').update(tok).digest('hex');
        console.log(`Token hash: ${tokHash}`);

        console.log(`::add-mask::${tok}`);
        const fs = require('fs');
        fs.appendFile(process.env.GITHUB_OUTPUT, `token=${tok}`, function (err) { if (err) throw err; }); // Write the output.
        fs.appendFile(process.env.GITHUB_STATE, `token=${tok}`, function (err) { if (err) throw err; }); // Write the state, so the post job can delete the token.
    } catch (err) {
        console.log(`::error::${err.stack}`); process.exit(1);
    }
})();
