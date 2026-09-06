export interface BootTelemetry {
  mainEntered: boolean;
  pixiInitDone: boolean;
  rendererImportDone: boolean;
  rendererCreated: boolean;
  rendererInitStarted: boolean;
  rendererInitDone: boolean;
  hudCreated: boolean;
  connectCallReached: boolean;
  startupException: boolean;
  startupExceptionDetails?: string;
}

export const bootTelemetry: BootTelemetry = {
  mainEntered: false,
  pixiInitDone: false,
  rendererImportDone: false,
  rendererCreated: false,
  rendererInitStarted: false,
  rendererInitDone: false,
  hudCreated: false,
  connectCallReached: false,
  startupException: false,
};

(window as any).__DEV_BOOT_TELEMETRY__ = bootTelemetry;
