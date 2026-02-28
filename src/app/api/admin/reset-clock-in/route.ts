import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { scope } = body; // 'today' | 'all'

    if (scope !== 'today' && scope !== 'all') {
      return NextResponse.json({ message: 'Invalid scope. Use "today" or "all".' }, { status: 400 });
    }

    let attendanceDeleted = 0;
    let adjustmentsDeleted = 0;

    if (scope === 'today') {
      // Build today's date range (midnight to midnight)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const result = await prisma.employeeAttendance.deleteMany({
        where: { date: { gte: startOfDay, lte: endOfDay } }
      });
      attendanceDeleted = result.count;
    } else {
      // Delete all attendance records
      const result = await prisma.employeeAttendance.deleteMany({});
      attendanceDeleted = result.count;

      // Also delete clock-in payroll adjustments
      const adjResult = await prisma.payrollAdjustments.deleteMany({
        where: { isClockInAdjustment: true }
      });
      adjustmentsDeleted = adjResult.count;
    }

    console.log(`🔄 Clock-in data reset by ${user.name} (${user.email}): scope=${scope}, attendance=${attendanceDeleted}, adjustments=${adjustmentsDeleted}`);

    return NextResponse.json({
      success: true,
      scope,
      attendanceDeleted,
      adjustmentsDeleted,
      message: scope === 'today'
        ? `Deleted ${attendanceDeleted} attendance record(s) for today`
        : `Deleted ${attendanceDeleted} attendance record(s) and ${adjustmentsDeleted} payroll adjustment(s)`
    });
  } catch (error: any) {
    console.error('Reset clock-in error:', error);
    return NextResponse.json({ message: error.message || 'Failed to reset clock-in data' }, { status: 500 });
  }
}
