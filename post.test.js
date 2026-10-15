const { revokeUrl } = require('./post');

describe('revokeUrl', () => {
    it('should default to api.github.com when GITHUB_API_URL is unset', () => {
        expect(revokeUrl({})).toBe('https://api.github.com/installation/token');
    });

    it('should default to api.github.com when GITHUB_API_URL is empty', () => {
        expect(revokeUrl({ GITHUB_API_URL: '' })).toBe('https://api.github.com/installation/token');
    });

    it('should use GITHUB_API_URL for GitHub Enterprise Server', () => {
        expect(revokeUrl({ GITHUB_API_URL: 'https://ghes.example.com/api/v3' })).toBe('https://ghes.example.com/api/v3/installation/token');
    });

    it('should strip trailing slashes from GITHUB_API_URL', () => {
        expect(revokeUrl({ GITHUB_API_URL: 'https://ghes.example.com/api/v3/' })).toBe('https://ghes.example.com/api/v3/installation/token');
    });

    it('should use GITHUB_API_URL for GHE.com data residency', () => {
        expect(revokeUrl({ GITHUB_API_URL: 'https://api.octocorp.ghe.com' })).toBe('https://api.octocorp.ghe.com/installation/token');
    });
});
