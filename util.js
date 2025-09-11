function encode(msg) {
    return msg.replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

export function debug(msg) {
  console.log(`::debug::${encode(msg)}`);
}

export function error(msg) {
  console.log(`::error::${encode(msg)}`);
}

export function addMask(msg) {
    console.log(`::add-mask::${encode(msg)}`);
}

export function parseOIDC(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('ID token is not in JWT format');
    }
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decoded);
}