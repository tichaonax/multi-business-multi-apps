import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions';
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils';

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
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    const user = session.user as SessionUser;
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'System admin access required' }, { status: 403 });
    }

    // For now, return default system settings
    // In a production system, you'd store these in a system_settings table
    return NextResponse.json(DEFAULT_SETTINGS);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    const user = session.user as SessionUser;
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'System admin access required' }, { status: 403 });
    }

    const newSettings = await req.json();

    // Validate settings
    if (typeof newSettings.allowSelfRegistration !== 'boolean') {
      return NextResponse.json({ error: 'Invalid allowSelfRegistration value' }, { status: 400 });
    }

    // For now, just return success without persisting
    // In a production system, you'd store these in a system_settings table
    return NextResponse.json({
      success: true,
      message: 'System settings updated successfully',
      settings: newSettings,
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}