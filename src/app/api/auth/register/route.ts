import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { BUSINESS_PERMISSION_PRESETS } from '@/types/permissions';

import { randomBytes } from 'crypto';
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, createBusiness, businessName, businessType, businessId } = await req.json();
    
    // Check if self-registration is allowed
    let registrationSettings = null;
    let targetBusinessId = businessId;
    
    if (businessId) {
      // Get business settings if joining existing business
      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { settings: true, isActive: true },
      });
      
      if (!business?.isActive) {
        return NextResponse.json(
          { error: 'Business not found or inactive' },
          { status: 404 }
        );
      }
      
      registrationSettings = business.settings || {};
    } else if (!createBusiness) {
      return NextResponse.json(
        { error: 'Must specify businessId or create new business' },
        { status: 400 }
      );
    }
    
    // Check if self-registration is disabled for existing business
    if (registrationSettings && registrationSettings.allowSelfRegistration === false) {
      return NextResponse.json(
        { error: 'Self-registration is disabled. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await hash(password, 12);

    // Create the user
    const user = await prisma.users.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: 'user',
        isActive: true,
      }
    });

    // If user wants to create a business, create it with them as owner
    if (createBusiness && businessName) {
      const shortName = await (await import('@/lib/business-shortname')).generateUniqueShortName(prisma as any, businessName)
      const business = await prisma.businesses.create({
        data: ({
          name: businessName,
          type: businessType || 'general',
          description: `${businessName} business`,
          createdBy: user.id,
          isActive: true,
          shortName,
        } as any)
      });

      // Create business membership with owner permissions
      await prisma.businessMemberships.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: 'business-owner',
          permissions: BUSINESS_PERMISSION_PRESETS['business-owner'],
          isActive: true,
          joinedAt: new Date(),
          lastAccessedAt: new Date(),
        }
      });

      return NextResponse.json({
        success: true,
        message: 'User created successfully with business',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        businesses: {
          id: business.id,
          name: business.name,
        }
      });
    }

    // User created without business
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}