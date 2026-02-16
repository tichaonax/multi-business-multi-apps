import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions';
import { isSystemAdmin } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

interface SystemSettings {
  allowSelfRegistration: boolean;
  defaultRegistrationRole: string;
  defaultRegistrationPermissions: any;
  requireAdminApproval: boolean;
  maxUsersPerBusiness: number;
  globalDateFormat: string;
  defaultCountryCode: string;
  defaultIdFormatTemplateId: string;
  defaultMileageUnit: string;
  maxPaymentWithoutId: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  allowSelfRegistration: true,
  defaultRegistrationRole: 'employee',
  defaultRegistrationPermissions: BUSINESS_PERMISSION_PRESETS['employee'],
  requireAdminApproval: false,
  maxUsersPerBusiness: 50,
  globalDateFormat: 'dd/mm/yyyy',
  defaultCountryCode: 'ZW',
  defaultIdFormatTemplateId: 'cmfm8wyzp00001pek06cu95hb', // Zimbabwe National ID
  defaultMileageUnit: 'km',
  maxPaymentWithoutId: 100, // Maximum payment amount to individuals without national ID
};

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin

    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'System admin access required' }, { status: 403 });
    }

    // Fetch settings from database, or create default if not exists
    let settings = await prisma.systemSettings.findFirst();

    if (!settings) {
      // Create default settings on first access
      settings = await prisma.systemSettings.create({
        data: {
          allowSelfRegistration: DEFAULT_SETTINGS.allowSelfRegistration,
          defaultRegistrationRole: DEFAULT_SETTINGS.defaultRegistrationRole,
          defaultRegistrationPermissions: DEFAULT_SETTINGS.defaultRegistrationPermissions,
          requireAdminApproval: DEFAULT_SETTINGS.requireAdminApproval,
          maxUsersPerBusiness: DEFAULT_SETTINGS.maxUsersPerBusiness,
          globalDateFormat: DEFAULT_SETTINGS.globalDateFormat,
          defaultCountryCode: DEFAULT_SETTINGS.defaultCountryCode,
          defaultIdFormatTemplateId: DEFAULT_SETTINGS.defaultIdFormatTemplateId,
          defaultMileageUnit: DEFAULT_SETTINGS.defaultMileageUnit,
          maxPaymentWithoutId: DEFAULT_SETTINGS.maxPaymentWithoutId,
        }
      });
    }

    // Convert Decimal to number for JSON response
    return NextResponse.json({
      ...settings,
      maxPaymentWithoutId: Number(settings.maxPaymentWithoutId),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin

    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'System admin access required' }, { status: 403 });
    }

    const newSettings = await req.json();

    // Validate settings
    if (typeof newSettings.allowSelfRegistration !== 'boolean') {
      return NextResponse.json({ error: 'Invalid allowSelfRegistration value' }, { status: 400 });
    }

    // Find existing settings or create new
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      // Update existing settings
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          allowSelfRegistration: newSettings.allowSelfRegistration,
          defaultRegistrationRole: newSettings.defaultRegistrationRole,
          defaultRegistrationPermissions: newSettings.defaultRegistrationPermissions,
          requireAdminApproval: newSettings.requireAdminApproval,
          maxUsersPerBusiness: newSettings.maxUsersPerBusiness,
          globalDateFormat: newSettings.globalDateFormat,
          defaultCountryCode: newSettings.defaultCountryCode,
          defaultIdFormatTemplateId: newSettings.defaultIdFormatTemplateId,
          defaultMileageUnit: newSettings.defaultMileageUnit,
          maxPaymentWithoutId: newSettings.maxPaymentWithoutId,
        }
      });
    } else {
      // Create new settings
      settings = await prisma.systemSettings.create({
        data: {
          allowSelfRegistration: newSettings.allowSelfRegistration,
          defaultRegistrationRole: newSettings.defaultRegistrationRole,
          defaultRegistrationPermissions: newSettings.defaultRegistrationPermissions,
          requireAdminApproval: newSettings.requireAdminApproval,
          maxUsersPerBusiness: newSettings.maxUsersPerBusiness,
          globalDateFormat: newSettings.globalDateFormat,
          defaultCountryCode: newSettings.defaultCountryCode,
          defaultIdFormatTemplateId: newSettings.defaultIdFormatTemplateId,
          defaultMileageUnit: newSettings.defaultMileageUnit,
          maxPaymentWithoutId: newSettings.maxPaymentWithoutId,
        }
      });
    }

    // Convert Decimal to number for JSON response
    return NextResponse.json({
      success: true,
      message: 'System settings updated successfully',
      settings: {
        ...settings,
        maxPaymentWithoutId: Number(settings.maxPaymentWithoutId),
      },
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}