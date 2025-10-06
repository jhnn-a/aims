/**
 * Device Type Normalization Migration Script
 *
 * This script normalizes inconsistent device types in the database
 * to use canonical forms (e.g., "WEBCAM" -> "Webcam")
 *
 * Run this once to fix existing data inconsistencies
 */

import { getAllDevices, updateDevice } from "../services/deviceService";
import { normalizeDeviceTypeWithLegacy } from "./deviceTypeUtils";

export const migrateDeviceTypes = async () => {
  console.log("🔄 Starting device type migration...");

  try {
    // Get all devices
    const allDevices = await getAllDevices();
    console.log(`📊 Found ${allDevices.length} devices to check`);

    let updatedCount = 0;
    const updates = [];

    // Check each device for normalization needs
    for (const device of allDevices) {
      if (!device.deviceType) {
        console.warn(`⚠️ Device ${device.id} has no deviceType`);
        continue;
      }

      const normalizedType = normalizeDeviceTypeWithLegacy(device.deviceType);

      if (!normalizedType) {
        console.warn(
          `⚠️ Device ${device.id} has unrecognized deviceType: "${device.deviceType}"`
        );
        continue;
      }

      // Check if normalization is needed
      if (device.deviceType !== normalizedType) {
        updates.push({
          id: device.id,
          currentType: device.deviceType,
          normalizedType: normalizedType,
          deviceTag: device.deviceTag,
        });
      }
    }

    console.log(
      `🔍 Found ${updates.length} devices needing type normalization:`
    );
    updates.forEach((update) => {
      console.log(
        `  • ${update.deviceTag || update.id}: "${update.currentType}" -> "${
          update.normalizedType
        }"`
      );
    });

    if (updates.length === 0) {
      console.log("✅ No device types need normalization");
      return { success: true, updatedCount: 0, details: [] };
    }

    // Confirm before proceeding
    const proceed = confirm(
      `This will update ${updates.length} device type(s) to use canonical forms.\n\n` +
        "Examples:\n" +
        updates
          .slice(0, 5)
          .map((u) => `• "${u.currentType}" -> "${u.normalizedType}"`)
          .join("\n") +
        (updates.length > 5 ? `\n...and ${updates.length - 5} more` : "") +
        "\n\nProceed with migration?"
    );

    if (!proceed) {
      console.log("❌ Migration cancelled by user");
      return { success: false, updatedCount: 0, details: [], cancelled: true };
    }

    // Perform updates
    console.log("🚀 Starting updates...");
    for (const update of updates) {
      try {
        await updateDevice(update.id, { deviceType: update.normalizedType });
        updatedCount++;
        console.log(
          `✅ Updated ${update.deviceTag || update.id}: "${
            update.currentType
          }" -> "${update.normalizedType}"`
        );
      } catch (error) {
        console.error(
          `❌ Failed to update ${update.deviceTag || update.id}:`,
          error
        );
      }
    }

    console.log(
      `🎉 Migration completed! Updated ${updatedCount}/${updates.length} devices`
    );

    return {
      success: true,
      updatedCount,
      totalChecked: allDevices.length,
      details: updates,
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return {
      success: false,
      error: error.message,
      updatedCount: 0,
    };
  }
};

// Preview function to see what would be changed without making changes
export const previewDeviceTypeMigration = async () => {
  console.log("🔍 Previewing device type migration...");

  try {
    const allDevices = await getAllDevices();
    const preview = [];

    for (const device of allDevices) {
      if (!device.deviceType) continue;

      const normalizedType = normalizeDeviceTypeWithLegacy(device.deviceType);

      if (normalizedType && device.deviceType !== normalizedType) {
        preview.push({
          id: device.id,
          deviceTag: device.deviceTag,
          currentType: device.deviceType,
          normalizedType: normalizedType,
        });
      }
    }

    console.log(`📋 Preview: ${preview.length} devices would be updated:`);
    preview.forEach((item) => {
      console.log(
        `  • ${item.deviceTag || item.id}: "${item.currentType}" -> "${
          item.normalizedType
        }"`
      );
    });

    return preview;
  } catch (error) {
    console.error("❌ Preview failed:", error);
    return [];
  }
};
