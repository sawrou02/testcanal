import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Assistant "mode d'emploi" — 100% HORS LIGNE.
 * Aucune connexion internet, aucune clé API : une base de connaissances locale
 * + une recherche par mots-clés. Répond aux questions d'utilisation du logiciel.
 */

interface Entry {
  id: string
  q: string
  keywords: string
  steps: string[]
  route?: string
  routeLabel?: string
  note?: string
}

const KB: Entry[] = [
  {
    id: 'connexion', q: 'Comment se connecter ?',
    keywords: 'connexion connecter login mot de passe identifiant entrer acceder ouvrir session',
    steps: [
      'Ouvre le navigateur sur http://localhost:5173',
      'Saisis ton identifiant et ton mot de passe (fournis par l’administrateur)',
      'Clique sur « Se connecter ».',
    ],
  },
  {
    id: 'creer-abonne', q: 'Comment créer / recruter un nouvel abonné ?',
    keywords: 'creer ajouter nouvel nouveau abonne client recruter recrutement inscrire souscription enregistrer abonné',
    steps: [
      'Menu « Base de données globale »',
      'Bouton « + Nouvel abonné »',
      'Renseigne nom, prénom, téléphone, formule et PDV (le N° abonné est généré si tu le laisses vide)',
      'Clique sur « Créer ». L’abonné apparaît aussitôt et devient cherchable.',
    ],
    route: '/app/bdd-globale', routeLabel: 'Ouvrir la base des abonnés',
  },
  {
    id: 'encaissement', q: 'Comment faire un encaissement / réabonnement ?',
    keywords: 'encaissement encaisser reabonnement reabonner paiement payer recrutement migration operation caisse vendre montant recu',
    steps: [
      'Menu Opérations → « Encaissement »',
      'Cherche le client (n° abonné, nom, téléphone ou n° décodeur) et sélectionne-le',
      'Choisis le type d’opération, la formule, le nombre de mois et le mode de paiement',
      'Saisis le montant reçu (la monnaie se calcule seule)',
      'Clique « Enregistrer ». L’abonné est automatiquement réactivé avec sa nouvelle échéance.',
    ],
    route: '/app/encaissement', routeLabel: 'Ouvrir l’encaissement',
  },
  {
    id: 'impaye', q: 'Comment enregistrer un impayé (paiement partiel) ?',
    keywords: 'impaye impayes dette partiel arriere reste du reglement partiel non paye',
    steps: [
      'Menu Opérations → « Encaissement »',
      'Sélectionne le client, puis choisis le type « Impayés »',
      'Saisis le montant reçu (il peut être inférieur au prix de la formule)',
      'Enregistre : l’opération est notée SANS prolonger l’abonnement.',
    ],
    route: '/app/encaissement', routeLabel: 'Ouvrir l’encaissement',
  },
  {
    id: 'creer-pdv', q: 'Comment créer un point de vente (PDV) ?',
    keywords: 'creer pdv point de vente boutique agence sous reseau partenaire ajouter magasin',
    steps: [
      'Menu Paramétrage → « Liste PDV »',
      'Bouton « Nouveau »',
      'Renseigne code, raison sociale, type, secteur, localité et caution',
      'Enregistre. Le PDV peut recevoir des abonnés et des opérations.',
    ],
    route: '/app/pdv-liste', routeLabel: 'Ouvrir la liste des PDV',
  },
  {
    id: 'formule', q: 'Comment ajouter ou modifier une formule ?',
    keywords: 'formule offre abonnement prix tarif access evasion prestige ajouter modifier creer catalogue',
    steps: [
      'Menu Paramétrage → « Formules »',
      'Bouton « Nouveau » (ou clique une ligne pour modifier)',
      'Renseigne code, nom commercial, prix matériel et prix formule',
      'Enregistre. La formule apparaît partout (encaissement, etc.).',
    ],
    route: '/app/formules', routeLabel: 'Ouvrir les formules',
  },
  {
    id: 'baremes', q: 'Comment changer les barèmes de commission ?',
    keywords: 'bareme baremes commission taux pourcentage 3500 8475 g11 materiel formule reabo modifier valeur',
    steps: [
      'Menu Paramétrage → « Barèmes commissions »',
      'Modifie les valeurs dans le tableau (matériel, formule %, réabo %, G11)',
      'Clique « Sauvegarder ». Tous les calculs de commission se mettent à jour immédiatement.',
    ],
    route: '/app/baremes', routeLabel: 'Ouvrir les barèmes',
  },
  {
    id: 'objectifs', q: 'Comment fixer les objectifs ?',
    keywords: 'objectif objectifs cible but distributeur pdv recrutement reabonnement effectif r/o atterrissage fixer',
    steps: [
      'Pour l’ensemble : Paramétrage → « Objectifs Distributeur » (année, trimestre/mois, type, effectif)',
      'Par point de vente : Paramétrage → « Objectifs PDV » (saisie unitaire ou import CSV)',
      'Une fois saisis, le tableau de bord affiche R/O %, reste à réaliser et atterrissage.',
    ],
    route: '/app/objectifs-distributeur', routeLabel: 'Ouvrir les objectifs',
  },
  {
    id: 'dettes', q: 'Où voir les dettes / le crédit des PDV ?',
    keywords: 'dette dettes credit recouvrement encours solde du impaye plafond avoir rapport qui doit',
    steps: [
      'Menu Gestion Crédit → « Suivi Crédit » : plafond, avoir, dette et crédit disponible par PDV',
      'Menu Gestion Crédit → « Rapport dette » : uniquement les PDV qui doivent de l’argent.',
    ],
    route: '/app/rapport-dette', routeLabel: 'Ouvrir le rapport dette',
  },
  {
    id: 'versement', q: 'Comment enregistrer / valider un versement en banque ?',
    keywords: 'versement banque bordereau valider rejeter depot argent caisse versement banque',
    steps: [
      'Menu Opérations → « Versement Banque »',
      'Pour ajouter : renseigne PDV, montant, banque, date et n° bordereau',
      'Pour valider : ouvre un versement en attente puis valide (ça réduit la dette) ou rejette avec un motif.',
    ],
    route: '/app/versement-banque', routeLabel: 'Ouvrir les versements',
  },
  {
    id: 'relance', q: 'Comment relancer les abonnés (SMS) ?',
    keywords: 'relance relancer sms message rappel echeance echu envoyer notifier contacter telephone',
    steps: [
      'Menu Service Abonnement → « Abonnés à échéance » ou « Échus »',
      'Coche les abonnés à relancer',
      'Clique sur « Relance SMS ».',
    ],
    note: 'Aujourd’hui l’envoi SMS est simulé : l’action est enregistrée mais aucun vrai SMS ne part encore (il faut brancher un fournisseur SMS).',
    route: '/app/aae', routeLabel: 'Ouvrir les abonnés à échéance',
  },
  {
    id: 'echeance', q: 'Où voir les abonnés qui vont expirer ou sont échus ?',
    keywords: 'echeance echu expire expiration fin abonnement bientot a echeance aae liste',
    steps: [
      '« Abonnés à échéance » : ceux dont l’abonnement va bientôt expirer',
      '« Échus » : ceux déjà expirés à relancer.',
    ],
    route: '/app/aae', routeLabel: 'Ouvrir les abonnés à échéance',
  },
  {
    id: 'suivi-mp', q: 'Comment suivre le réabonnement (M+) ?',
    keywords: 'suivi mp m+ reabonnement cohorte taux conversion m+1 m+2 m+3 fidelisation',
    steps: [
      'Menu Service Abonnement → « Suivi Réabonnement M+ »',
      'Choisis le mois de recrutement, l’année et le niveau (M+1, M+2, M+3)',
      'Le tableau montre le taux de réabonnement par cohorte.',
    ],
    route: '/app/suivi-mp', routeLabel: 'Ouvrir le Suivi M+',
  },
  {
    id: 'export', q: 'Comment exporter en Excel ou PDF ?',
    keywords: 'export exporter excel pdf imprimer telecharger document fichier sortir tableau',
    steps: [
      'Ouvre la page contenant le tableau voulu',
      'Clique sur le bouton « Excel » ou « PDF » en haut à droite du tableau',
      'Le fichier se télécharge, prêt à imprimer ou envoyer.',
    ],
  },
  {
    id: 'recherche', q: 'Comment rechercher un abonné, un PDV ou un décodeur ?',
    keywords: 'recherche rechercher trouver chercher abonne pdv decodeur barre recherche globale',
    steps: [
      'Utilise la barre de recherche en haut de l’écran',
      'Tape au moins 2 lettres (nom, n° abonné, n° décodeur…)',
      'Clique sur un résultat pour y aller.',
    ],
  },
  {
    id: 'decodeur', q: 'Comment retrouver un décodeur ?',
    keywords: 'decodeur recherche numero serie statut stock vendu immobilise z4 globaz g11 materiel',
    steps: [
      'Menu Logistique → « Recherche décodeur »',
      'Saisis le numéro de série',
      'La fiche montre le type, le statut et l’emplacement.',
    ],
    route: '/app/recherche-decodeur', routeLabel: 'Ouvrir la recherche décodeur',
  },
  {
    id: 'depenses', q: 'Comment enregistrer une dépense ?',
    keywords: 'depense depenses sortie argent frais charge motif justificatif enregistrer',
    steps: [
      'Menu Opérations → « Dépenses »',
      'Bouton « Nouveau »',
      'Renseigne date, catégorie, motif, montant et justificatif.',
    ],
    route: '/app/depenses', routeLabel: 'Ouvrir les dépenses',
  },
  {
    id: 'sauvegarde', q: 'Mes données sont-elles sauvegardées ?',
    keywords: 'sauvegarde sauvegarder backup perdre donnees securite copie restaurer',
    steps: [
      'Oui : une sauvegarde automatique est faite au démarrage et chaque jour.',
      'Les 14 dernières sauvegardes sont gardées dans le dossier backend/backups.',
      'Tu peux aussi en lancer une à la main (commande « npm run backup »).',
    ],
  },
  {
    id: 'dashboard', q: 'Que veulent dire R/O, Reste et Atterrissage sur le tableau de bord ?',
    keywords: 'tableau bord r/o ro atterrissage reste realiser objectif pourcentage indicateur synthese',
    steps: [
      'R / O = Réalisé ÷ Objectif (en %) — où tu en es par rapport à la cible',
      'Reste à réaliser = Objectif − Réalisé',
      'Atterrissage = projection de fin de mois selon le rythme actuel',
      'Ces chiffres apparaissent dès que tu as saisi des objectifs.',
    ],
    route: '/', routeLabel: 'Ouvrir le tableau de bord',
  },
  {
    id: 'utilisateurs', q: 'Comment créer un compte utilisateur (vendeur, etc.) ?',
    keywords: 'utilisateur compte vendeur agent role acces creer personnel employe mot de passe comptes',
    steps: [
      'Menu Paramétrage → « Comptes PDV » (ou Comptes Distributeur)',
      'Crée le compte et choisis son rôle (Vendeur, Commercial, Comptable…)',
      'Chaque rôle ne voit que ce qui le concerne.',
    ],
    route: '/app/pdv-comptes', routeLabel: 'Ouvrir les comptes',
  },
  {
    id: 'vide', q: 'Pourquoi les listes / menus sont vides ?',
    keywords: 'vide rien affiche aucun donnee manque pourquoi absent liste vide formule vide',
    steps: [
      'C’est normal sur une base neuve : le logiciel n’invente aucune donnée.',
      'Commence par créer un PDV, puis des abonnés, puis fais des encaissements.',
      'Les tableaux et le tableau de bord se remplissent alors automatiquement.',
    ],
  },
  {
    id: 'maj', q: 'Comment mettre à jour le logiciel ?',
    keywords: 'mise a jour mettre jour update nouvelle version bundle telecharger',
    steps: [
      'Télécharge le nouveau fichier .bundle',
      'Double-clique sur « METTRE-A-JOUR.bat »',
      'En ~30 s il récupère les nouveautés, garde tes données et redémarre.',
    ],
  },
  {
    id: 'theme', q: 'Comment passer en mode sombre / clair ?',
    keywords: 'mode sombre clair theme nuit jour couleur ecran lune soleil',
    steps: ['Clique sur l’icône lune/soleil en haut à droite de l’écran.'],
  },
]

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const SUGGESTIONS = ['créer un abonné', 'faire un encaissement', 'relance sms', 'voir les dettes', 'exporter excel']

export function HelpAssistant() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = norm(query).trim()
    if (!q) return KB.slice(0, 6)
    const words = q.split(/\s+/).filter((w) => w.length >= 2)
    return KB
      .map((e) => {
        const hay = norm(e.q + ' ' + e.keywords)
        let score = 0
        for (const w of words) if (hay.includes(w)) score += 1
        // bonus si le mot est dans la question
        for (const w of words) if (norm(e.q).includes(w)) score += 1
        return { e, score }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((r) => r.e)
  }, [query])

  const go = (route: string) => { setOpen(false); navigate(route) }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => { setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50) }}
        title="Aide — Comment ça marche ?"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: 'var(--primary)' }}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" /></svg>
        )}
      </button>

      {/* Panneau */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-50 w-[380px] max-w-[92vw] rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', maxHeight: '70vh' }}
        >
          <div className="px-4 py-3 text-white" style={{ background: 'var(--primary)' }}>
            <div className="font-bold flex items-center gap-2">
              <span>💬 Assistant SENDISTRI</span>
            </div>
            <div className="text-[11px] opacity-90">Pose ta question — fonctionne hors ligne</div>
          </div>

          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpenId(null) }}
              placeholder="Ex. comment créer un abonné ?"
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ background: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            {!query && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQuery(s)}
                    className="text-[11px] px-2 py-1 rounded-full border hover:bg-primary/5"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-y-auto p-2" style={{ maxHeight: '48vh' }}>
            {results.length === 0 ? (
              <div className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
                Aucune réponse trouvée.<br />Essaie un autre mot (ex. « abonné », « dette », « SMS »).
              </div>
            ) : (
              results.map((e) => {
                const expanded = openId === e.id
                return (
                  <div key={e.id} className="mb-1.5 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setOpenId(expanded ? null : e.id)}
                      className="w-full text-left px-3 py-2.5 text-sm font-semibold flex items-center justify-between gap-2 hover:bg-primary/5"
                      style={{ color: 'var(--text)' }}
                    >
                      <span>{e.q}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{expanded ? '−' : '+'}</span>
                    </button>
                    {expanded && (
                      <div className="px-3 pb-3 text-sm" style={{ color: 'var(--text)' }}>
                        <ol className="list-decimal ml-4 space-y-1">
                          {e.steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                        {e.note && (
                          <div className="mt-2 text-[12px] rounded-md px-2 py-1.5" style={{ background: 'var(--app-bg)', color: 'var(--text-muted)' }}>
                            ⚠️ {e.note}
                          </div>
                        )}
                        {e.route && (
                          <button onClick={() => go(e.route!)}
                            className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                            style={{ background: 'var(--primary)' }}>
                            {e.routeLabel || 'Ouvrir la page'} →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="px-3 py-2 text-[10px] border-t text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Aide intégrée · fonctionne sans internet
          </div>
        </div>
      )}
    </>
  )
}
