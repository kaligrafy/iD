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

        const customersLiftgate = iD.presetManager.item('barrier/customers_liftgate');
        expect(customersLiftgate, 'customers lift gate').to.exist;
        expect(customersLiftgate.name()).to.equal('Customers lift gate');
        expect(customersLiftgate.tags).to.include({ barrier: 'lift_gate', access: 'customers' });
        expect(customersLiftgate.geometry).to.eql(['vertex', 'line']);
        expect(customersLiftgate.originalFields).to.eql(['access_restricted', 'opening_hours']);
        expect(customPresets['barrier/customers_liftgate'].removeTags).to.include({ motor_vehicle: '*' });
        expect(customPresets['barrier/customers_liftgate'].matchScore).to.equal(2);

        const privateLiftgate = iD.presetManager.item('barrier/private_liftgate');
        expect(privateLiftgate, 'private lift gate').to.exist;
        expect(privateLiftgate.name()).to.equal('Private lift gate');
        expect(privateLiftgate.tags).to.include({ barrier: 'lift_gate', access: 'private' });
        expect(privateLiftgate.originalFields).to.eql(['access_restricted', 'opening_hours']);
        expect(customPresets['barrier/private_liftgate'].removeTags).to.include({ motor_vehicle: '*' });
        expect(customPresets['barrier/private_liftgate'].matchScore).to.equal(2);

        const blockNoMotor = iD.presetManager.item('barrier/block_motor_vehicle_no');
        expect(blockNoMotor, 'block no motor vehicles').to.exist;
        expect(blockNoMotor.name()).to.equal('Block (no motor vehicles)');
        expect(blockNoMotor.tags).to.eql({ barrier: 'block', motor_vehicle: 'no' });
        expect(blockNoMotor.geometry).to.eql(['point', 'vertex']);
        expect(customPresets['barrier/block_motor_vehicle_no'].matchScore).to.equal(2);
    });
});
