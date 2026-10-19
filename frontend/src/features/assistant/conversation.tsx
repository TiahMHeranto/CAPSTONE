"use client";

import { useState } from "react";
import { Button, Champ } from "@/components/ui";
import { demander } from "@/features/assistant/api";
import { FormattedText } from "@/features/assistant/texte";
import { messageErreur, t } from "@/i18n/traduire";

type Source = { source?: string; page?: number | null };
type Message = { id: string; role: "user" | "assistant"; texte: string; sources: Source[]; sansSource: boolean };

const SUGGESTIONS = ["assistant.s1", "assistant.s2", "assistant.s3", "assistant.s4"];

export function Conversation({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [conseiller, setConseiller] = useState(false);

  async function envoyer(texte: string) {
    const propre = texte.trim().slice(0, 2000);
    if (!propre || enCours) return;
    setQuestion("");
    setMessages((liste) => [...liste, { id: `u-${liste.length}`, role: "user", texte: propre, sources: [], sansSource: false }]);
    setEnCours(true);
    const recu = await demander(propre);
    setEnCours(false);
    if (recu.status === 422) {
      setMessages((liste) => [
        ...liste,
        { id: `a-${liste.length}`, role: "assistant", texte: t("assistant.hors"), sources: [], sansSource: false },
      ]);
      return;
    }
    if (recu.status !== 200) {
      setMessages((liste) => [
        ...liste,
        { id: `a-${liste.length}`, role: "assistant", texte: messageErreur(recu.data), sources: [], sansSource: false },
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
      },
    ]);
  }

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col" : "flex h-[calc(100dvh-8rem)] flex-col"}>
      <header className="flex items-center justify-between gap-3 border-b border-border py-3">
        {compact ? (
          <h2 className="text-xl font-semibold">
          {t("assistant.titre")} <span className="rounded-md bg-primary-soft px-2 py-1 text-sm text-primary">{t("assistant.badge")}</span>
        </h2>
        ) : (
          <h1 className="text-xl font-semibold">
            {t("assistant.titre")} <span className="rounded-md bg-primary-soft px-2 py-1 text-sm text-primary">{t("assistant.badge")}</span>
          </h1>
        )}
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
