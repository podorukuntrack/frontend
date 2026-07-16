const fs = require('fs');
const path = require('path');

const targetDir = 'd:/Podorukuntrack/frontend/src/pages/projects';

function walkAndReplace(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkAndReplace(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const before = content;
      
      // Replace isRole('super_admin', 'admin') or isRole("super_admin", "admin") including newlines
      content = content.replace(/isRole\(\s*['"]super_admin['"]\s*,\s*['"]admin['"]\s*\)/g, "isRole('admin')");
      content = content.replace(/isRole\(\s*['"]admin['"]\s*,\s*['"]super_admin['"]\s*\)/g, "isRole('admin')");
      
      if (content !== before) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walkAndReplace(targetDir);
console.log('Done');
