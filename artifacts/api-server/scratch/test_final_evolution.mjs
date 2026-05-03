async function testEvolution() {
    const instanceName = 'test_senior_final_poll';
    const baseUrl = 'http://152.67.55.69:8080';
    const apiKey = 'mostrara_global_key_2026_super_secret';

    console.log(`--- Testing Evolution API at ${baseUrl} ---`);

    try {
        // 1. Create Instance
        console.log('1. Creating instance...');
        await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
        });
        
        // 2. Poll for QR (up to 30 seconds)
        console.log('2. Polling for QR Code (max 30s)...');
        let success = false;
        for (let i = 0; i < 15; i++) {
            process.stdout.write('.');
            const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            const connectData = await connectRes.json();
            
            if (connectData.base64) {
                console.log('\n✅ SUCCESS: QR Code received!');
                console.log('QR Preview:', connectData.base64.substring(0, 50) + '...');
                success = true;
                break;
            }
            
            if (connectData.code) {
                console.log('\n✅ SUCCESS: Pairing Code received:', connectData.code);
                success = true;
                break;
            }

            await new Promise(r => setTimeout(r, 2000));
        }

        if (!success) {
            console.log('\n❌ FAIL: Timeout waiting for QR Code.');
            // Check state
            const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            const stateData = await stateRes.json();
            console.log('Final State:', JSON.stringify(stateData, null, 2));
        }

        // 3. Cleanup
        console.log('3. Cleaning up test instance...');
        await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': apiKey }
        });
        console.log('Done.');

    } catch (e) {
        console.error('Test Error:', e.message);
    }
}

testEvolution();
