from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://prediccare_app:change-me-app@localhost:5432/prediccare"
    )
    migrate_database_url: str = (
        "postgresql+psycopg://prediccare:change-me@localhost:5432/prediccare"
    )
    app_db_user: str = "prediccare_app"
    app_db_password: str = "change-me-app"
    agent_db_user: str = "prediccare_agent"
    agent_db_password: str = "change-me-agent"
    bi_db_user: str = "prediccare_bi"
    bi_db_password: str = "change-me-bi"
    alert_threshold: float = 0.8
    drift_psi_threshold: float = 0.25
    pseudo_hmac_key: str = "change-me-pseudo"
    pii_encryption_key: str = "change-me-pii"
    admin_api_key: str = "change-me-admin"
    auth_token_secret: str = "change-me-auth"
    age_reference_year: int = 2026
    retention_identites_years: int = 5
    log_level: str = "INFO"
    rate_limit_login: int = 20
    rate_limit_admin: int = 10
    rate_limit_window_s: int = 60
    dataset_dir: str = "CohorteAI_datagen/dataset"
    labels_dir: str = "CohorteAI_datagen/labels"
    models_dir: str = "models"
    llm_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    llm_api_key: str = ""
    llm_model: str = "gemma-4-26b-a4b-it"
    llm_embed_base_url: str = ""
    llm_embed_api_key: str = ""
    llm_embed_model: str = "gemini-embedding-001"
    llm_embed_dimensions: int = 768
    rag_dir: str = "/corpus"
    rag_index_au_demarrage: bool = True
    assistant_cache_similarite: float = 0.92
    n8n_ocr_url: str = "http://n8n:5678/webhook/ocr"
    agent_statement_timeout_ms: int = 10000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def psycopg_database_url(self) -> str:
        return self.database_url.replace("postgresql+psycopg://", "postgresql://", 1)

    @property
    def psycopg_migrate_url(self) -> str:
        return self.migrate_database_url.replace("postgresql+psycopg://", "postgresql://", 1)

    @property
    def psycopg_agent_url(self) -> str:
        from urllib.parse import quote, urlsplit

        base = urlsplit(self.psycopg_database_url)
        hote = base.hostname or "localhost"
        port = f":{base.port}" if base.port else ""
        utilisateur = quote(self.agent_db_user, safe="")
        mot = quote(self.agent_db_password, safe="")
        return f"postgresql://{utilisateur}:{mot}@{hote}{port}{base.path}"


settings = Settings()
