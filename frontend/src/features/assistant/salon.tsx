"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { demander } from "@/features/assistant/api";
import { TexteAssistant } from "@/features/assistant/markdown";
import {
  LIMITE,
  TITRE_NEUF,
  creerFil,
  ecrireBrouillon,
  ecrireFils,
  ecrireSon,
  lireBrouillon,
  lireFils,
  lireSon,
  messageVide,
  titreDepuis,
  versMarkdown,
  type CodeErreur,
  type Fil,
  type Message,
  type Piece,
} from "@/features/assistant/stockage";
import { t } from "@/i18n/traduire";

const ATTENTE_MS = 75_000;
const SUGGESTIONS = ["assistant.s1", "assistant.s2", "assistant.s3", "assistant.s4"];
const RELANCES = ["assistant.relance1", "assistant.relance2"];

function jour(date: number): string {
  const valeur = new Date(date);
  const aujourdhui = new Date();
  const hier = new Date();
  hier.setDate(aujourdhui.getDate() - 1);
  if (valeur.toDateString() === aujourdhui.toDateString()) return t("assistant.aujourdHui");
  if (valeur.toDateString() === hier.toDateString()) return t("assistant.hier");
  return valeur.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function heure(date: number): string {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function reduit(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tactile(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

function texteErreur(code: CodeErreur): string {
  if (code === "hors") return t("assistant.hors");
  if (code === "limite") return t("assistant.limite");
  if (code === "delai") return t("assistant.delaiReponse");
  if (code === "indisponible") return t("assistant.indisponible");
  if (code === "reseau") return t("assistant.reseau");
  if (code === "interrompu") return t("assistant.interrompu");
  return t("erreur");
}

function codeDe(status: number, data: Record<string, unknown>): CodeErreur {
  if (status === 200) return "";
  if (status === 422) return "hors";
  if (status === 429) return "limite";
  if (data.code === "DELAI") return "delai";
  if (data.code === "MODELE_INDISPONIBLE" || status === 503) return "indisponible";
  if (status === 0) return "reseau";
  return "generique";
}

function attendre(): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve({ status: 0, data: { code: "DELAI" } }), ATTENTE_MS);
  });
}

function bip() {
  const contexte = new AudioContext();
  const osc = contexte.createOscillator();
  const gain = contexte.createGain();
  osc.frequency.value = 640;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(contexte.destination);
  osc.start();
  osc.stop(contexte.currentTime + 0.07);
  osc.onended = () => void contexte.close();
}

export function Salon() {
  const router = useRouter();
  const params = useSearchParams();
  const [pret, setPret] = useState(false);
  const [fils, setFils] = useState<Fil[]>([]);
  const [actif, setActif] = useState("");
  const [manquant, setManquant] = useState(false);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [ligne, setLigne] = useState(true);
  const [menu, setMenu] = useState(false);
  const [archives, setArchives] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("");
  const [aide, setAide] = useState(false);
  const [son, setSon] = useState(false);
  const [notif, setNotif] = useState(false);
  const [loin, setLoin] = useState(false);
  const [nouveaux, setNouveaux] = useState(0);
  const [debut, setDebut] = useState(0);
  const [copie, setCopie] = useState("");
  const [menuMessage, setMenuMessage] = useState("");
  const [renomme, setRenomme] = useState("");
  const [confirm, setConfirm] = useState<null | { type: "fil" | "message" | "tout"; id: string }>(null);
  const [avisOuvert, setAvisOuvert] = useState("");
  const [avisTexte, setAvisTexte] = useState("");
  const [fichiers, setFichiers] = useState<Piece[]>([]);
  const [depot, setDepot] = useState(false);
  const [clavier, setClavier] = useState(0);
  const zone = useRef<HTMLDivElement>(null);
  const saisie = useRef<HTMLTextAreaElement>(null);
  const rechercheRef = useRef<HTMLInputElement>(null);
  const colle = useRef(true);
  const premier = useRef(true);
  const ticket = useRef(0);
  const departTouche = useRef(0);
  const demarre = useRef(false);
  const fileEnCours = useRef(new Set<string>());

  const fil = fils.find((item) => item.id === actif) ?? null;
  const visibles = fils
    .filter((item) => (archives ? item.archive : !item.archive))
    .filter((item) => {
      if (!filtre) return true;
      return item.titre.toLowerCase().includes(filtre) || item.messages.some((message) => message.texte.toLowerCase().includes(filtre));
    })
    .sort((a, b) => Number(b.epingle) - Number(a.epingle) || b.maj - a.maj);

  useEffect(() => {
    if (demarre.current) return;
    demarre.current = true;
    const charges = lireFils();
    const demande = params.get("c");
    const trouve = charges.find((item) => item.id === demande);
    if (demande && !trouve) {
      setFils(charges);
      setManquant(true);
      setPret(true);
      return;
    }
    const choisi = trouve ?? charges.find((item) => !item.archive) ?? charges[0] ?? creerFil();
    const liste = charges.some((item) => item.id === choisi.id) ? charges : [choisi, ...charges];
    setFils(liste);
    setActif(choisi.id);
    setQuestion(lireBrouillon(choisi.id));
    setSon(lireSon());
    setLigne(navigator.onLine);
    if (params.get("c") !== choisi.id) router.replace(`/assistant?c=${choisi.id}`);
    setPret(true);
    saisie.current?.focus();
  }, [params, router]);

  useEffect(() => {
    if (pret) ecrireFils(fils);
  }, [fils, pret]);

  useEffect(() => {
    const timer = window.setTimeout(() => setFiltre(recherche.trim().toLowerCase()), 200);
    return () => window.clearTimeout(timer);
  }, [recherche]);

  useEffect(() => {
    if (!pret || !actif) return;
    const timer = window.setTimeout(() => ecrireBrouillon(actif, question), 300);
    return () => window.clearTimeout(timer);
  }, [question, actif, pret]);

  useEffect(() => {
    function maj() {
      setLigne(navigator.onLine);
    }
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  useEffect(() => {
    const vue = window.visualViewport;
    if (!vue) return;
    function mesurer() {
      if (!vue) return;
      setClavier(Math.max(0, window.innerHeight - vue.height - vue.offsetTop));
    }
    vue.addEventListener("resize", mesurer);
    vue.addEventListener("scroll", mesurer);
    return () => {
      vue.removeEventListener("resize", mesurer);
      vue.removeEventListener("scroll", mesurer);
    };
  }, []);

  useEffect(() => {
    const base = "PrediCare TPA";
    if (!notif) return;
    document.title = `${t("assistant.reponsePrete")} · ${base}`;
    function voir() {
      if (!document.hidden) {
        document.title = base;
        setNotif(false);
      }
    }
    document.addEventListener("visibilitychange", voir);
    return () => {
      document.title = base;
      document.removeEventListener("visibilitychange", voir);
    };
  }, [notif]);

  const signature = `${fil?.id}|${fil?.messages.length}|${enCours}`;
  useEffect(() => {
    const el = zone.current;
    if (!el || !fil) return;
    if (!colle.current) {
      if (!premier.current) setNouveaux((valeur) => valeur + 1);
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: premier.current || reduit() ? "auto" : "smooth" });
    premier.current = false;
    setNouveaux(0);
    // La signature couvre l'arrivée d'un message et l'état d'envoi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  function ouvrir(id: string) {
    setActif(id);
    setQuestion(lireBrouillon(id));
    setManquant(false);
    setMenu(false);
    setDebut(0);
    colle.current = true;
    premier.current = true;
    setLoin(false);
    setNouveaux(0);
    router.replace(`/assistant?c=${id}`);
    saisie.current?.focus();
  }

  function creer() {
    const neuf = creerFil();
    setFils((liste) => [neuf, ...liste]);
    ouvrir(neuf.id);
  }

  function changer(id: string, fn: (fil: Fil) => Fil) {
    setFils((liste) => liste.map((item) => (item.id === id ? fn(item) : item)));
  }

  function suivre() {
    const el = zone.current;
    if (!el) return;
    const enBas = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    colle.current = enBas;
    setLoin(!enBas);
    if (enBas) setNouveaux(0);
  }

  function descendre() {
    colle.current = true;
    setLoin(false);
    zone.current?.scrollTo({ top: zone.current.scrollHeight, behavior: reduit() ? "auto" : "smooth" });
    setNouveaux(0);
  }

  function ajuster(element: HTMLTextAreaElement) {
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 192)}px`;
  }

  function ajouterFichiers(liste: FileList | File[]) {
    const suivants = Array.from(liste).slice(0, 4).map((fichier) => ({
      nom: fichier.name,
      apercu: fichier.type.startsWith("image/") ? URL.createObjectURL(fichier) : undefined,
    }));
    setFichiers((courant) => [...courant, ...suivants].slice(0, 4));
  }

  function retirerFichier(nom: string) {
    setFichiers((courant) => {
      const cible = courant.find((piece) => piece.nom === nom);
      if (cible?.apercu) URL.revokeObjectURL(cible.apercu);
      return courant.filter((piece) => piece.nom !== nom);
    });
  }

  async function interroger(idFil: string, texte: string, idUser: string) {
    setEnCours(true);
    const jeton = ++ticket.current;
    const depart = Date.now();
    changer(idFil, (courant) => ({
      ...courant,
      messages: courant.messages.map((message) => (message.id === idUser ? { ...message, etat: "envoi" } : message)),
    }));
    let recu: { status: number; data: Record<string, unknown> };
    try {
      recu = await Promise.race([demander(texte), attendre()]);
    } catch {
      recu = { status: 0, data: { code: "RESEAU" } };
    }
    if (jeton !== ticket.current) return;
    setEnCours(false);
    const code = codeDe(recu.status, recu.data);
    const sources = Array.isArray(recu.data.sources) ? (recu.data.sources as Message["sources"]) : [];
    const reponse = messageVide("assistant", code ? texteErreur(code) : String(recu.data.reponse ?? ""));
    reponse.erreur = code;
    reponse.sources = code ? [] : sources;
    reponse.sansSource = !code && sources.length === 0;
    reponse.raisonnement = code ? "" : String(recu.data.raisonnement ?? "");
    const etat: Message["etat"] = code && code !== "hors" ? "erreur" : "envoye";
    changer(idFil, (courant) => ({
      ...courant,
      maj: Date.now(),
      messages: [
        ...courant.messages.map((message) => (message.id === idUser ? { ...message, etat } : message)),
        reponse,
      ],
    }));
    if (son && Date.now() - depart > 8000) bip();
    if (document.hidden) setNotif(true);
    saisie.current?.focus();
  }

  async function envoyer(brut?: string) {
    const texte = (brut ?? question).trim().slice(0, LIMITE);
    if (enCours) return;
    if (texte === "/help") {
      setAide(true);
      setQuestion("");
      return;
    }
    if (texte === "/reset") {
      creer();
      return;
    }
    if (!texte || !actif) return;
    const pieces = fichiers.map((piece) => ({ nom: piece.nom }));
    fichiers.forEach((piece) => {
      if (piece.apercu) URL.revokeObjectURL(piece.apercu);
    });
    setFichiers([]);
    setQuestion("");
    ecrireBrouillon(actif, "");
    const utilisateur = messageVide("user", texte);
    utilisateur.etat = navigator.onLine ? "envoi" : "file";
    utilisateur.pieces = pieces;
    colle.current = true;
    changer(actif, (courant) => ({
      ...courant,
      titre: courant.titre === TITRE_NEUF ? titreDepuis(texte) : courant.titre,
      maj: Date.now(),
      messages: [...courant.messages, utilisateur],
    }));
    if (!navigator.onLine) return;
    await interroger(actif, texte, utilisateur.id);
  }

  useEffect(() => {
    if (!ligne || !fil) return;
    for (const message of fil.messages) {
      if (message.role !== "user" || message.etat !== "file" || fileEnCours.current.has(message.id)) continue;
      fileEnCours.current.add(message.id);
      void interroger(fil.id, message.texte, message.id).finally(() => fileEnCours.current.delete(message.id));
    }
  }, [ligne, fil]);

  function arreter() {
    ticket.current += 1;
    setEnCours(false);
    if (!actif) return;
    changer(actif, (courant) => ({
      ...courant,
      messages: courant.messages.map((message) => (message.etat === "envoi" ? { ...message, etat: "envoye" } : message)),
    }));
  }

  function regenerer() {
    if (!fil || enCours) return;
    const messages = [...fil.messages];
    while (messages.length && messages[messages.length - 1].role === "assistant") messages.pop();
    const dernier = [...messages].reverse().find((message) => message.role === "user");
    if (!dernier) return;
    changer(fil.id, (courant) => ({ ...courant, messages }));
    void interroger(fil.id, dernier.texte, dernier.id);
  }

  function editer(id: string) {
    if (!fil) return;
    const index = fil.messages.findIndex((message) => message.id === id);
    if (index < 0) return;
    setQuestion(fil.messages[index].texte);
    changer(fil.id, (courant) => ({ ...courant, messages: courant.messages.slice(0, index) }));
    setMenuMessage("");
    requestAnimationFrame(() => saisie.current?.focus());
  }

  function reessayer(id: string) {
    if (!fil) return;
    const index = fil.messages.findIndex((message) => message.id === id);
    const utilisateur = [...fil.messages.slice(0, index)].reverse().find((message) => message.role === "user");
    if (!utilisateur) return;
    changer(fil.id, (courant) => ({ ...courant, messages: courant.messages.filter((message) => message.id !== id) }));
    void interroger(fil.id, utilisateur.texte, utilisateur.id);
  }

  function confirmer() {
    if (!confirm) return;
    if (confirm.type === "tout") {
      const neuf = creerFil();
      setFils([neuf]);
      ouvrir(neuf.id);
    } else if (confirm.type === "fil") {
      const reste = fils.filter((item) => item.id !== confirm.id);
      const suivant = reste[0] ?? creerFil();
      setFils(reste.some((item) => item.id === suivant.id) ? reste : [suivant]);
      if (confirm.id === actif) ouvrir(suivant.id);
    } else if (fil) {
      changer(fil.id, (courant) => ({ ...courant, messages: courant.messages.filter((message) => message.id !== confirm.id) }));
    }
    setConfirm(null);
  }

  function exporter() {
    if (!fil) return;
    const blob = new Blob([versMarkdown(fil)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = "conversation.md";
    lien.click();
    URL.revokeObjectURL(url);
  }

  async function partager() {
    if (!fil) return;
    await navigator.clipboard.writeText(versMarkdown(fil));
    setCopie("fil");
    window.setTimeout(() => setCopie(""), 1600);
  }

  useEffect(() => {
    function touche(event: KeyboardEvent) {
      const cible = event.target instanceof HTMLElement ? event.target : null;
      const champ = cible?.tagName === "INPUT" || cible?.tagName === "TEXTAREA";
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        creer();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMenu(true);
        rechercheRef.current?.focus();
      } else if (event.key === "?" && !champ && !event.ctrlKey && !event.metaKey) {
        setAide(true);
      } else if (event.key === "Escape") {
        setAide(false);
        setConfirm(null);
        setMenu(false);
        setMenuMessage("");
        setAvisOuvert("");
      }
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  const messages = fil ? fil.messages.slice(debut || (fil.messages.length > 200 ? fil.messages.length - 200 : 0)) : [];
  const commandes = ["/help", "/reset"].filter((commande) => question.startsWith("/") && commande.startsWith(question.trim()));

  if (!pret) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-6" aria-busy="true" aria-label={t("assistant.titre")}>
        <div className="h-8 w-40 rounded-lg bg-surface-muted" />
        <div className="h-24 rounded-2xl bg-surface-muted" />
        <div className="ml-auto h-16 w-2/3 rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-1 flex-col bg-background max-md:fixed max-md:inset-0 max-md:z-30 md:absolute md:inset-0 md:z-10 md:min-h-0 md:flex-row md:overflow-hidden"
      style={{ paddingBottom: clavier ? `${clavier}px` : undefined }}
    >
      {menu ? <button type="button" className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-label={t("assistant.fermerMenu")} onClick={() => setMenu(false)} /> : null}
      <aside className={`${menu ? "fixed inset-y-0 left-0 z-40 flex w-72" : "hidden"} min-h-0 shrink-0 flex-col border-r border-border bg-surface md:static md:flex md:w-64`}>
        <div className="flex items-center gap-2 p-3">
          <button type="button" className="min-h-11 flex-1 rounded-xl bg-foreground px-3 text-sm text-background" onClick={creer}>
            {t("assistant.nouveau")}
          </button>
        </div>
        <label className="sr-only" htmlFor="recherche-assistant">{t("assistant.rechercher")}</label>
        <input
          id="recherche-assistant"
          ref={rechercheRef}
          className="mx-3 mb-2 min-h-11 rounded-xl border border-border bg-background px-3 text-base"
          value={recherche}
          placeholder={t("assistant.rechercher")}
          onChange={(event) => setRecherche(event.target.value)}
        />
        <div className="px-3 pb-2">
          <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setArchives((valeur) => !valeur)}>
            {archives ? t("assistant.discussions") : t("assistant.archives")}
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3" aria-label={t("assistant.historique")}>
          {visibles.length === 0 ? <li className="px-2 py-3 text-sm text-muted">{t("assistant.vide")}</li> : null}
          {visibles.map((item) => (
            <li key={item.id}>
              {renomme === item.id ? (
                <input
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base"
                  defaultValue={item.titre}
                  autoFocus
                  onBlur={(event) => {
                    const titre = event.target.value.trim() || TITRE_NEUF;
                    changer(item.id, (courant) => ({ ...courant, titre }));
                    setRenomme("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              ) : (
                <div className={`group/fil rounded-xl ${item.id === actif ? "bg-primary-soft" : ""}`}>
                  <div className="flex items-center">
                    <button type="button" className="min-h-11 min-w-0 flex-1 truncate px-3 text-left text-sm" onClick={() => ouvrir(item.id)}>
                      {item.epingle ? "· " : ""}
                      {item.titre}
                    </button>
                    <button type="button" className="grid h-11 w-11 shrink-0 place-items-center text-xs text-muted" aria-label={t("assistant.actions")} onClick={() => setMenuMessage(menuMessage === item.id ? "" : item.id)}>···</button>
                  </div>
                  {menuMessage === item.id ? (
                    <div className="flex flex-wrap gap-1 px-2 pb-2">
                      <button type="button" className="min-h-11 px-2 text-xs text-muted" onClick={() => changer(item.id, (courant) => ({ ...courant, epingle: !courant.epingle }))}>
                        {item.epingle ? t("assistant.desepingler") : t("assistant.epingler")}
                      </button>
                      <button type="button" className="min-h-11 px-2 text-xs text-muted" onClick={() => { setRenomme(item.id); setMenuMessage(""); }}>{t("assistant.renommer")}</button>
                      <button type="button" className="min-h-11 px-2 text-xs text-muted" onClick={() => changer(item.id, (courant) => ({ ...courant, archive: !courant.archive }))}>
                        {item.archive ? t("assistant.desarchiver") : t("assistant.archiver")}
                      </button>
                      <button type="button" className="min-h-11 px-2 text-xs text-muted" onClick={() => setConfirm({ type: "fil", id: item.id })}>{t("assistant.supprimer")}</button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-3">
          <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setConfirm({ type: "tout", id: "" })}>
            {t("assistant.effacerHistorique")}
          </button>
          <p className="mt-2 text-xs text-muted">{t("assistant.local")}</p>
        </div>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border md:hidden" aria-label={t("assistant.menu")} onClick={() => setMenu(true)}>
                ···
              </button>
              <h1 className="min-w-0 truncate text-base font-semibold">
                {manquant ? t("assistant.introuvableFil") : fil?.titre}
                <span className="ml-2 rounded-md bg-primary-soft px-2 py-0.5 text-xs text-primary">{t("assistant.badge")}</span>
              </h1>
            </div>
            <p className="text-xs text-muted">{enCours ? t("assistant.ecrit") : t("assistant.statut")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link className="grid h-11 w-11 place-items-center text-sm md:hidden" href="/tableau" aria-label={t("nav.tableau")}>←</Link>
            <button type="button" className="hidden min-h-11 px-2 text-sm sm:inline" onClick={creer}>{t("assistant.nouveau")}</button>
            <button type="button" className="min-h-11 px-2 text-sm" onClick={() => void partager()}>{copie === "fil" ? t("assistant.partage") : t("assistant.partager")}</button>
            <button type="button" className="min-h-11 px-2 text-sm" onClick={exporter}>{t("assistant.exporter")}</button>
            <button type="button" className="min-h-11 px-2 text-sm" aria-pressed={son} onClick={() => { setSon((valeur) => { ecrireSon(!valeur); return !valeur; }); }}>{t("assistant.son")}</button>
            <button type="button" className="grid h-11 w-11 place-items-center" aria-label={t("assistant.aide")} onClick={() => setAide(true)}>?</button>
          </div>
        </header>
        {!ligne ? <p className="bg-risk-medium-bg px-4 py-2 text-sm text-risk-medium">{t("assistant.horsLigne")}</p> : null}
        <div className="sr-only" aria-live="polite">{fil?.messages.at(-1)?.role === "assistant" ? fil.messages.at(-1)?.texte : ""}</div>
        <div
          ref={zone}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          role="log"
          aria-busy={enCours}
          onScroll={suivre}
          onTouchStart={(event) => {
            departTouche.current = event.touches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(event) => {
            const dx = (event.changedTouches[0]?.clientX ?? 0) - departTouche.current;
            if (departTouche.current < 28 && dx > 70) setMenu(true);
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {manquant ? (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p>{t("assistant.introuvableFil")}</p>
                <button type="button" className="mt-3 min-h-11 rounded-xl bg-foreground px-4 text-sm text-background" onClick={creer}>{t("assistant.nouveau")}</button>
              </div>
            ) : null}
            {fil && fil.messages.length > messages.length ? (
              <button
                type="button"
                className="min-h-11 text-sm text-muted"
                onClick={() => {
                  const el = zone.current;
                  const avant = el?.scrollHeight ?? 0;
                  setDebut((valeur) => Math.max(0, (valeur || fil.messages.length - 200) - 50));
                  requestAnimationFrame(() => {
                    if (!el) return;
                    el.scrollTop += el.scrollHeight - avant;
                  });
                }}
              >
                {t("assistant.precedents")}
              </button>
            ) : null}
            {fil && fil.messages.length === 0 && !manquant ? (
              <div className="py-8">
                <p className="text-lg">{t("assistant.accueil")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((cle) => (
                    <button key={cle} type="button" className="min-h-11 rounded-full border border-border px-4 text-left text-sm" onClick={() => void envoyer(t(cle))}>
                      {t(cle)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((message, index) => {
              const precedent = messages[index - 1];
              const nouveauJour = !precedent || jour(precedent.creeLe) !== jour(message.creeLe);
              const groupe = precedent && precedent.role === message.role && !nouveauJour && message.creeLe - precedent.creeLe < 300_000;
              const utilisateur = message.role === "user";
              return (
                <div key={message.id}>
                  {nouveauJour ? <p className="py-2 text-center text-xs text-muted">{jour(message.creeLe)}</p> : null}
                  <article className={`group flex gap-2 ${utilisateur ? "justify-end" : "justify-start"}`} title={heure(message.creeLe)}>
                    {utilisateur || groupe ? null : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs text-primary-foreground" aria-hidden>IA</span>
                    )}
                    <div className={utilisateur ? "max-w-[85%]" : "max-w-[85%] sm:max-w-[40rem]"}>
                      <div className={utilisateur ? "rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground" : "rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2"}>
                        {utilisateur ? <p className="wrap-anywhere whitespace-pre-wrap select-text">{message.texte}</p> : <TexteAssistant texte={message.texte} />}
                        {message.pieces.length ? (
                          <ul className="mt-2 text-xs">
                            {message.pieces.map((piece) => <li key={piece.nom}>{piece.nom}</li>)}
                          </ul>
                        ) : null}
                        <p className="mt-1 text-[11px] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">{heure(message.creeLe)}{message.etat === "envoi" ? ` · ${t("assistant.envoi")}` : ""}{message.etat === "erreur" ? ` · ${t("assistant.echec")}` : ""}{message.etat === "file" ? ` · ${t("assistant.enFile")}` : ""}</p>
                        {message.sansSource ? <p className="mt-2 text-xs text-risk-medium">{t("assistant.sansSource")}</p> : null}
                        {message.sources.length ? (
                          <details className="mt-2 text-xs">
                            <summary>{t("assistant.sources")} · {message.sources.length}</summary>
                            <ul className="mt-1 space-y-1">
                              {message.sources.map((source) => (
                                <li key={`${source.source}-${source.page}`}>{source.source}{source.page ? ` · p. ${source.page}` : ""}</li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                        {message.raisonnement ? (
                          <details className="mt-2 text-xs">
                            <summary>{t("assistant.raisonnement")}</summary>
                            <p className="mt-1 whitespace-pre-wrap text-muted">{message.raisonnement}</p>
                          </details>
                        ) : null}
                        {message.erreur && message.erreur !== "hors" ? (
                          <button type="button" className="mt-2 min-h-11 text-sm underline" onClick={() => reessayer(message.id)}>{t("assistant.reessayer")}</button>
                        ) : null}
                      </div>
                      <div className={`mt-1 flex flex-wrap gap-1 ${menuMessage === message.id ? "" : "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"}`}>
                        <button type="button" className="min-h-11 px-2 text-xs text-muted" aria-label={t("assistant.actions")} onClick={() => setMenuMessage(menuMessage === message.id ? "" : message.id)}>···</button>
                        {menuMessage === message.id ? (
                          <>
                            <button type="button" className="min-h-11 px-2 text-xs" onClick={() => { void navigator.clipboard.writeText(message.texte); setCopie(message.id); window.setTimeout(() => setCopie(""), 1600); }}>
                              {copie === message.id ? t("assistant.copie") : t("assistant.copier")}
                            </button>
                            {utilisateur ? <button type="button" className="min-h-11 px-2 text-xs" onClick={() => editer(message.id)}>{t("assistant.editer")}</button> : null}
                            {!utilisateur && fil && fil.messages.at(-1)?.id === message.id ? <button type="button" className="min-h-11 px-2 text-xs" onClick={regenerer}>{t("assistant.regenerer")}</button> : null}
                            {!utilisateur ? (
                              <>
                                <button type="button" className="min-h-11 px-2 text-xs" aria-pressed={message.avis === "utile"} onClick={() => changer(fil!.id, (courant) => ({ ...courant, messages: courant.messages.map((item) => item.id === message.id ? { ...item, avis: "utile" } : item) }))}>{t("assistant.utile")}</button>
                                <button type="button" className="min-h-11 px-2 text-xs" aria-pressed={message.avis === "inutile"} onClick={() => setAvisOuvert(message.id)}>{t("assistant.inutile")}</button>
                              </>
                            ) : null}
                            <button type="button" className="min-h-11 px-2 text-xs" onClick={() => setConfirm({ type: "message", id: message.id })}>{t("assistant.supprimer")}</button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
            {enCours ? (
              <p className="flex items-center gap-1 text-muted" aria-hidden>
                <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-bounce [animation-delay:300ms]" />
              </p>
            ) : null}
            {fil && !enCours && fil.messages.at(-1)?.role === "assistant" && !fil.messages.at(-1)?.erreur ? (
              <div className="flex flex-wrap gap-2">
                {RELANCES.map((cle) => (
                  <button key={cle} type="button" className="min-h-11 rounded-full border border-border px-3 text-sm" onClick={() => void envoyer(t(cle))}>{t(cle)}</button>
                ))}
              </div>
            ) : null}
          </div>
          {loin ? (
            <button type="button" className="sticky bottom-3 left-full grid h-11 min-w-11 place-items-center rounded-full border border-border bg-surface px-3 shadow" onClick={descendre}>
              {t("assistant.allerBas")}{nouveaux > 0 ? ` · ${nouveaux}` : ""}
            </button>
          ) : null}
        </div>
        <form
          className="shrink-0 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(event) => {
            event.preventDefault();
            void envoyer();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDepot(true);
          }}
          onDragLeave={() => setDepot(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDepot(false);
            if (event.dataTransfer.files.length) ajouterFichiers(event.dataTransfer.files);
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            {commandes.length ? (
              <ul className="mb-2 rounded-xl border border-border bg-surface">
                {commandes.map((commande) => (
                  <li key={commande}>
                    <button type="button" className="min-h-11 w-full px-3 text-left text-sm" onClick={() => void envoyer(commande)}>
                      {commande} · {commande === "/help" ? t("assistant.cmdHelp") : t("assistant.cmdReset")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {fichiers.length ? (
              <div className="mb-2">
                <ul className="flex flex-wrap gap-2">
                  {fichiers.map((piece) => (
                    <li key={piece.nom} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-1">
                      {piece.apercu ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={piece.nom} src={piece.apercu} className="h-12 w-12 rounded-lg object-cover" />
                      ) : <span className="px-2 text-xs">{piece.nom}</span>}
                      <button type="button" className="min-h-11 px-2 text-xs" onClick={() => retirerFichier(piece.nom)}>{t("assistant.retirerPiece")}</button>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">{t("assistant.piecesNote")}</p>
              </div>
            ) : null}
            {depot ? <p className="mb-2 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted">{t("assistant.deposer")}</p> : null}
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
              <label className="sr-only" htmlFor="question-salon">{t("assistant.placeholder")}</label>
              <textarea
                id="question-salon"
                ref={saisie}
                rows={1}
                className="max-h-48 min-h-11 flex-1 resize-none bg-transparent text-base outline-none"
                value={question}
                maxLength={LIMITE}
                placeholder={t("assistant.placeholder")}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  ajuster(event.target);
                }}
                onPaste={(event) => {
                  const images = Array.from(event.clipboardData.files);
                  if (images.length) ajouterFichiers(images);
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter" && !event.shiftKey && !tactile()) {
                    event.preventDefault();
                    void envoyer();
                  }
                  if (event.key === "ArrowUp" && !question && event.currentTarget.selectionStart === 0) {
                    const dernier = [...(fil?.messages ?? [])].reverse().find((message) => message.role === "user");
                    if (dernier) {
                      event.preventDefault();
                      editer(dernier.id);
                    }
                  }
                }}
              />
              {enCours ? (
                <button type="button" className="grid h-11 min-w-11 place-items-center rounded-full bg-foreground px-3 text-sm text-background" onClick={arreter}>{t("assistant.arreter")}</button>
              ) : (
                <button type="submit" className="grid h-11 min-w-11 place-items-center rounded-full bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50" disabled={!question.trim()} aria-label={t("assistant.envoyer")}>
                  {t("assistant.envoyer")}
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-muted">{t("assistant.avertissement")}</p>
              {question.length >= 1600 ? <p className="text-xs text-muted">{question.length} / {LIMITE}</p> : null}
            </div>
          </div>
        </form>
      </section>
      {aide ? (
        <dialog open className="fixed inset-0 z-50 m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 text-foreground" onCancel={() => setAide(false)}>
          <h2 className="text-lg font-semibold">{t("assistant.aide")}</h2>
          <p className="mt-2 text-sm">{t("assistant.aideTexte")}</p>
          <button type="button" className="mt-4 min-h-11 rounded-xl border border-border px-4" onClick={() => setAide(false)}>{t("annuler")}</button>
        </dialog>
      ) : null}
      {confirm ? (
        <dialog open className="fixed inset-0 z-50 m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 text-foreground">
          <p>{confirm.type === "tout" ? t("assistant.effacerHistoriqueTexte") : confirm.type === "fil" ? t("assistant.supprimerFil") : t("assistant.supprimerMessage")}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" className="min-h-11 rounded-xl border border-border px-4" onClick={() => setConfirm(null)}>{t("annuler")}</button>
            <button type="button" className="min-h-11 rounded-xl bg-danger px-4 text-white" onClick={confirmer}>{t("assistant.confirmerSuppression")}</button>
          </div>
        </dialog>
      ) : null}
      {avisOuvert ? (
        <dialog open className="fixed inset-0 z-50 m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 text-foreground">
          <p>{t("assistant.avisPourquoi")}</p>
          <textarea className="mt-3 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-base" value={avisTexte} maxLength={500} onChange={(event) => setAvisTexte(event.target.value)} />
          <div className="mt-3 flex gap-2">
            <button type="button" className="min-h-11 rounded-xl border border-border px-4" onClick={() => setAvisOuvert("")}>{t("annuler")}</button>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-foreground px-4 text-background"
              onClick={() => {
                if (fil) changer(fil.id, (courant) => ({ ...courant, messages: courant.messages.map((item) => item.id === avisOuvert ? { ...item, avis: "inutile", avisTexte } : item) }));
                setAvisOuvert("");
                setAvisTexte("");
              }}
            >
              {t("assistant.noter")}
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
