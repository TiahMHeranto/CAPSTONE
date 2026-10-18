const source = $input.first();
const entetes = source.json.headers || {};
const clef = entetes['x-ocr-key'] || '';
if (!clef || clef !== ($env.ADMIN_API_KEY || '')) {
  return [{ json: { ok: false, code: 'CLEF_REFUSEE', stop: true, files: [], count: 0 } }];
}

const files = [];
const binary = source.binary || {};
for (const key of Object.keys(binary)) {
  const bin = binary[key];
  if (!bin || !bin.data) continue;
  files.push({
    index: files.length,
    filename: bin.fileName || key,
    mime_type: bin.mimeType || 'application/pdf',
    base64: bin.data
  });
}

const corps = source.json.body && typeof source.json.body === 'object' ? source.json.body : source.json;
if (!files.length && Array.isArray(corps.files)) {
  for (const fichier of corps.files) {
    files.push({
      index: files.length,
      filename: fichier.filename || `fichier_${files.length}.pdf`,
      mime_type: fichier.mime_type || 'application/pdf',
      base64: fichier.base64 || null,
      texte: fichier.texte || null
    });
  }
}
if (!files.length && (corps.base64 || corps.texte)) {
  files.push({
    index: 0,
    filename: corps.filename || 'facture.pdf',
    mime_type: corps.mime_type || 'application/pdf',
    base64: corps.base64 || null,
    texte: corps.texte || null
  });
}

if (!files.length) {
  return [{ json: { ok: false, code: 'FICHIER_REFUSE', stop: true, files: [], count: 0 } }];
}
return [{ json: { ok: true, stop: false, files, count: files.length } }];
