import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

/**
 * Database Migration Script - Update Condition Labels
 * 
 * This script updates all existing device records to use the new condition labels:
 * - "Working" → "GOOD"
 * - "New" → "BRANDNEW"
 * - "Needs Repair" → "NEEDS REPAIR"
 * - "Defective" → "DEFECTIVE"
 * - "Retired" → "RETIRED"
 */

const CONDITION_MAPPINGS = {
  'Working': 'GOOD',
  'New': 'BRANDNEW',
  'Needs Repair': 'NEEDS REPAIR',
  'Defective': 'DEFECTIVE',
  'Retired': 'RETIRED'
};

export const migrateDeviceConditions = async () => {
  try {
    console.log('🔄 Starting device condition migration...');
    
    // Get all devices from the collection
    const devicesCollection = collection(db, 'devices');
    const devicesSnapshot = await getDocs(devicesCollection);
    
    if (devicesSnapshot.empty) {
      console.log('ℹ️  No devices found in the database.');
      return { success: true, updated: 0, total: 0 };
    }

    const devices = devicesSnapshot.docs;
    const total = devices.length;
    let updated = 0;
    let processed = 0;

    console.log(`📊 Found ${total} devices to process...`);

    // Process in batches to avoid Firestore limits
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    
    for (let i = 0; i < devices.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDevices = devices.slice(i, i + batchSize);
      let batchUpdated = 0;

      for (const deviceDoc of batchDevices) {
        const deviceData = deviceDoc.data();
        const currentCondition = deviceData.condition;
        
        // Check if condition needs migration
        if (currentCondition && CONDITION_MAPPINGS[currentCondition]) {
          const newCondition = CONDITION_MAPPINGS[currentCondition];
          const deviceRef = doc(db, 'devices', deviceDoc.id);
          
          batch.update(deviceRef, {
            condition: newCondition,
            // Add migration timestamp for tracking
            migrationDate: new Date(),
            previousCondition: currentCondition
          });
          
          batchUpdated++;
          console.log(`🔄 Queued: ${deviceData.deviceTag || 'Unknown'} - ${currentCondition} → ${newCondition}`);
        }
        
        processed++;
        
        // Show progress
        if (processed % 50 === 0) {
          console.log(`📈 Progress: ${processed}/${total} devices processed...`);
        }
      }

      if (batchUpdated > 0) {
        batches.push({ batch, count: batchUpdated });
      }
    }

    // Execute all batches
    console.log(`🚀 Executing ${batches.length} batches...`);
    
    for (let i = 0; i < batches.length; i++) {
      const { batch, count } = batches[i];
      await batch.commit();
      updated += count;
      console.log(`✅ Batch ${i + 1}/${batches.length} completed - Updated ${count} devices`);
    }

    console.log(`🎉 Migration completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total devices: ${total}`);
    console.log(`   - Updated devices: ${updated}`);
    console.log(`   - Unchanged devices: ${total - updated}`);

    return { success: true, updated, total };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const migrateDeviceHistory = async () => {
  try {
    console.log('🔄 Starting device history condition migration...');
    
    // Get all device history records
    const historyCollection = collection(db, 'deviceHistory');
    const historySnapshot = await getDocs(historyCollection);
    
    if (historySnapshot.empty) {
      console.log('ℹ️  No device history found in the database.');
      return { success: true, updated: 0, total: 0 };
    }

    const historyRecords = historySnapshot.docs;
    const total = historyRecords.length;
    let updated = 0;
    let processed = 0;

    console.log(`📊 Found ${total} history records to process...`);

    // Process in batches
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < historyRecords.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchRecords = historyRecords.slice(i, i + batchSize);
      let batchUpdated = 0;

      for (const historyDoc of batchRecords) {
        const historyData = historyDoc.data();
        const currentCondition = historyData.condition;
        
        // Check if condition needs migration
        if (currentCondition && CONDITION_MAPPINGS[currentCondition]) {
          const newCondition = CONDITION_MAPPINGS[currentCondition];
          const historyRef = doc(db, 'deviceHistory', historyDoc.id);
          
          batch.update(historyRef, {
            condition: newCondition,
            // Add migration timestamp for tracking
            migrationDate: new Date(),
            previousCondition: currentCondition
          });
          
          batchUpdated++;
          console.log(`🔄 Queued history: ${historyData.deviceTag || 'Unknown'} - ${currentCondition} → ${newCondition}`);
        }
        
        processed++;
        
        // Show progress
        if (processed % 100 === 0) {
          console.log(`📈 Progress: ${processed}/${total} history records processed...`);
        }
      }

      if (batchUpdated > 0) {
        batches.push({ batch, count: batchUpdated });
      }
    }

    // Execute all batches
    console.log(`🚀 Executing ${batches.length} history batches...`);
    
    for (let i = 0; i < batches.length; i++) {
      const { batch, count } = batches[i];
      await batch.commit();
      updated += count;
      console.log(`✅ History batch ${i + 1}/${batches.length} completed - Updated ${count} records`);
    }

    console.log(`🎉 History migration completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total history records: ${total}`);
    console.log(`   - Updated history records: ${updated}`);
    console.log(`   - Unchanged history records: ${total - updated}`);

    return { success: true, updated, total };

  } catch (error) {
    console.error('❌ History migration failed:', error);
    throw error;
  }
};

export const runFullMigration = async () => {
  try {
    console.log('🚀 Starting full condition migration...');
    console.log('⚠️  This will update ALL device and history records with old condition labels.');
    console.log('');
    
    // Migrate devices first
    const deviceResults = await migrateDeviceConditions();
    console.log('');
    
    // Then migrate device history
    const historyResults = await migrateDeviceHistory();
    console.log('');
    
    console.log('🏁 Full migration completed!');
    console.log('📊 Final Summary:');
    console.log(`   - Devices updated: ${deviceResults.updated}/${deviceResults.total}`);
    console.log(`   - History records updated: ${historyResults.updated}/${historyResults.total}`);
    console.log(`   - Total records updated: ${deviceResults.updated + historyResults.updated}`);
    
    return {
      success: true,
      devices: deviceResults,
      history: historyResults
    };
    
  } catch (error) {
    console.error('❌ Full migration failed:', error);
    throw error;
  }
};

// Export individual functions for selective migration
export default {
  migrateDeviceConditions,
  migrateDeviceHistory,
  runFullMigration,
  CONDITION_MAPPINGS
};
