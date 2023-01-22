import { semverCompare } from './semverCompare';

describe('semverCompare', () => {
    type EXPECTED = 'greater' | 'equal' | 'less';

    test('it', () => {
        testCase(null, null, 'equal');
        testCase('1.0.0', '1.0.0', 'equal');
        testCase('1.0.0', '1.0.00', 'equal');
        testCase('01.0.0', '1.0.00', 'equal');
        testCase('1.2.3', '1.2.3beta.4', 'equal');

        testCase('2.0.0', '1.0.0', 'greater');
        testCase('1.2.0', '1.1.0', 'greater');
        testCase('1.2.3', '1.2.2', 'greater');
        testCase('1.2.30', '1.2.9', 'greater');
        testCase('1.2.4beta', '1.2.3', 'greater');
        testCase('1.2.4beta.0', '1.2.3', 'greater');
        testCase('1.2.4.beta.0', '1.2.3', 'greater');

        testCase('1.0.0', '2.0.0', 'less');
        testCase('1.1.0', '1.2.0', 'less');
        testCase('1.2.2', '1.2.3', 'less');
        testCase('1.2.9', '1.2.30', 'less');
        testCase('1.2.3', '1.2.4beta', 'less');
        testCase('1.2.3', '1.2.4beta.0', 'less');
        testCase('1.2.3', '1.2.4.beta.0', 'less');
    });

    function testCase(v1: string | null, v2: string | null, expected: EXPECTED) {
        const result = semverCompare(v1, v2);

        if (expected === 'equal') {
            expect(result).toBe(0);
        } else if (expected === 'greater') {
            expect(result).toBeGreaterThan(0);
        } else {
            expect(result).toBeLessThan(0);
        }
    }
});
