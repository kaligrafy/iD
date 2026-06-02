#!/usr/bin/env node
/**
 * List Transition-specific presets in v5 (kaligrafy/iD) and mark which exist in v6
 * `data/custom-tagging/`. Writes markdown checkboxes to stdout or a file.
 *
 * Usage:
 *   node scripts/list_v5_presets_port.js
 *   node scripts/list_v5_presets_port.js --write tasks/v5-presets-todo.md
 *
 * v5 path: ../id/data/presets/presets/ (sibling repo) or ID_V5_PRESETS_ROOT env.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const v5Root = process.env.ID_V5_PRESETS_ROOT
    || path.resolve(__dirname, '../../id/data/presets/presets');
const v6RegistryPath = path.resolve(__dirname, '../data/custom-tagging/src/registry.ts');

const v6Done = new Set([
    'highway/footway/footway_link',
    'highway/footway/footway_link_bicycle_dismount',
    'highway/footway/footway_link_bicycle_yes',
    'highway/cycleway/cycleway_link'
]);

/** v5 ids superseded by a different v6 preset id. */
const v6Equivalent = {
    'highway/cycleway/crossing/cycleway_link': 'highway/cycleway/cycleway_link'
};

const excludeIds = new Set(['office/private_investigator']);

/** Preset ids that are Transition-specific (heuristic on id). */
const idRe = /(customers|private|access_aisle|footway_link|cycleway_link|bicycle_dismount|_sidewalk_|opposite-use_sidepath|service-customers|service-private|service-destination|parking-customers|parking-private|customers_gate|private-gate|truck_repair|unmarked_(customers|private|concrete|asphalt)|crossing\/(traffic_signals|uncontrolled|unmarked)|cycleway\/crossing)/;

function walkPresets(dir, prefix = '') {
    const out = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            out.push(...walkPresets(full, prefix ? `${prefix}/${ent.name}` : ent.name));
        } else if (ent.name.endsWith('.json')) {
            const id = prefix ? `${prefix}/${ent.name.replace(/\.json$/, '')}` : ent.name.replace(/\.json$/, '');
            out.push(id);
        }
    }
    return out;
}

function groupIds(ids) {
    const groups = {};
    for (const id of ids) {
        const top = id.split('/').slice(0, 2).join('/');
        if (!groups[top]) groups[top] = [];
        groups[top].push(id);
    }
    return groups;
}

function checkbox(id) {
    if (v6Done.has(id) || v6Equivalent[id]) return '- [x]';
    return '- [ ]';
}

function main() {
    if (!fs.existsSync(v5Root)) {
        console.error(`v5 presets not found: ${v5Root}`);
        console.error('Set ID_V5_PRESETS_ROOT or clone id repo beside id-v6.');
        process.exit(1);
    }
    const ids = walkPresets(v5Root).filter(id => idRe.test(id) && !excludeIds.has(id)).sort();
    const groups = groupIds(ids);
    const sortedKeys = Object.keys(groups).sort();

    let md = `# Presets v5 → v6 (checklist)\n\n`;
    md += `Généré par \`node scripts/list_v5_presets_port.js\` le ${new Date().toISOString().slice(0, 10)}.\n\n`;
    md += `**Source v5:** \`${v5Root}\` (fichiers JSON, heuristique sur l’id).\n\n`;
    md += `**Registre v6** (\`data/custom-tagging/src/registry.ts\`): ${[...v6Done].map(id => `\`${id}\``).join(', ')}.\n\n`;
    md += `## Porté en v6 (hors liste v5)\n\n`;
    md += `- [x] \`highway/footway/footway_link_bicycle_dismount\` (nouveau en v6)\n`;
    md += `- [x] \`highway/footway/footway_link_bicycle_yes\` (nouveau en v6)\n\n`;
    md += `## Champs / templates (pas des presets)\n\n`;
    md += `Voir [v5-inventory.md](./v5-inventory.md) §3 — portés autrement en v6 :\n\n`;
    md += `- [x] \`placement\` (champ, \`data/custom-tagging/\`)\n`;
    md += `- [x] \`sidewalk\` (champ sur routes, PR #31)\n`;
    md += `- [x] \`cycleway\` + sous-champs (PR #32–#36)\n`;
    md += `- [ ] \`buswaylanes\`\n`;
    md += `- [ ] \`access\` (clés \`routing:*\`, etc.)\n\n`;
    md += `> v5 embarque tout un vieux tagging-schema (~6200 presets). Cette liste ne couvre **que** les ids Transition (clients/privé, liens, traversées détaillées, etc.), pas l’amont NSI.\n\n`;
    md += `**Note:** En v5, le lien cyclable était \`highway/cycleway/crossing/cycleway_link\` ; en v6 c’est \`highway/cycleway/cycleway_link\` (ligne). Les variantes \`footway_link_bicycle_*\` sont nouvelles en v6.\n\n`;

    let done = 0;
    let total = 0;
    for (const key of sortedKeys) {
        md += `## ${key}\n\n`;
        for (const id of groups[key]) {
            if (v6Done.has(id) || v6Equivalent[id]) done++;
            total++;
            const eq = v6Equivalent[id] ? ` → v6: \`${v6Equivalent[id]}\`` : '';
            md += `${checkbox(id)} \`${id}\`${eq}\n`;
        }
        md += '\n';
    }
    const v6Only = 2;
    md += `---\n\n**Progression:** ${done} / ${total} ids v5 cochés (+ ${v6Only} presets v6-only + champs ci-dessus).\n`;
    md += `Regénérer: \`node scripts/list_v5_presets_port.js --write\`\n`;

    if (process.argv.includes('--write')) {
        const outPath = path.resolve(__dirname, '../tasks/v5-presets-todo.md');
        fs.writeFileSync(outPath, md);
        console.log(`Wrote ${outPath} (${total} presets, ${done} done)`);
    } else {
        process.stdout.write(md);
    }
}

main();
