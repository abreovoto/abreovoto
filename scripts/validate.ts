// Validates the data directory. Paths resolve against the working directory,
// which is the repository root under `npm run validate`.
import { DataError, emExercicio, loadData } from "../src/data/load";

function main(): number {
  try {
    const d = loadData();
    const active = emExercicio(d);
    const declared = active.filter((s) => s.declaracao.status !== "nao_declarou").length;
    console.log(`validate: ${active.length} senadores em exercício, ${d.candidatos.length} candidatos, ${declared} declarações`);
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
