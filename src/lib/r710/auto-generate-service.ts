/**
 * R710 Auto-Generation Service
 *
 * Background service that automatically generates tokens when inventory falls below threshold
 *
 * CRITICAL: Only generates tokens for accessible devices
 */

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getR710Executor } from '@/lib/r710/executors';
import { durationUnitMap } from '@/lib/r710/duration-unit-map';

interface AutoGenerationResult {
  success: boolean;
  businessesProcessed: number;
  tokensGenerated: number;
  errors: string[];
  timestamp: Date;
}

/**
 * Check all businesses and auto-generate tokens where inventory is low
 *
 * This should be called periodically (e.g., every 10 minutes) by a background job
 */
export async function runAutoGenerationCheck(): Promise<AutoGenerationResult> {
  const startTime = Date.now();
  const result: AutoGenerationResult = {
    success: true,
    businessesProcessed: 0,
    tokensGenerated: 0,
    errors: [],
    timestamp: new Date()
  };

  console.log('[R710 Auto-Gen] Starting auto-generation check...');

  try {
    // Get all active R710 integrations
    const integrations = await prisma.r710BusinessIntegrations.findMany({
      where: { isActive: true },
      include: {
        device_registry: true,
        businesses: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`[R710 Auto-Gen] Found ${integrations.length} active integration(s)`);

    // Process each business
    for (const integration of integrations) {
      try {
        await processBusinessAutoGeneration(integration, result);
        result.businessesProcessed++;
      } catch (error) {
        const errorMsg = `Business ${integration.businesses.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[R710 Auto-Gen] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[R710 Auto-Gen] Check complete in ${duration}ms: ` +
      `processed=${result.businessesProcessed}, ` +
      `generated=${result.tokensGenerated}, ` +
      `errors=${result.errors.length}`
    );

    result.success = result.errors.length === 0;

  } catch (error) {
    console.error('[R710 Auto-Gen] Fatal error:', error);
    result.success = false;
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Process auto-generation for a single business
 */
async function processBusinessAutoGeneration(
  integration: any,
  result: AutoGenerationResult
): Promise<void> {
  const businessId = integration.businessId;
  const businessName = integration.businesses.name;
  const device = integration.device_registry;
  const genStartTime = Date.now();

  // CRITICAL: Check if device is accessible
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const isAccessible =
    device.connectionStatus === 'CONNECTED' &&
    device.lastHealthCheck &&
    device.lastHealthCheck >= fiveMinutesAgo;

  if (!isAccessible) {
    console.log(
      `[R710 Auto-Gen] Skipping ${businessName} - Device ${device.ipAddress} not accessible ` +
      `(status: ${device.connectionStatus}, last check: ${device.lastHealthCheck})`
    );

    // Log skipped generation
    await prisma.r710SyncLogs.create({
      data: {
        businessId,
        deviceRegistryId: integration.deviceRegistryId,
        syncType: 'AUTO_GENERATION',
        status: 'DEVICE_UNREACHABLE',
        tokensChecked: 0,
        tokensUpdated: 0,
        syncDurationMs: Date.now() - genStartTime
      }
    }).catch(err => {
      console.error('[R710 Auto-Gen] Failed to log skip:', err);
    });

    return;
  }

  // Get WLAN for this business
  const wlan = await prisma.r710Wlans.findFirst({
    where: {
      businessId,
      deviceRegistryId: integration.deviceRegistryId
    }
  });

  if (!wlan) {
    console.log(`[R710 Auto-Gen] Skipping ${businessName} - No WLAN found`);
    return;
  }

  // Get all active token configurations
  const configs = await prisma.r710TokenConfigs.findMany({
    where: { isActive: true }
  });

  // Check inventory for each config
  let totalGenerated = 0;
  let hasError = false;
  let errorMessage = '';

  for (const config of configs) {
    const availableCount = await prisma.r710Tokens.count({
      where: {
        businessId,
        tokenConfigId: config.id,
        status: 'AVAILABLE'
      }
    });

    // Default threshold: 5 tokens
    const threshold = 5;
    // Default quantity to generate: 20 tokens
    const quantityToGenerate = 20;

    if (availableCount < threshold) {
      console.log(
        `[R710 Auto-Gen] ${businessName} - Config "${config.name}" has ${availableCount} tokens (< ${threshold}). Generating ${quantityToGenerate}...`
      );

      try {
        const generated = await generateTokensForConfig(
          businessId,
          config,
          wlan,
          device,
          quantityToGenerate
        );

        result.tokensGenerated += generated;
        totalGenerated += generated;

        console.log(
          `[R710 Auto-Gen] ${businessName} - Successfully generated ${generated} tokens for "${config.name}"`
        );
      } catch (error) {
        const errorMsg = `Failed to generate tokens for ${businessName} / ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[R710 Auto-Gen] ${errorMsg}`);
        result.errors.push(errorMsg);
        hasError = true;
        errorMessage = errorMsg;
      }
    }
  }

  // Log generation result
  await prisma.r710SyncLogs.create({
    data: {
      businessId,
      deviceRegistryId: integration.deviceRegistryId,
      syncType: 'AUTO_GENERATION',
      status: hasError ? 'ERROR' : 'SUCCESS',
      tokensChecked: configs.length,
      tokensUpdated: totalGenerated,
      errorMessage: hasError ? errorMessage : null,
      syncDurationMs: Date.now() - genStartTime
    }
  }).catch(err => {
    console.error('[R710 Auto-Gen] Failed to log generation:', err);
  });
}

/**
 * Generate tokens for a specific configuration
 */
async function generateTokensForConfig(
  businessId: string,
  config: any,
  wlan: any,
  device: any,
  quantity: number
): Promise<number> {
  const executor = getR710Executor(device.connectionMode);
  const adminPassword = decrypt(device.encryptedAdminPassword);
  const apiDurationUnit = durationUnitMap[config.durationUnit] || 'hour';

  const result = await executor.generateTokens(
    {
      deviceRegistryId: device.id,
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword
    },
    {
      wlanName: wlan.ssid,
      count: quantity,
      duration: config.durationValue,
      durationUnit: apiDurationUnit,
      deviceLimit: 2 // Default device limit
    }
  );

  if (!result.success || !result.tokens || result.tokens.length === 0) {
    throw new Error(result.error || 'No tokens were generated by R710 device');
  }

  // Store tokens in database. Duration is expressed in config's own unit —
  // convert to seconds for validTimeSeconds and to ms for the expiry calc.
  const durationSeconds = apiDurationUnit === 'day'
    ? config.durationValue * 86400
    : apiDurationUnit === 'week'
      ? config.durationValue * 604800
      : config.durationValue * 3600; // 'hour'

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

  const tokensToCreate = result.tokens.map(token => ({
    businessId,
    wlanId: wlan.id,
    tokenConfigId: config.id,
    username: token.username,
    password: token.password,
    status: 'AVAILABLE' as const,
    validTimeSeconds: durationSeconds,
    expiresAtR710: expiresAt,
    createdAtR710: now,
    lastSyncedAt: now
  }));

  const createdTokens = await prisma.r710Tokens.createMany({
    data: tokensToCreate
  });

  return createdTokens.count;
}

/**
 * Get auto-generation statistics for monitoring
 */
export async function getAutoGenerationStats() {
  // Get businesses with low token inventory
  const configs = await prisma.r710TokenConfigs.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  const integrations = await prisma.r710BusinessIntegrations.findMany({
    where: { isActive: true },
    select: {
      businessId: true,
      businesses: {
        select: {
          name: true
        }
      }
    }
  });

  const lowStockBusinesses = [];

  for (const integration of integrations) {
    for (const config of configs) {
      const availableCount = await prisma.r710Tokens.count({
        where: {
          businessId: integration.businessId,
          tokenConfigId: config.id,
          status: 'AVAILABLE'
        }
      });

      if (availableCount < 5) {
        lowStockBusinesses.push({
          businessId: integration.businessId,
          businessName: integration.businesses.name,
          configId: config.id,
          configName: config.name,
          availableCount
        });
      }
    }
  }

  return {
    totalBusinesses: integrations.length,
    totalConfigs: configs.length,
    lowStockBusinesses
  };
}
