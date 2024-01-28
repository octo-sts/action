const actionsToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
const actionsUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;

fetch(`${actionsUrl}?audience=octo-sts.dev`, { headers: { 'Authorization': `Bearer ${actionsToken}` } })
    .then(res => res.json())
    .then(json => {
        const ghtok = json.token;
        fetch(`https://octo-sts.dev/sts/exchange?scope=${scope}&identity=${identity}`, { headers: { 'Authorization': `Bearer ${ghtok}` } })
            .then(res => res.json())
            .then(json => {
                if (!json.token) {
                    console.log(`::error::${json.message}`);
                    return;
                }
                const tok = json.token;
                console.log(`::add-mask::${tok}`);
                process.env.GITHUB_OUTPUT += `token=${tok}`;
            })
    })
    .catch(err => {
        console.log(`::error::${err}`);
    });
