"""Assemble n8n/workflows/ocr.json. Les scripts restent les fichiers .js."""

import json
from pathlib import Path

DOSSIER = Path(__file__).resolve().parent / "workflows"


def code(nom: str, fichier: str, x: int) -> dict:
    return {
        "parameters": {
            "mode": "runOnceForAllItems",
            "language": "javaScript",
            "jsCode": (DOSSIER / fichier).read_text(encoding="utf-8"),
        },
        "id": f"bbbbbbbb-bbbb-4bbb-8bbb-{x:012d}",
        "name": nom,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [x, 300],
    }


def http(nom: str, url: str, body: str, timeout: int, x: int) -> dict:
    return {
        "parameters": {
            "method": "POST",
            "url": url,
            "sendHeaders": True,
            "headerParameters": {
                "parameters": [
                    {"name": "Content-Type", "value": "application/json"},
                    {"name": "X-Admin-Key", "value": "={{ $env.ADMIN_API_KEY }}"},
                ]
            },
            "sendBody": True,
            "contentType": "json",
            "specifyBody": "json",
            "jsonBody": body,
            "options": {"timeout": timeout},
        },
        "id": f"cccccccc-cccc-4ccc-8ccc-{x:012d}",
        "name": nom,
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [x, 300],
        "onError": "continueErrorOutput",
    }


def echec(nom: str, code_erreur: str, x: int) -> dict:
    script = (
        "return [{ json: { ok: false, code: '%s', stop: true, factures: [] } }];" % code_erreur
    )
    noeud = code(nom, "ocr-regrouper.js", x)
    noeud["parameters"]["jsCode"] = script
    noeud["id"] = f"dddddddd-dddd-4ddd-8ddd-{x:012d}"
    noeud["position"] = [x, 520]
    return noeud


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
            "name": "Depot PDF",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [240, 300],
            "webhookId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        },
        code("Regrouper fichiers", "ocr-regrouper.js", 480),
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict",
                        "version": 2,
                    },
                    "conditions": [
                        {
                            "id": "c-stop",
                            "leftValue": "={{ $json.stop }}",
                            "rightValue": "",
                            "operator": {
                                "type": "boolean",
                                "operation": "true",
                                "singleValue": True,
                            },
                        }
                    ],
                    "combinator": "and",
                },
                "options": {},
            },
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
            "name": "Arret",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [720, 300],
        },
        http(
            "Lire le texte",
            "http://api:8000/invoices/ocr/lire",
            "={{ JSON.stringify({ files: $json.files }) }}",
            60000,
            960,
        ),
        code("Preparer le prompt", "ocr-prompt.js", 1200),
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict",
                        "version": 2,
                    },
                    "conditions": [
                        {
                            "id": "c-stop-2",
                            "leftValue": "={{ $json.stop }}",
                            "rightValue": "",
                            "operator": {
                                "type": "boolean",
                                "operation": "true",
                                "singleValue": True,
                            },
                        }
                    ],
                    "combinator": "and",
                },
                "options": {},
            },
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
            "name": "Texte absent",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [1440, 300],
        },
        code("Extraction Ollama", "ocr-extraire.js", 1680),
        code("Parser et eclater", "ocr-parser.js", 1920),
        code("Assembler", "ocr-assembler.js", 2160),
        echec("Echec lecture", "LECTURE_INDISPONIBLE", 960),
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ JSON.stringify($json) }}",
                "options": {},
            },
            "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
            "name": "Reponse",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [2400, 300],
        },
    ],
    "connections": {
        "Depot PDF": {"main": [[{"node": "Regrouper fichiers", "type": "main", "index": 0}]]},
        "Regrouper fichiers": {"main": [[{"node": "Arret", "type": "main", "index": 0}]]},
        "Arret": {
            "main": [
                [{"node": "Reponse", "type": "main", "index": 0}],
                [{"node": "Lire le texte", "type": "main", "index": 0}],
            ]
        },
        "Lire le texte": {
            "main": [
                [{"node": "Preparer le prompt", "type": "main", "index": 0}],
                [{"node": "Echec lecture", "type": "main", "index": 0}],
            ]
        },
        "Preparer le prompt": {"main": [[{"node": "Texte absent", "type": "main", "index": 0}]]},
        "Texte absent": {
            "main": [
                [{"node": "Reponse", "type": "main", "index": 0}],
                [{"node": "Extraction Ollama", "type": "main", "index": 0}],
            ]
        },
        "Extraction Ollama": {"main": [[{"node": "Parser et eclater", "type": "main", "index": 0}]]},
        "Parser et eclater": {"main": [[{"node": "Assembler", "type": "main", "index": 0}]]},
        "Assembler": {"main": [[{"node": "Reponse", "type": "main", "index": 0}]]},
        "Echec lecture": {"main": [[{"node": "Reponse", "type": "main", "index": 0}]]},
    },
    "settings": {
        "executionOrder": "v1",
        "timezone": "Indian/Antananarivo",
        "saveDataSuccessExecution": "none",
        "saveDataErrorExecution": "none",
        "binaryMode": "separate",
    },
    "pinData": {},
    "meta": {"templateCredsSetupCompleted": True},
}

(DOSSIER / "ocr.json").write_text(
    json.dumps(workflow, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print("ocr.json", len(workflow["nodes"]))
