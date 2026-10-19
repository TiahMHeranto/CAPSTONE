"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Champ } from "@/components/ui";
import { demander } from "@/features/assistant/api";
import { FormattedText } from "@/features/assistant/texte";
import { messageErreur, t } from "@/i18n/traduire";

type Source = { source?: string; page?: number | null };
type Message = {
  id: string;
  role: "user" | "assistant";
  texte: string;
  sources: Source[];
  sansSource: boolean;
  raisonnement: string;
};
type Onglet = "chat" | "base";

const SUGGESTIONS = ["assistant.s1", "assistant.s2", "assistant.s3", "assistant.s4"];
const VISAGES = ["#0b7a75", "#178f7c", "#1d5fd1", "#0b2545"];

function IconeBulle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function IconeLivre() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3" />
    </svg>
  );
}

function IconeEnvoi() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M4 12 20 4l-6 16-2.5-6.5z" />
    </svg>
  );
}

function IconePersonne() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-white">
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19c.8-3 2.8-4.5 6-4.5s5.2 1.5 6 4.5" />
    </svg>
  );
}

export function Conversation({
  compact = false,
  depart = "chat",
  demande = null,
}: {
  compact?: boolean;
  depart?: Onglet;
  demande?: { id: number; texte: string } | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [conseiller, setConseiller] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>(depart);
  const derniereDemande = useRef(0);

  useEffect(() => {
    if (compact) setOnglet(depart);
  }, [compact, depart]);

  useEffect(() => {
    if (!demande || demande.id === derniereDemande.current) return;
    derniereDemande.current = demande.id;
    void envoyer(demande.texte);
  }, [demande]);

  async function envoyer(texte: string) {
    const propre = texte.trim().slice(0, 2000);
    if (!propre || enCours) return;
    setQuestion("");
    setMessages((liste) => [...liste, { id: `u-${liste.length}`, role: "user", texte: propre, sources: [], sansSource: false, raisonnement: "" }]);
    setEnCours(true);
    let recu;
    try {
      recu = await demander(propre);
    } catch {
      setEnCours(false);
      setMessages((liste) => [
        ...liste,
        { id: `a-${liste.length}`, role: "assistant", texte: t("erreur"), sources: [], sansSource: false, raisonnement: "" },
      ]);
      return;
    }
    setEnCours(false);
    if (recu.status === 422) {
      setMessages((liste) => [
        ...liste,
        { id: `a-${liste.length}`, role: "assistant", texte: t("assistant.hors"), sources: [], sansSource: false, raisonnement: "" },
      ]);
      return;
    }
    if (recu.status !== 200) {
      const texte =
        recu.data.code === "MODELE_INDISPONIBLE" ? t("assistant.indisponible") : messageErreur(recu.data);
      setMessages((liste) => [
        ...liste,
        { id: `a-${liste.length}`, role: "assistant", texte, sources: [], sansSource: false, raisonnement: "" },
      ]);
      return;
    }
    const sources = Array.isArray(recu.data.sources) ? (recu.data.sources as Source[]) : [];
    setMessages((liste) => [
      ...liste,
      {
        id: `a-${liste.length}`,
        role: "assistant",
        texte: String(recu.data.reponse ?? ""),
        sources,
        sansSource: sources.length === 0,
        raisonnement: String(recu.data.raisonnement ?? ""),
      },
    ]);
  }

  if (compact) {
    const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return (
      <div className="flex h-full min-h-0 flex-col bg-white text-foreground">
        <div className="flex gap-1 border-b border-border px-3 py-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={onglet === "chat"}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm ${onglet === "chat" ? "bg-primary-soft font-medium text-primary" : "text-muted"}`}
            onClick={() => setOnglet("chat")}
          >
            <IconeBulle />
            {t("assistant.ongletChat")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={onglet === "base"}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm ${onglet === "base" ? "bg-primary-soft font-medium text-primary" : "text-muted"}`}
            onClick={() => setOnglet("base")}
          >
            <IconeLivre />
            {t("assistant.ongletBase")}
          </button>
        </div>
        {onglet === "base" ? (
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            <p className="text-sm text-muted">{t("assistant.accueil")}</p>
            {SUGGESTIONS.map((cle) => (
              <button
                key={cle}
                type="button"
                className="block min-h-11 w-full rounded-2xl border border-border px-3 py-2 text-left text-sm hover:bg-primary-soft"
                onClick={() => {
                  setOnglet("chat");
                  void envoyer(t(cle));
                }}
              >
                {t(cle)}
              </button>
            ))}
            <Button variante="secondary" className="mt-2 w-full" type="button" onClick={() => setConseiller(true)}>
              {t("assistant.conseiller")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3" role="log" aria-live="polite" aria-busy={enCours}>
              <div className="rounded-2xl bg-primary px-4 py-5 text-primary-foreground">
                <div className="flex">
                  {VISAGES.map((couleur) => (
                    <span
                      key={couleur}
                      className="-ml-2 grid h-9 w-9 place-items-center rounded-full border-2 border-white first:ml-0"
                      style={{ background: couleur }}
                    >
                      <IconePersonne />
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-lg font-semibold leading-snug">{t("assistant.teaser")}</p>
                <p className="mt-1 text-sm text-white/85">{t("assistant.delai")}</p>
              </div>
              <p className="text-center text-xs capitalize text-muted">{date}</p>
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-white px-3 py-2 text-sm"
                  }
                >
                  {message.role === "assistant" ? <FormattedText texte={message.texte} /> : <p>{message.texte}</p>}
                  {message.sansSource ? <p className="mt-2 text-xs text-risk-medium">{t("assistant.sansSource")}</p> : null}
                  {message.sources.length ? (
                    <details className="mt-2 text-xs">
                      <summary>
                        {t("assistant.sources")} · {message.sources.length}
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {message.sources.map((source) => (
                          <li key={`${source.source}-${source.page}`}>
                            {source.source}
                            {source.page ? ` · p. ${source.page}` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {message.raisonnement ? (
                    <details className="mt-2 text-xs">
                      <summary>{t("assistant.raisonnement")}</summary>
                      <p className="mt-2 whitespace-pre-wrap text-muted">{message.raisonnement}</p>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
            <form
              className="px-3 pb-3"
              onSubmit={(event) => {
                event.preventDefault();
                void envoyer(question);
              }}
            >
              <div className="flex items-center gap-2 rounded-full border border-border bg-white pl-4 pr-1">
                <label className="sr-only" htmlFor="question-widget">
                  {t("assistant.message")}
                </label>
                <input
                  id="question-widget"
                  className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  value={question}
                  maxLength={2000}
                  placeholder={t("assistant.message")}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void envoyer(question);
                    }
                  }}
                />
                <button
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                  disabled={enCours || !question.trim()}
                  type="submit"
                  aria-label={t("assistant.envoyer")}
                >
                  <IconeEnvoi />
                </button>
              </div>
              <p className="mt-2 px-2 text-xs text-muted">{t("assistant.avertissement")}</p>
            </form>
          </>
        )}
        {conseiller ? (
          <dialog open className="rounded-2xl border border-border bg-white p-4 text-foreground">
            <p>{t("assistant.conseillerTexte")}</p>
            <Button className="mt-3" type="button" onClick={() => setConseiller(false)}>
              {t("annuler")}
            </Button>
          </dialog>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border py-3">
        <h1 className="text-xl font-semibold">
            {t("assistant.titre")} <span className="rounded-md bg-primary-soft px-2 py-1 text-sm text-primary">{t("assistant.badge")}</span>
          </h1>
        <Button variante="secondary" type="button" onClick={() => setConseiller(true)}>
          {t("assistant.conseiller")}
        </Button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto py-4" role="log" aria-live="polite" aria-busy={enCours}>
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl">
            <p>{t("assistant.accueil")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((cle) => (
                <Button key={cle} variante="secondary" type="button" onClick={() => envoyer(t(cle))}>
                  {t(cle)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <article key={message.id} className={message.role === "user" ? "ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-primary-soft p-3" : "max-w-xl rounded-lg border border-border bg-surface p-3"}>
            {message.role === "assistant" ? <FormattedText texte={message.texte} /> : <p>{message.texte}</p>}
            {message.sansSource ? <p className="mt-2 text-sm text-risk-medium">{t("assistant.sansSource")}</p> : null}
            {message.sources.length ? (
              <details className="mt-2 text-sm">
                <summary>
                  {t("assistant.sources")} · {message.sources.length}
                </summary>
                <ul className="mt-2 space-y-1">
                  {message.sources.map((source) => (
                    <li key={`${source.source}-${source.page}`}>
                      {source.source}
                      {source.page ? ` · p. ${source.page}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {message.raisonnement ? (
              <details className="mt-2 text-sm">
                <summary>{t("assistant.raisonnement")}</summary>
                <p className="mt-2 whitespace-pre-wrap text-muted">{message.raisonnement}</p>
              </details>
            ) : null}
          </article>
        ))}
      </div>
      <form
        className="border-t border-border pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void envoyer(question);
        }}
      >
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="question">
            {t("assistant.placeholder")}
          </label>
          <Champ
            id="question"
            value={question}
            maxLength={2000}
            placeholder={t("assistant.placeholder")}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void envoyer(question);
              }
            }}
          />
          <Button disabled={enCours || !question.trim()} type="submit">
            {t("assistant.envoyer")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">{t("assistant.avertissement")}</p>
      </form>
      {conseiller ? (
        <dialog open className="rounded-lg border border-border bg-surface p-4">
          <p>{t("assistant.conseillerTexte")}</p>
          <Button className="mt-3" type="button" onClick={() => setConseiller(false)}>
            {t("annuler")}
          </Button>
        </dialog>
      ) : null}
    </div>
  );
}
