const tok = process.env.STATE_TOKEN;

if (!tok) {
    console.log(`::warning::Token not found in state file.`);
    process.exit(0);
}

fetch('https://api.github.com/installation/token', {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${tok}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
    }
})
    .then(res => {
        if (res.status == 204) {
            console.log('::warning::Token was revoked!');
        } else {
            console.log(`::error::${res.status} ${res.statusText}`);
        }
    })
    .catch(err => { console.log(`::error::${err}`); });
