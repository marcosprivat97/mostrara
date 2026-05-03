async function testFinal() {
    const instanceName = 'test_senior_final_amd';
    const baseUrl = 'http://147.15.38.136:8080';
    const apiKey = 'mostrara_global_key_2026_super_secret';

    console.log(`--- Testing Evolution API at ${baseUrl} (AMD NATIVE) ---`);

    try {
        console.log('1. Creating instance...');
        const createRes = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
        });
        const createData = await createRes.json();
        console.log('Create Response:', JSON.stringify(createData, null, 2));

        console.log('2. Polling for QR Code (max 30s)...');
        for (let i = 0; i < 15; i++) {
            process.stdout.write('.');
            const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            const connectData = await connectRes.json();
            
            if (connectData.base64) {
                console.log('\n✅ SUCCESS: QR Code received!');
                console.log('QR Preview (start):', connectData.base64.substring(0, 50) + '...');
                return;
            }
            if (connectData.code) {
                console.log('\n✅ SUCCESS: Pairing Code received:', connectData.code);
                return;
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        console.log('\n❌ FAIL: Timeout waiting for QR Code.');
    } catch (e) {
        console.error('Test Error:', e.message);
    }
}

testFinal();
