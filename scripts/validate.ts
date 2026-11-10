// Validates the data directory. Paths resolve against the working directory,
// which is the repository root under `npm run validate`.
import { DataError, emExercicio, loadData } from "../src/data/load";
import { placar } from "../src/data/placar";

function main(): number {
  try {
    const d = loadData();
    const active = emExercicio(d);
    const p = placar(d);
    console.log(
      `validate: ${active.length} senadores em exercício, ${d.candidatos.length} candidatos, ${d.partidos.length} anúncios de partido; ` +
        `${p.comPosicao} com posição conhecida (${p.declararam} declararam, ${p.mapeados} apoio mapeado, ${p.partido} pelo partido), ${p.semPosicao} sem posição`,
    );
    return 0;
  } catch (e) {
    if (!(e instanceof DataError)) {
      console.error(e);
      return 1;
    }
    console.error(`validate: ${e.issues.length} problema(s) nos dados`);
    for (const issue of e.issues) console.error(`  - ${issue}`);
    return 1;
  }
}

process.exit(main());
