/**
 * Check token configs for Hwandaza Padam
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfigs() {
  // Find Hwandaza Padam business
  const business = await prisma.businesses.findFirst({
    where: { name: { contains: 'Hwandaza' } }
  });

  if (!business) {
    console.log('Business not found');
    return;
  }

  console.log('Business:', business.name, '(ID:', business.id + ')');

  // Find WLAN
  const wlan = await prisma.r710Wlans.findFirst({
    where: { businessId: business.id }
  });

  if (wlan) {
    console.log('WLAN:', wlan.ssid, '(ID:', wlan.id + ')');
  } else {
    console.log('No WLAN found for this business!');
  }

  // Find all token configs for this business
  const configs = await prisma.r710TokenConfigs.findMany({
    where: { businessId: business.id },
    select: {
      id: true,
      name: true,
      durationValue: true,
      durationUnit: true,
      basePrice: true,
      isActive: true,
      wlanId: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('\nToken Configs (' + configs.length + ' total):');
  configs.forEach((c, i) => {
    const status = c.isActive ? '✓ Active' : '✗ Inactive';
    const wlanMatch = wlan && c.wlanId === wlan.id ? '' : ' [WLAN MISMATCH!]';
    console.log(`  ${i+1}. [${status}] ${c.name} - $${c.basePrice} (${c.durationValue} ${c.durationUnit})${wlanMatch}`);
    console.log(`      ID: ${c.id}`);
    console.log(`      WLAN ID: ${c.wlanId}`);
  });

  // Check for menu items linked to these configs
  const menuItems = await prisma.r710BusinessTokenMenuItems.findMany({
    where: { businessId: business.id },
    include: {
      r710_token_configs: { select: { id: true, name: true, isActive: true } }
    }
  });

  console.log('\nR710 Business Token Menu Items (' + menuItems.length + '):');
  menuItems.forEach((m, i) => {
    const configStatus = m.r710_token_configs?.isActive ? '✓' : '✗';
    console.log(`  ${i+1}. [${configStatus}] ${m.r710_token_configs?.name || 'Unknown config'}`);
    console.log(`      Config ID: ${m.tokenConfigId}`);
  });

  // Also check MenuComboItems that might reference token configs
  const comboItems = await prisma.menuComboItems.findMany({
    where: {
      tokenConfigId: { not: null },
      menu_combos: {
        businessId: business.id
      }
    },
    include: {
      r710_token_configs: { select: { id: true, name: true } },
      menu_combos: { select: { name: true } }
    }
  });

  if (comboItems.length > 0) {
    console.log('\nMenu Combo Items with WiFi Tokens (' + comboItems.length + '):');
    comboItems.forEach((c, i) => {
      console.log(`  ${i+1}. Combo: ${c.menu_combos?.name} -> Token: ${c.r710_token_configs?.name}`);
    });
  }
}

checkConfigs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
