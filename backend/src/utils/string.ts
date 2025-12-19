import * as generatePassword from 'generate-password';

export function getRandomString(type: 'numeric' | 'alphanumeric', length: number) {
    switch (type) {
        case 'numeric': {
            let ret: string;
            do {
                ret = generatePassword.generate({
                    length,
                    uppercase: false,
                    lowercase: false,
                    symbols: false,
                    numbers: true,
                    strict: true
                });
            } while (ret.charAt(0) === '0');
            return ret;
        }
        case 'alphanumeric': {
            return generatePassword.generate({
                length,
                uppercase: true,
                lowercase: true,
                symbols: false,
                numbers: true,
                strict: true
            });
        }
    }
}
