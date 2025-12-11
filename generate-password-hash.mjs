// Generate bcrypt hash for password
import bcrypt from 'bcryptjs';

const password = '123456';
const hash = await bcrypt.hash(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nSQL Command:');
console.log(`UPDATE users SET password = '${hash}' WHERE email = 'requester@it';`);
