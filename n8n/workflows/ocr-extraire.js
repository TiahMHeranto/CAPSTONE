const url = ($env.OLLAMA_URL || 'http://host.docker.internal:11434').replace(/\/$/, '') + '/api/chat';
try {
  const recu = await this.helpers.httpRequest({
    method: 'POST',
    url,
    body: $json.requete,
    json: true,
    timeout: 120000
  });
  const raw = recu.message?.content ?? recu.response ?? '';
  return [{ json: { raw, extraits: $json.extraits || [] } }];
} catch (error) {
  return [{ json: { error: 'modele', code: 'MODELE_INDISPONIBLE' } }];
}
