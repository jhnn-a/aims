// Test script to check UnitSpecs condition values
const admin = require('firebase-admin');
const serviceAccount = require('./firebase_import/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkConditions() {
  console.log('=== CHECKING UNITSPECS CONDITIONS ===');
  
  try {
    // Check InventoryUnits
    const inventorySnapshot = await db.collection('InventoryUnits').limit(5).get();
    console.log('\n📦 INVENTORY UNITS (Sample):');
    inventorySnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Tag: ${data.Tag || 'No tag'}`);
      console.log(`  Condition: ${data.condition || data.Condition || 'No condition'}`);
      console.log(`  Device Type: ${data.deviceType || 'No type'}`);
      console.log(`  Has maintenance: ${!!data.maintenanceChecklist}`);
      console.log('---');
    });
    
    // Check DeployedUnits  
    const deployedSnapshot = await db.collection('DeployedUnits').limit(5).get();
    console.log('\n🚀 DEPLOYED UNITS (Sample):');
    deployedSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}`);
      console.log(`  Tag: ${data.Tag || 'No tag'}`);
      console.log(`  Condition: ${data.condition || data.Condition || 'No condition'}`);
      console.log(`  Device Type: ${data.deviceType || 'No type'}`);
      console.log(`  Has maintenance: ${!!data.maintenanceChecklist}`);
      console.log('---');
    });
    
    // Get condition distribution
    const allInventory = await db.collection('InventoryUnits').get();
    const allDeployed = await db.collection('DeployedUnits').get();
    
    const conditionCounts = {};
    
    console.log('\n📊 CONDITION DISTRIBUTION:');
    [...allInventory.docs, ...allDeployed.docs].forEach(doc => {
      const data = doc.data();
      const condition = data.condition || data.Condition || 'Unknown';
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });
    
    Object.entries(conditionCounts).forEach(([condition, count]) => {
      console.log(`${condition}: ${count} devices`);
    });
    
    console.log(`\nTotal devices: ${allInventory.size + allDeployed.size}`);
    console.log(`Inventory: ${allInventory.size}, Deployed: ${allDeployed.size}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkConditions();
