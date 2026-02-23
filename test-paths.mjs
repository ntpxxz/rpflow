import path from 'path';
import fs from 'fs';

function testPath(imagePath) {
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const filePath = path.join(process.cwd(), 'public', cleanPath);
    console.log(`Input: ${imagePath}`);
    console.log(`Clean: ${cleanPath}`);
    console.log(`Result: ${filePath}`);
    console.log(`Exists: ${fs.existsSync(filePath)}`);
    console.log('---');
}

// Mocking process.cwd() as if we are in the project root
const mockCwd = 'd:\\SAM\\RPF\\rpflow';
const originalCwd = process.cwd;
process.cwd = () => mockCwd;

testPath('/api/uploads/1740280145244-0.png');
testPath('uploads/Logo_minebeamitsumi.png');
testPath('/uploads/Logo_minebeamitsumi.png');

process.cwd = originalCwd;
