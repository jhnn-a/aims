// Device Type Normalization Utility
// Provides canonical device type handling across the entire application

export const CANONICAL_DEVICE_TYPES = [
  { label: "Headset", code: "H", joiiCode: "JOIIH" },
  { label: "Keyboard", code: "KB", joiiCode: "JOIIKB" },
  { label: "Laptop", code: "LPT", joiiCode: "JOIILPT" },
  { label: "Monitor", code: "MN", joiiCode: "JOIIMN" },
  { label: "Mouse", code: "M", joiiCode: "JOIIM" },
  { label: "PC", code: "PC", joiiCode: "JOIIPC" },
  { label: "PSU", code: "PSU", joiiCode: "JOIIPSU" },
  { label: "RAM", code: "RAM", joiiCode: "JOIIRAM" },
  { label: "SSD", code: "SSD", joiiCode: "JOIISSD" },
  { label: "UPS", code: "UPS", joiiCode: "JOIIUPS" },
  { label: "Webcam", code: "W", joiiCode: "JOIIW" },
  { label: "Docking Station", code: "DS", joiiCode: "JOIIDS" },
];

// Normalize device type to canonical form (case-insensitive)
export const normalizeDeviceType = (deviceType) => {
  if (!deviceType) return null;

  const canonical = CANONICAL_DEVICE_TYPES.find(
    (type) => type.label.toLowerCase() === deviceType.toString().toLowerCase()
  );

  return canonical ? canonical.label : null;
};

// Get device type configuration by label
export const getDeviceTypeConfig = (deviceType) => {
  if (!deviceType) return null;

  return CANONICAL_DEVICE_TYPES.find(
    (type) => type.label.toLowerCase() === deviceType.toString().toLowerCase()
  );
};

// Get all device type labels for dropdowns
export const getDeviceTypeLabels = () => {
  return CANONICAL_DEVICE_TYPES.map((type) => type.label);
};

// Legacy device types that should be normalized
export const LEGACY_DEVICE_TYPE_MAP = {
  webcam: "Webcam",
  WEBCAM: "Webcam",
  WebCam: "Webcam",
  "web cam": "Webcam",
  headset: "Headset",
  HEADSET: "Headset",
  HeadSet: "Headset",
  "head set": "Headset",
  keyboard: "Keyboard",
  KEYBOARD: "Keyboard",
  KeyBoard: "Keyboard",
  "key board": "Keyboard",
  laptop: "Laptop",
  LAPTOP: "Laptop",
  LapTop: "Laptop",
  "lap top": "Laptop",
  monitor: "Monitor",
  MONITOR: "Monitor",
  Monitor: "Monitor",
  mouse: "Mouse",
  MOUSE: "Mouse",
  Mouse: "Mouse",
  pc: "PC",
  PC: "PC",
  Pc: "PC",
  psu: "PSU",
  PSU: "PSU",
  Psu: "PSU",
  ram: "RAM",
  RAM: "RAM",
  Ram: "RAM",
  ssd: "SSD",
  SSD: "SSD",
  Ssd: "SSD",
  ups: "UPS",
  UPS: "UPS",
  Ups: "UPS",
  "docking station": "Docking Station",
  "DOCKING STATION": "Docking Station",
  "Docking station": "Docking Station",
  dockingstation: "Docking Station",
  DOCKINGSTATION: "Docking Station",
};

// Normalize device type using legacy map fallback
export const normalizeDeviceTypeWithLegacy = (deviceType) => {
  if (!deviceType) return null;

  const deviceTypeStr = deviceType.toString();

  // First try direct canonical lookup
  const canonical = normalizeDeviceType(deviceTypeStr);
  if (canonical) return canonical;

  // Then try legacy lookup
  const legacyMapping = LEGACY_DEVICE_TYPE_MAP[deviceTypeStr];
  if (legacyMapping) return legacyMapping;

  // Return null if no match found
  return null;
};
