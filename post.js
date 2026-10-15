function revokeUrl(env = process.env) {
    const apiUrl = (env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');
    return `${apiUrl}/installation/token`;
}

// Only run main code if this script is executed directly (not required for testing)
if (require.main === module) {
    const tok = process.env.STATE_token;

    if (!tok) {
        console.log(`::warning::Token not found in state; nothing to revoke.`);
        process.exit(0);
    }

    (async function main() {
        try {
            const res = await fetch(revokeUrl(), {
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
}

// Export for testing
module.exports = { revokeUrl };
