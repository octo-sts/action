const tok = process.env.STATE_token;

if (!tok) {
    console.log(`::warning::Token not found in state file.`);
    process.exit(0);
}

fetch('https://api.github.com/installation/token', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tok}` },
})
    .then(res => {
        if (res.status == 204) {
            console.log('::warning::Token was revoked!');
        } else {
            console.log(`::error::${res.status} ${res.statusText}`);
        }
    })
    .catch(err => { console.log(`::error::${err}`); });
