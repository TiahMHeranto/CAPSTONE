const base = String($env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
const clef = String($env.LLM_API_KEY || '');
const modele = String($env.LLM_MODEL || 'gemma-4-26b-a4b-it');
const ollama = String($env.OLLAMA_URL || 'http://host.docker.internal:11434').replace(/\/$/, '');
const modeleLocal = String($env.OLLAMA_MODEL || 'llama3.2');

function consigne() {
  const contenu = $json.requete?.contents?.[0]?.parts?.[0]?.text;
  return typeof contenu === 'string' ? contenu : '';
}

async function appelLocal() {
  const recu = await this.helpers.httpRequest({
    method: 'POST',
    url: ollama + '/api/chat',
    body: {
      model: modeleLocal,
      stream: false,
      keep_alive: -1,
      messages: [{ role: 'user', content: consigne() }]
    },
    json: true,
    timeout: 180000
  });
  return (recu.message && recu.message.content) || '';
}

try {
  if (!clef) throw new Error('clef absente');
  const url = base + '/models/' + encodeURIComponent(modele) + ':generateContent';
  const recu = await this.helpers.httpRequest({
    method: 'POST',
    url,
    headers: { 'x-goog-api-key': clef },
    body: $json.requete,
    json: true,
    timeout: 120000
  });
  const parts = recu.candidates?.[0]?.content?.parts || [];
  const raw = parts.filter((part) => !part.thought).map((part) => part.text || '').join('');
  if (!raw) throw new Error('reponse vide');
  return [{ json: { raw, extraits: $json.extraits || [] } }];
} catch (error) {
  try {
    const raw = await appelLocal.call(this);
    if (!raw) throw new Error('reponse vide');
    return [{ json: { raw, extraits: $json.extraits || [], moteur: 'ollama' } }];
  } catch (second) {
    return [{ json: { error: 'modele', code: 'MODELE_INDISPONIBLE' } }];
  }
}
