const tok = process.env.STATE_token;

if (!tok) {
    console.log(`::warning::Token not found in state; nothing to revoke.`);
    process.exit(0);
}

(async function main() {
    try {
        const res = await fetch('https://api.github.com/installation/token', {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${tok}`,
                'Accept': 'application/vnd.github+json',
            },
        });

        if (res.status == 204) {
            console.log('Token was revoked!');
        } else {
            console.log(`::error::${res.status} ${res.statusText}`);
        }
    } catch (err) {
        console.log(`::error::${err.stack}`);
    }

})();
