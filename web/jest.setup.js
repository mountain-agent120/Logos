import '@testing-library/jest-dom'
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

Object.defineProperty(global, 'crypto', {
    value: {
        subtle: {
            digest: async (algo, data) => {
                // Return dummy 32-byte has for test
                return new Uint8Array(32).buffer;
            }
        }
    }
});
