const fs = require('fs');
const path = require('path');
const https = require('https');

const ebtregasDir = "C:\\Users\\HAYDER\\Pictures\\proyecto de arqui\\Proyecto_Arquitectura\\entregas corte 2";
const diagDir = path.join(ebtregasDir, 'diagramas');

if (!fs.existsSync(diagDir)) {
  fs.mkdirSync(diagDir, { recursive: true });
}

const filesToParse = [
  { name: 'c4_componentes.md', path: path.join(ebtregasDir, 'c4_componentes.md') },
  { name: 'vistas_4plus1.md', path: path.join(ebtregasDir, 'vistas_4plus1.md') },
  { name: 'evaluacion_calidad.md', path: path.join(ebtregasDir, 'evaluacion_calidad.md') },
  { name: 'despliegue.md', path: path.join(ebtregasDir, 'despliegue.md') }
];

function downloadSvg(base64Code, destPath, callback) {
  const url = `https://mermaid.ink/svg/${base64Code}`;
  https.get(url, (res) => {
    if (res.statusCode !== 200) {
      callback(new Error(`Failed to download: ${res.statusCode} ${res.statusMessage}`));
      return;
    }
    const fileStream = fs.createWriteStream(destPath);
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      callback(null);
    });
  }).on('error', (err) => {
    callback(err);
  });
}

async function run() {
  let diagramCount = 0;
  for (const fileObj of filesToParse) {
    if (!fs.existsSync(fileObj.path)) {
      console.log(`Skipping missing file: ${fileObj.name}`);
      continue;
    }
    console.log(`Parsing ${fileObj.name}...`);
    const content = fs.readFileSync(fileObj.path, 'utf8');
    
    // Find all ```mermaid blocks
    const regex = /```mermaid\s+([\s\S]*?)```/g;
    let match;
    let fileDiagCount = 0;
    while ((match = regex.exec(content)) !== null) {
      diagramCount++;
      fileDiagCount++;
      const mermaidCode = match[1].trim();
      const base64Code = Buffer.from(mermaidCode).toString('base64');
      
      // Generate a clean name
      let diagName = `${fileObj.name.replace('.md', '')}_diag_${fileDiagCount}`;
      
      // Extract the nearest preceding header to name the file cleanly
      const preContent = content.substring(0, match.index);
      const lines = preContent.trim().split('\n');
      let cleanTitle = '';
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('#')) {
          cleanTitle = line.replace(/#/g, '').trim().toLowerCase()
            .replace(/[^a-z0-9\s-_]/g, '')
            .replace(/[\s-]+/g, '_');
          break;
        }
      }
      if (cleanTitle) {
        diagName = cleanTitle;
      }
      
      const destPath = path.join(diagDir, `${diagName}.svg`);
      console.log(`Downloading diagram: ${diagName}.svg...`);
      
      await new Promise((resolve) => {
        downloadSvg(base64Code, destPath, (err) => {
          if (err) {
            console.error(`  ❌ Error: ${err.message}`);
          } else {
            console.log(`  ✅ Saved to ${destPath}`);
            // Check file size, if 0 delete it
            try {
              const stats = fs.statSync(destPath);
              if (stats.size === 0) {
                fs.unlinkSync(destPath);
                console.error(`  ❌ Error: File is empty, deleted.`);
              }
            } catch (e) {}
          }
          resolve();
        });
      });
    }
  }
  console.log('All diagrams processed!');
}

run();
