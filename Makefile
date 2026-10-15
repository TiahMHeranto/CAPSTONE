.PHONY: up down test lint migrate backup restore

up:
	docker compose up --build

down:
	docker compose down

test:
	python -m pytest

lint:
	python -m ruff check backend
	python -m ruff format --check backend

migrate:
	docker compose run --rm migrate

backup:
	docker compose exec db /backup/backup.sh

restore:
	docker compose exec db /backup/restore.sh
