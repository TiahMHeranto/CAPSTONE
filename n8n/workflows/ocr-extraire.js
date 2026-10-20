const base = String($env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
const clef = String($env.LLM_API_KEY || '');
const modele = String($env.LLM_MODEL || 'gemma-4-26b-a4b-it');
if (!clef) {
  return [{ json: { error: 'modele', code: 'MODELE_INDISPONIBLE' } }];
}
const url = base + '/models/' + encodeURIComponent(modele) + ':generateContent';
try {
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
  return [{ json: { raw, extraits: $json.extraits || [] } }];
} catch (error) {
  return [{ json: { error: 'modele', code: 'MODELE_INDISPONIBLE' } }];
}
