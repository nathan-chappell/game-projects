import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve('src');
async function sources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory()
          ? sources(path)
          : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
            ? [path]
            : [];
      }),
    )
  ).flat();
}
const files = await sources(root);
const graph = new Map<string, string[]>();
for (const file of files) {
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.importClause?.isTypeOnly) continue;
    const bindings = statement.importClause?.namedBindings;
    if (
      bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.length &&
      bindings.elements.every((binding) => binding.isTypeOnly)
    )
      continue;
    const name = statement.moduleSpecifier.text;
    if (name.startsWith('.') && name.endsWith('.ts')) imports.push(resolve(dirname(file), name));
  }
  graph.set(file, imports);
}
const done = new Set<string>(),
  active = new Set<string>();
function visit(file: string, path: string[]) {
  if (active.has(file))
    throw new Error(
      'Runtime import cycle: ' + [...path, file].map((name) => relative(root, name)).join(' → '),
    );
  if (done.has(file)) return;
  active.add(file);
  for (const dependency of graph.get(file) ?? []) visit(dependency, [...path, file]);
  active.delete(file);
  done.add(file);
}
for (const file of files) visit(file, []);
console.log(`Checked ${files.length} modules: no runtime import cycles.`);
