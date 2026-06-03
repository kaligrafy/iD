import { loadCustomPresets } from './setup.js';

describe('custom presets — barrier', function() {
    loadCustomPresets();

    it('loads barrier gate presets from locales', function() {
        const customersGate = iD.presetManager.item('barrier/customers_gate');
        expect(customersGate, 'customers gate').to.exist;
        expect(customersGate.name()).to.equal('Customers gate');
        expect(customersGate.tags).to.include({ barrier: 'gate', access: 'customers' });

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
