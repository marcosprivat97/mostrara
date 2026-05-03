async function testPairing() {
    const instanceName = 'test_pairing_final';
    const baseUrl = 'http://152.67.55.69:8080';
    const apiKey = 'mostrara_global_key_2026_super_secret';

    console.log(`--- Testing Pairing Code at ${baseUrl} ---`);

    try {
        console.log('1. Creating instance with pairing code...');
        const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ 
                instanceName, 
                qrcode: false, 
                number: '5521999999999',
                integration: 'WHATSAPP-BAILEYS' 
            })
        });
        const createData = await createRes.json();
        console.log('Create Response:', JSON.stringify(createData, null, 2));

        console.log('2. Waiting for pairing code...');
        for (let i = 0; i < 10; i++) {
            process.stdout.write('.');
            const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            const connectData = await connectRes.json();
            
            if (connectData.code) {
                console.log('\n✅ SUCCESS: Pairing Code received:', connectData.code);
                return;
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        console.log('\n❌ FAIL: Pairing Code timeout.');
    } catch (e) {
        console.error('Test Error:', e.message);
    }
}

testPairing();
