import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper function to check admin access
function isAdmin(session: any): boolean {
  return session?.user?.role === 'admin';
}

/**
 * POST /api/admin/seed-complete-demo
 *
 * Comprehensive demo data seeding endpoint
 *
 * Body:
 * {
 *   businessTypes?: string[],  // ['restaurant', 'grocery', 'hardware', 'clothing']
 *   features?: string[],        // ['wifi', 'printers', 'payroll', 'hr', 'construction']
 *   daysOfHistory?: number      // default: 30
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessTypes = ['restaurant', 'grocery', 'hardware', 'clothing'],
      features = ['all'],
      daysOfHistory = 30
    } = body;

    const results: any[] = [];
    const errors: any[] = [];
    let totalDuration = 0;

    // Define seeding steps
    const steps = [
      // STEP 1: Create demo businesses first
      { name: 'Restaurant Business', script: 'seed-restaurant-demo.js', required: true },
      { name: 'Grocery Business', script: 'seed-grocery-demo.js', required: true },
      { name: 'Hardware Business', script: 'seed-hardware-demo.js', required: true },
      { name: 'Clothing Business', script: 'seed-clothing-demo.js', required: true },

      // STEP 2: Now seed data for those businesses
      { name: 'Demo Employees', script: 'seed-demo-employees.js', required: true },
      { name: 'Sales Orders', script: 'seed-sales-orders-all-businesses.js', required: false },
    ];

    // Add optional feature scripts
    if (features.includes('all') || features.includes('wifi')) {
      steps.push(
        { name: 'WiFi - ESP32 Tokens', script: 'seed-esp32-tokens-demo.js', required: false },
        { name: 'WiFi - R710 Tokens', script: 'seed-r710-tokens-demo.js', required: false }
      );
    }

    if (features.includes('all') || features.includes('printers')) {
      steps.push(
        { name: 'Printers & Print Jobs', script: 'seed-printers-demo.js', required: false },
        { name: 'Thermal Printer Settings', script: 'seed-thermal-printer-settings-demo.js', required: false }
      );
    }

    if (features.includes('all') || features.includes('payroll')) {
      steps.push(
        { name: 'Payroll Accounts', script: 'seed-payroll-accounts-demo.js', required: false },
        { name: 'Payroll Periods', script: 'seed-payroll-demo.js', required: false }
      );
    }

    if (features.includes('all') || features.includes('hr')) {
      steps.push(
        { name: 'Employee Benefits', script: 'seed-employee-benefits-demo.js', required: false },
        { name: 'Employee Loans', script: 'seed-employee-loans-demo.js', required: false },
        { name: 'Leave Management', script: 'seed-leave-management-demo.js', required: false },
        { name: 'Salary Increases', script: 'seed-salary-increases-demo.js', required: false }
      );
    }

    if (features.includes('all') || features.includes('construction')) {
      steps.push(
        { name: 'Construction Projects', script: 'seed-construction-projects-demo.js', required: false }
      );
    }

    // Execute each step
    const startTime = Date.now();

    for (const step of steps) {
      try {
        const stepStartTime = Date.now();

        const { stdout, stderr } = await execAsync(`node scripts/${step.script}`, {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
        });

        const stepDuration = Date.now() - stepStartTime;

        results.push({
          step: step.name,
          script: step.script,
          status: 'success',
          duration: stepDuration,
          output: stdout.substring(0, 500) // Truncate output
        });

        totalDuration += stepDuration;
      } catch (error: any) {
        const stepDuration = Date.now() - startTime;

        if (step.required) {
          // Required step failed - return error
          return NextResponse.json({
            success: false,
            error: `Failed to seed ${step.name}`,
            details: error.message,
            results,
            errors: [...errors, {
              step: step.name,
              script: step.script,
              error: error.message,
              duration: stepDuration
            }]
          }, { status: 500 });
        } else {
          // Optional step failed - log warning and continue
          errors.push({
            step: step.name,
            script: step.script,
            error: error.message,
            duration: stepDuration,
            severity: 'warning'
          });

          results.push({
            step: step.name,
            script: step.script,
            status: 'warning',
            message: 'Optional feature failed',
            duration: stepDuration
          });
        }
      }
    }

    totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Demo data seeding completed',
      summary: {
        totalSteps: steps.length,
        successful: results.filter(r => r.status === 'success').length,
        warnings: errors.filter(e => e.severity === 'warning').length,
        totalDuration: `${(totalDuration / 1000).toFixed(1)}s`,
        businessTypes,
        features
      },
      results,
      warnings: errors.filter(e => e.severity === 'warning'),
      completedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in seed-complete-demo:', error);
    return NextResponse.json(
      { error: 'Failed to execute demo seeding', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/seed-complete-demo
 *
 * Returns available seeding options and current status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    return NextResponse.json({
      availableBusinessTypes: ['restaurant', 'grocery', 'hardware', 'clothing'],
      availableFeatures: ['all', 'wifi', 'printers', 'payroll', 'hr', 'construction'],
      defaultDaysOfHistory: 30,
      endpoint: 'POST /api/admin/seed-complete-demo',
      example: {
        method: 'POST',
        body: {
          businessTypes: ['restaurant', 'grocery'],
          features: ['all'],
          daysOfHistory: 30
        }
      }
    });

  } catch (error: any) {
    console.error('Error in seed-complete-demo GET:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve seeding options', details: error.message },
      { status: 500 }
    );
  }
}
