import { MouvementBanquePage } from '../../components/finances/MouvementBanquePage'
import {
  listVersements,
  versementStats,
  createVersement,
  validerVersement,
  rejeterVersement,
} from '../../lib/api'

export default function VersementsPage() {
  return (
    <MouvementBanquePage
      title="Versements en banque"
      subtitle="Enregistrement et validation des versements des PDV"
      formTitle="Nouveau versement"
      listTitle="Liste des versements"
      submitLabel="Enregistrer le versement"
      list={() => listVersements()}
      stats={versementStats}
      create={createVersement}
      valider={validerVersement}
      rejeter={rejeterVersement}
    />
  )
}
