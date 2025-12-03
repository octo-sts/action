const { parseJwtClaims } = require('./index');

describe('parseJwtClaims', () => {
    // Helper function to create a test JWT token
    function createTestJwt(payload) {
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
        const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = 'test-signature';
        return `${header}.${payloadStr}.${signature}`;
    }

    describe('valid tokens', () => {
        it('should parse a valid JWT token and return claims', () => {
            const expectedClaims = {
                iss: 'https://token.actions.githubusercontent.com',
                sub: 'repo:octo-org/octo-repo:ref:refs/heads/main',
                aud: 'https://github.com/octo-org',
                exp: 1234567890,
                iat: 1234567800
            };
            const token = createTestJwt(expectedClaims);

            const claims = parseJwtClaims(token);

            expect(claims).toEqual(expectedClaims);
        });

        it('should parse tokens with nested claims', () => {
            const expectedClaims = {
                iss: 'test-issuer',
                sub: 'test-subject',
                nested: {
                    property: 'value',
                    array: [1, 2, 3]
                }
            };
            const token = createTestJwt(expectedClaims);

            const claims = parseJwtClaims(token);

            expect(claims).toEqual(expectedClaims);
        });

        it('should parse tokens with special characters in claims', () => {
            const expectedClaims = {
                message: 'Special chars: !@#$%^&*()',
                unicode: '日本語',
                emoji: '🚀'
            };
            const token = createTestJwt(expectedClaims);

            const claims = parseJwtClaims(token);

            expect(claims).toEqual(expectedClaims);
        });
    });

    describe('invalid tokens', () => {
        it('should throw error for null token', () => {
            expect(() => parseJwtClaims(null)).toThrow('Token value is missing');
        });

        it('should throw error for undefined token', () => {
            expect(() => parseJwtClaims(undefined)).toThrow('Token value is missing');
        });

        it('should throw error for empty string token', () => {
            expect(() => parseJwtClaims('')).toThrow('Token value is missing');
        });

        it('should throw error for token with only 1 part', () => {
            expect(() => parseJwtClaims('single-part')).toThrow('Invalid JWT structure: expected 3 parts, got 1');
        });

        it('should throw error for token with only 2 parts', () => {
            expect(() => parseJwtClaims('two.parts')).toThrow('Invalid JWT structure: expected 3 parts, got 2');
        });

        it('should throw error for token with 4 parts', () => {
            expect(() => parseJwtClaims('one.two.three.four')).toThrow('Invalid JWT structure: expected 3 parts, got 4');
        });

        it('should throw error for token with invalid base64url encoding', () => {
            const token = 'header.!!!invalid-base64!!!.signature';
            expect(() => parseJwtClaims(token)).toThrow();
        });

        it('should throw error for token with invalid JSON in payload', () => {
            const header = Buffer.from('{"alg":"RS256"}').toString('base64url');
            const invalidJson = Buffer.from('{invalid json}').toString('base64url');
            const signature = 'signature';
            const token = `${header}.${invalidJson}.${signature}`;

            expect(() => parseJwtClaims(token)).toThrow();
        });
    });

    describe('edge cases', () => {
        it('should handle empty claims object', () => {
            const token = createTestJwt({});
            const claims = parseJwtClaims(token);
            expect(claims).toEqual({});
        });

        it('should handle claims with null values', () => {
            const expectedClaims = { nullValue: null };
            const token = createTestJwt(expectedClaims);
            const claims = parseJwtClaims(token);
            expect(claims).toEqual(expectedClaims);
        });

        it('should handle claims with array values', () => {
            const expectedClaims = {
                scopes: ['read', 'write', 'admin'],
                numbers: [1, 2, 3]
            };
            const token = createTestJwt(expectedClaims);
            const claims = parseJwtClaims(token);
            expect(claims).toEqual(expectedClaims);
        });

        it('should handle very long claim values', () => {
            const longString = 'a'.repeat(10000);
            const expectedClaims = { longClaim: longString };
            const token = createTestJwt(expectedClaims);
            const claims = parseJwtClaims(token);
            expect(claims).toEqual(expectedClaims);
        });
    });

    describe('token data not leaked in errors', () => {
        it('should not include token in error message for invalid base64', () => {
            const secretToken = 'header.SECRET_TOKEN_DATA_12345.signature';
            try {
                parseJwtClaims(secretToken);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).not.toContain('SECRET_TOKEN_DATA');
                expect(error.message).not.toContain('12345');
                expect(error.message).not.toContain(secretToken);
            }
        });

        it('should not include token in error message for invalid JSON', () => {
            const header = Buffer.from('{"alg":"RS256"}').toString('base64url');
            const secretData = 'SECRET_PASSWORD_123';
            const invalidJson = Buffer.from(`{${secretData}}`).toString('base64url');
            const signature = 'signature';
            const token = `${header}.${invalidJson}.${signature}`;

            try {
                parseJwtClaims(token);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).not.toContain(secretData);
                expect(error.message).not.toContain('SECRET_PASSWORD');
                expect(error.message).not.toContain('123');
                expect(error.message).not.toContain(invalidJson);
            }
        });

        it('should not include decoded payload in error message', () => {
            const header = Buffer.from('{"alg":"RS256"}').toString('base64url');
            const sensitivePayload = '{"secret":"my-api-key-12345","password":"super-secret"}';
            const encodedPayload = Buffer.from(sensitivePayload).toString('base64url');
            const signature = 'signature';
            const token = `${header}.${encodedPayload}.${signature}`;

            // This should succeed, but let's test with invalid JSON to trigger error
            const invalidPayload = Buffer.from('{"unclosed": "bracket"').toString('base64url');
            const invalidToken = `${header}.${invalidPayload}.${signature}`;

            try {
                parseJwtClaims(invalidToken);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).not.toContain('unclosed');
                expect(error.message).not.toContain('bracket');
                expect(error.message).not.toContain(invalidPayload);
            }
        });

        it('should not include any part of the token in structure error', () => {
            const secretToken = 'single-part-with-SECRET-DATA-xyz';
            try {
                parseJwtClaims(secretToken);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).not.toContain('SECRET');
                expect(error.message).not.toContain('xyz');
                expect(error.message).not.toContain(secretToken);
                // Should only contain the count
                expect(error.message).toContain('expected 3 parts, got 1');
            }
        });

        it('should provide generic error messages that do not expose token data', () => {
            const header = Buffer.from('{"alg":"RS256"}').toString('base64url');
            const invalidJson = Buffer.from('{invalid}').toString('base64url');
            const signature = 'sig';

            const testCases = [
                { token: null, expectedError: 'Token value is missing' },
                { token: '', expectedError: 'Token value is missing' },
                { token: 'a.b', expectedError: 'Invalid JWT structure: expected 3 parts, got 2' },
                { token: `${header}.${invalidJson}.${signature}`, expectedError: 'Failed to parse token payload: invalid JSON' }
            ];

            testCases.forEach(({ token, expectedError }) => {
                try {
                    parseJwtClaims(token);
                    fail(`Expected error for token: ${token}`);
                } catch (error) {
                    expect(error.message).toBe(expectedError);
                }
            });
        });
    });
});
