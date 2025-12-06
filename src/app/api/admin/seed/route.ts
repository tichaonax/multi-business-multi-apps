import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting comprehensive test data seeding...');

    // Run the seed script
    const { stdout, stderr } = await execAsync('node scripts/seed-comprehensive-test-data.js', {
      cwd: process.cwd(),
      timeout: 120000 // 2 minutes timeout
    });

    // Parse the output to get statistics
    const output = stdout + stderr;
    const recordCount = (output.match(/Total: (\d+) records/)?.[1]) || '0';
    const tableCount = (output.match(/(\d+)\/(\d+)/)?.[1]) || '0';

    console.log('✅ Seed completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Test data seeded successfully',
      stats: {
        tables: tableCount,
        records: recordCount
      },
      output
    });
  } catch (error: any) {
    console.error('❌ Seed failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      output: error.stdout || error.stderr
    }, { status: 500 });
  }
}
