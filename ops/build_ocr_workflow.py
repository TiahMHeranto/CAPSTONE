"""Assemble n8n/workflows/ocr.json. Les $ du script restent intacts."""

import json
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SCRIPT = (RACINE / "n8n" / "workflows" / "ocr.js").read_text(encoding="utf-8")

GARDE = """const item = $input.first();
const entetes = item.json.headers || {};
const clef = entetes['x-ocr-key'] || '';
if (!clef || clef !== ($env.ADMIN_API_KEY || '')) {
  return [{ json: { httpStatus: 401, body: { code: 'CLEF_REFUSEE', motif: 'clef absente' } } }];
}
return [{ json: { authorization: entetes.authorization || entetes.Authorization || '' }, binary: item.binary }];
"""

ILLISIBLE = """return [{ json: { httpStatus: 422, body: { code: 'PDF_ILLISIBLE', motif: 'le PDF ne peut pas etre lu' } } }];
"""

PREPARER = """const recu = $input.first().json;
const status = Number(recu.statusCode || recu.status || 502);
const body = recu.body !== undefined ? recu.body : recu;
return [{ json: { httpStatus: status, body } }];
"""


def code(nom: str, js: str, identifiant: str, x: int) -> dict:
    return {
        "parameters": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": js},
        "id": identifiant,
        "name": nom,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [x, 300],
    }


def condition(nom: str, identifiant: str, x: int, gauche: str, droite: str, cid: str) -> dict:
    return {
        "parameters": {
            "conditions": {
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "loose",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": cid,
                        "leftValue": gauche,
                        "rightValue": droite,
                        "operator": {"type": "string", "operation": "equals"},
                    }
                ],
                "combinator": "and",
            },
            "options": {},
        },
        "id": identifiant,
        "name": nom,
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [x, 300],
    }


workflow = {
    "id": "S42hzUxzWj7nHPBt",
    "name": "PrediCare OCR facture",
    "active": False,
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "ocr",
                "responseMode": "responseNode",
                "options": {},
            },
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
            "name": "Reception",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [240, 300],
            "webhookId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        },
        code("Garde", GARDE, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", 460),
        condition(
            "Clef refusee",
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
            680,
            "={{ $json.httpStatus ?? '' }}",
            "401",
            "c-clef",
        ),
        {
            "parameters": {"operation": "pdf", "binaryPropertyName": "data", "options": {}},
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
            "name": "Extraire PDF",
            "type": "n8n-nodes-base.extractFromFile",
            "typeVersion": 1,
            "position": [900, 420],
            "onError": "continueErrorOutput",
        },
        code("Illisible", ILLISIBLE, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5", 1120),
        code("Champs", SCRIPT, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6", 1120),
        condition(
            "Incomplet",
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7",
            1340,
            "={{ $json.httpStatus ?? '' }}",
            "422",
            "c-incomplet",
        ),
        {
            "parameters": {
                "method": "POST",
                "url": "http://api:8000/invoices",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "Authorization", "value": "={{ $json.authorization }}"},
                        {"name": "Content-Type", "value": "application/json"},
                    ]
                },
                "sendBody": True,
                "contentType": "json",
                "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify($json.facture) }}",
                "options": {
                    "timeout": 20000,
                    "response": {"response": {"fullResponse": True, "neverError": True}},
                },
            },
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8",
            "name": "Deposer",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1560, 480],
        },
        code("Reponse depot", PREPARER, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9", 1780),
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ JSON.stringify($json.body) }}",
                "options": {"responseCode": "={{ $json.httpStatus }}"},
            },
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
            "name": "Reponse",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [2000, 300],
        },
    ],
    "connections": {
        "Reception": {"main": [[{"node": "Garde", "type": "main", "index": 0}]]},
        "Garde": {"main": [[{"node": "Clef refusee", "type": "main", "index": 0}]]},
        "Clef refusee": {
            "main": [
                [{"node": "Reponse", "type": "main", "index": 0}],
                [{"node": "Extraire PDF", "type": "main", "index": 0}],
            ]
        },
        "Extraire PDF": {
            "main": [
                [{"node": "Champs", "type": "main", "index": 0}],
                [{"node": "Illisible", "type": "main", "index": 0}],
            ]
        },
        "Illisible": {"main": [[{"node": "Reponse", "type": "main", "index": 0}]]},
        "Champs": {"main": [[{"node": "Incomplet", "type": "main", "index": 0}]]},
        "Incomplet": {
            "main": [
                [{"node": "Reponse", "type": "main", "index": 0}],
                [{"node": "Deposer", "type": "main", "index": 0}],
            ]
        },
        "Deposer": {"main": [[{"node": "Reponse depot", "type": "main", "index": 0}]]},
        "Reponse depot": {"main": [[{"node": "Reponse", "type": "main", "index": 0}]]},
    },
    "settings": {
        "executionOrder": "v1",
        "timezone": "Indian/Antananarivo",
        "saveDataSuccessExecution": "none",
        "saveDataErrorExecution": "none",
    },
    "pinData": {},
    "meta": {"templateCredsSetupCompleted": True},
}

destination = RACINE / "n8n" / "workflows" / "ocr.json"
destination.write_text(json.dumps(workflow, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(destination.name)
