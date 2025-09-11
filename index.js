const actionsToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
const actionsUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;

const crypto = require('node:crypto');
const fs = require('node:fs');
const util = require('node:util');
const { error, debug, addMask, parseOIDC } = require('./util');
const appendFile = util.promisify(fs.appendFile);

if (!actionsToken || !actionsUrl) {
    error(`Missing required environment variables; have you set 'id-token: write' in your workflow permissions?`);
    process.exit(1);
}

const scope = process.env.INPUT_SCOPE;
const identity = process.env.INPUT_IDENTITY;
const domain = process.env.INPUT_DOMAIN;

if (!scope || !identity) {
    error(`Missing required inputs 'scope' and 'identity'`);
    process.exit(1);
}

async function fetchWithRetry(url, options = {}, retries = 3, initialDelay = 1000) {
    let attempt = 1;
    while (retries > 0) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${await response.text()}`);
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
        debug('Fetching ID token from GitHub Actions');
        const res = await fetchWithRetry(`${actionsUrl}&audience=${domain}`, { headers: { 'Authorization': `Bearer ${actionsToken}` } }, 5);
        const json = await res.json();

        debug('Fetching GitHub Token from STS');

        const parsedToken = parseOIDC(json.value);
        debug(`OIDC sub: ${parsedToken.sub}`);

        const res2 = await fetchWithRetry(`https://${domain}/sts/exchange?scope=${scope}&scopes=${scope}&identity=${identity}`, { headers: { 'Authorization': `Bearer ${json.value}` } });
        const json2 = await res2.json();

        if (!json2.token) { error(json2.message); process.exit(1); }
        const tok = json2.token;

        const tokHash = crypto.createHash('sha256').update(tok).digest('hex');
        debug(`Token hash: ${tokHash}`);

        addMask(tok);
        await appendFile(process.env.GITHUB_OUTPUT, `token=${tok}`); // Write the output.
        await appendFile(process.env.GITHUB_STATE, `token=${tok}`); // Write the state, so the post job can delete the token.
    } catch (err) {
        error(err.stack);
        process.exit(1);
    }
})();
