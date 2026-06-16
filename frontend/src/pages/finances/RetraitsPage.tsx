import { MouvementBanquePage } from '../../components/finances/MouvementBanquePage'
import {
  listRetraits,
  retraitStats,
  createRetrait,
  validerRetrait,
  rejeterRetrait,
} from '../../lib/api'

export default function RetraitsPage() {
  return (
    <MouvementBanquePage
      title="Retraits en banque"
      subtitle="Enregistrement et validation des retraits"
      formTitle="Nouveau retrait"
      listTitle="Historique des retraits"
      submitLabel="Enregistrer le retrait"
      list={() => listRetraits()}
      stats={retraitStats}
      create={createRetrait}
      valider={validerRetrait}
      rejeter={rejeterRetrait}
    />
  )
}
