import { loadCustomPresets, loadCustomDistJson } from './setup.js';
import { presetShortcutDrawingGeometry } from '../../../../modules/core/preset_shortcut_format.js';

describe('custom presets — barrier', function() {
    loadCustomPresets();

    it('loads barrier gate presets from locales', async function() {
        const { customPresets } = await loadCustomDistJson();

        const customersGate = iD.presetManager.item('barrier/customers_gate');
        expect(customersGate, 'customers gate').to.exist;
        expect(customersGate.name()).to.equal('Customers gate');
        expect(customersGate.tags).to.include({ barrier: 'gate', access: 'customers' });
        expect(customersGate.geometry).to.eql(['vertex']);
        expect(customPresets['barrier/customers_gate'].matchScore).to.equal(2);
        expect(presetShortcutDrawingGeometry(customersGate)).to.equal('point');

        const customersGateLine = iD.presetManager.item('barrier/customers_gate_line');
        expect(customersGateLine, 'customers gate line').to.exist;
        expect(customersGateLine.geometry).to.eql(['line']);

        const privateGate = iD.presetManager.item('barrier/private_gate');
        expect(privateGate, 'private gate').to.exist;
        expect(privateGate.geometry).to.eql(['vertex']);
        expect(customPresets['barrier/private_gate'].matchScore).to.equal(2);
        expect(presetShortcutDrawingGeometry(privateGate)).to.equal('point');

        const privateGateLine = iD.presetManager.item('barrier/private_gate_line');
        expect(privateGateLine, 'private gate line').to.exist;
        expect(privateGateLine.geometry).to.eql(['line']);
        expect(presetShortcutDrawingGeometry(privateGateLine)).to.equal('line');

        const publicGate = iD.presetManager.item('barrier/gate_foot_bicycle_yes');
        expect(publicGate, 'public foot/bicycle gate').to.exist;
        expect(publicGate.name()).to.equal('Public gate (foot and bicycle, no motor vehicles)');
        expect(publicGate.tags).to.eql({
            barrier: 'gate',
            foot: 'yes',
            bicycle: 'yes',
            motor_vehicle: 'no'
        });
    });
});
