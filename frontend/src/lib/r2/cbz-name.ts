export function cbzBasename(fileName: string): string {
  const lower = fileName.toLowerCase();
  const stripped = lower.endsWith(".cbz") || lower.endsWith(".zip")
    ? fileName.slice(0, fileName.length - 4)
    : fileName;
  return stripped.trim();
}

export function isCbzOrZipFile(file: Pick<File, "name" | "type">): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".cbz") || lower.endsWith(".zip") || file.type.includes("cbz") || file.type.includes("zip");
}
