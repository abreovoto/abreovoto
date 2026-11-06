/** The portraits in `src/assets/fotos/`, by id, as image metadata Astro can optimise. */

const senadores = import.meta.glob<ImageMetadata>("../assets/fotos/senadores/*.jpg", {
  eager: true,
  import: "default",
});
const candidatos = import.meta.glob<ImageMetadata>("../assets/fotos/candidatos/*.jpg", {
  eager: true,
  import: "default",
});

function pick(table: Record<string, ImageMetadata>, dir: string, id: string): ImageMetadata {
  const photo = table[`../assets/fotos/${dir}/${id}.jpg`];
  if (!photo) throw new Error(`no photo for ${dir}/${id}`);
  return photo;
}

export function senatorPhoto(id: string): ImageMetadata {
  return pick(senadores, "senadores", id);
}

export function candidatePhoto(id: string): ImageMetadata {
  return pick(candidatos, "candidatos", id);
}
