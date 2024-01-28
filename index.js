const actionsToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
const actionsUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;

if (!actionsToken || !actionsUrl) {
    console.log(`::error::Missing required environment variables; have you set 'id-token: write' in your workflow permissions?`);
    process.exit(1);
}

const scope = process.env.INPUT_scope;
const identity = process.env.INPUT_identity;

if (!scope || !identity) {
    console.log(`::error::Missing required inputs 'scope' and 'identity'`);
    process.exit(1);
}

fetch(`${actionsUrl}&audience=octo-sts.dev`, { headers: { 'Authorization': `Bearer ${actionsToken}` } })
    .then(res => {
        console.log('Fetching workflow OIDC...');
        console.log(res.status);
        res.json()
            .then(json => {
                console.log('Got JSON', json);
                const ghtok = json.value;
                console.log('Fetching from octo-sts.dev...');
                fetch(`https://octo-sts.dev/sts/exchange?scope=${scope}&identity=${identity}`, { headers: { 'Authorization': `Bearer ${ghtok}` } })
                    .then(res => res.json()
                        .catch(err => { console.log(`::error::${err.stack}`); process.exit(1); })
                        .then(json => {
                            if (!json.token) { console.log(`::error::${json.message}`); process.exit(1); }
                            const tok = json.token;
                            console.log(`::add-mask::${tok}`);
                            process.env.GITHUB_OUTPUT += `token=${tok}`;
                        })
                    )
                    .catch(err => { console.log(`::error::${err.stack}`); process.exit(1); });
            })
    })
    .catch(err => { console.log(`::error::${err.stack}`); process.exit(1); });
